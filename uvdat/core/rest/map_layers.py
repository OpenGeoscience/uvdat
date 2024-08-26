import json

from django.db import connection
from django.http import HttpResponse
from django_large_image.rest import LargeImageFileDetailMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import RasterMapLayer, VectorMapLayer
from uvdat.core.rest.serializers import (
    RasterMapLayerSerializer,
    VectorMapLayerDetailSerializer,
    VectorMapLayerSerializer,
)

VECTOR_TILE_SQL = """
WITH
tilenv as (
    SELECT ST_TRANSFORM(ST_TileEnvelope(%(z)s, %(x)s, %(y)s), %(srid)s) as te
),
tilenvbounds as (
    SELECT
        ST_XMin(te) as xmin,
        ST_YMin(te) as ymin,
        ST_XMax(te) as xmax,
        ST_YMax(te) as ymax,
        (ST_XMax(te) - ST_XMin(te)) / 4 as segsize
    FROM tilenv
),
env as (
    SELECT ST_Segmentize(
        ST_MakeEnvelope(
            xmin,
            ymin,
            xmax,
            ymax,
            %(srid)s
        ),
        segsize
    ) as seg
    FROM tilenvbounds
),
bounds as (
    SELECT
        seg as geom,
        seg::box2d as b2d
    FROM env
),
mvtgeom as (
    SELECT
        ST_AsMVTGeom(
            ST_Transform(t.geometry, %(srid)s),
            bounds.b2d
        ) AS geom,
    t.properties as properties
    FROM
        core_vectorfeature t,
        bounds
    WHERE
        t.map_layer_id = %(map_layer_id)s
        AND ST_Intersects(
            ST_Transform(t.geometry, %(srid)s),
            ST_Transform(bounds.geom, %(srid)s)
        )
        -- AND (
        --     ST_GeometryType(ST_AsText(t.geometry)) != 'ST_Point'
        --     OR %(z)s >= 16
        -- )
)
SELECT ST_AsMVT(mvtgeom.*) FROM mvtgeom
;
"""


class RasterMapLayerViewSet(ModelViewSet, LargeImageFileDetailMixin):
    queryset = RasterMapLayer.objects.select_related('dataset').all()
    serializer_class = RasterMapLayerSerializer
    FILE_FIELD_NAME = 'cloud_optimized_geotiff'

    @action(
        detail=True,
        methods=['get'],
        url_path=r'raster-data/(?P<resolution>[\d*\.?\d*]+)',
        url_name='raster_data',
    )
    def get_raster_data(self, request, resolution: str = '1', **kwargs):
        raster_map_layer = self.get_object()
        data = raster_map_layer.get_image_data(float(resolution))
        return HttpResponse(json.dumps(data), status=200)


class VectorMapLayerViewSet(ModelViewSet):
    queryset = VectorMapLayer.objects.select_related('dataset').all()
    serializer_class = VectorMapLayerSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = VectorMapLayerDetailSerializer(instance)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['get'],
        url_path=r'tiles/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)',
        url_name='tiles',
    )
    def get_vector_tile(self, request, x: str, y: str, z: str, pk: str):
        with connection.cursor() as cursor:
            cursor.execute(
                VECTOR_TILE_SQL,
                {
                    'z': z,
                    'x': x,
                    'y': y,
                    'srid': 3857,
                    'map_layer_id': pk,
                },
            )
            row = cursor.fetchone()

        tile = row[0]
        return HttpResponse(
            tile,
            content_type='application/octet-stream',
            status=200 if tile else 204,
        )

import json

from django.http import HttpResponse
from django_large_image.rest import LargeImageFileDetailMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import RasterMapLayer, VectorMapLayer
from uvdat.core.models.map_layers import VectorTile
from uvdat.core.rest.serializers import RasterMapLayerSerializer, VectorMapLayerSerializer


class RasterMapLayerViewSet(ModelViewSet, LargeImageFileDetailMixin):
    queryset = RasterMapLayer.objects.all()
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
    queryset = VectorMapLayer.objects.all()
    serializer_class = VectorMapLayerSerializer

    @action(
        detail=True,
        methods=['get'],
        url_path=r'tiles/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)',
        url_name='tiles',
    )
    def get_vector_tile(self, request, x: str, y: str, z: str, pk: str):
        # Return vector tile or empty tile
        try:
            tile = VectorTile.objects.get(map_layer_id=pk, x=x, y=y, z=z)
        except VectorTile.DoesNotExist:
            return Response(VectorTile.EMPTY_TILE_DATA, status=200)

        return Response(tile.geojson_data, status=200)

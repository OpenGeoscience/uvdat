import json

from django.http import HttpResponse
from django_large_image.rest import LargeImageFileDetailMixin
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import RasterDataSource, VectorDataSource
from uvdat.core.rest.serializers import (
    RasterDataSourceSerializer,
    VectorDataSourceSerializer,
)


class RasterDataSourceViewSet(ModelViewSet, LargeImageFileDetailMixin):
    queryset = RasterDataSource.objects.all()
    serializer_class = RasterDataSourceSerializer
    FILE_FIELD_NAME = 'cloud_optimized_geotiff'

    @action(
        detail=True,
        methods=['get'],
        url_path=r'raster-data/(?P<resolution>[\d*\.?\d*]+)',
        url_name='raster_data',
    )
    def get_raster_data(self, request, resolution: str = '1', **kwargs):
        raster_data_source = self.get_object()
        data = raster_data_source.get_image_data(float(resolution))
        return HttpResponse(json.dumps(data), status=200)


class VectorDataSourceViewSet(ModelViewSet):
    queryset = VectorDataSource.objects.all()
    serializer_class = VectorDataSourceSerializer

    @action(
        detail=True,
        methods=['get'],
        url_path=r'tiles/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)',
        url_name='tiles',
    )
    def get_vector_tile(self, request, x: int, y: int, z: int, **kwargs):
        vector_data_source = self.get_object()
        tile = vector_data_source.get_
        return HttpResponse(json.dumps(tile.geojson_data), status=200)

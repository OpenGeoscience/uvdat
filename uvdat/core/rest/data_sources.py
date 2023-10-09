import json

from django.http import HttpResponse
from django_large_image.rest import LargeImageFileDetailMixin
from rest_framework.decorators import action
from rest_framework.viewsets import GenericViewSet, ModelViewSet, mixins

from uvdat.core.models import ChartDataSource, RasterDataSource, VectorDataSource
from uvdat.core.rest.serializers import (
    ChartDataSourceSerializer,
    RasterDataSourceSerializer,
    VectorDataSourceSerializer,
)


class ChartViewSet(GenericViewSet, mixins.ListModelMixin):
    queryset = ChartDataSource.objects.all()
    serializer_class = ChartDataSourceSerializer

    def get_queryset(self, **kwargs):
        city_id = kwargs.get('city')
        if city_id:
            return ChartDataSource.objects.filter(city__id=city_id)
        return ChartDataSource.objects.all()

    def validate_editable(self, chart, func, *args, **kwargs):
        if chart.editable:
            return func(*args, **kwargs)
        else:
            return HttpResponse('Not an editable chart.', status=400)

    @action(detail=True, methods=['post'])
    def new_line(self, request, **kwargs):
        chart = self.get_object()
        self.validate_editable(chart, chart.new_line)
        return HttpResponse(status=200)

    @action(detail=True, methods=['post'])
    def rename_lines(self, request, **kwargs):
        chart = self.get_object()
        self.validate_editable(chart, chart.rename_lines, new_names=request.data)
        return HttpResponse(status=200)

    @action(detail=True, methods=['post'])
    def clear(self, request, **kwargs):
        chart = self.get_object()
        self.validate_editable(chart, chart.clear)
        return HttpResponse(status=200)


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

import json

from django.http import HttpResponse
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from django_large_image.rest import LargeImageFileDetailMixin

from geojson2vt import geojson2vt, vt2geojson

from uvdat.core.models import City, Dataset
from uvdat.core.serializers import CitySerializer, DatasetSerializer


class CityViewSet(ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer


class DatasetViewSet(ModelViewSet, LargeImageFileDetailMixin):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    FILE_FIELD_NAME = 'raster_file'

    @action(
        detail=True,
        methods=['get'],
        url_path=r'vector-tiles/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)',
        url_name='vector_tiles',
    )
    def get_vector_tile(self, request, x: int, y: int, z: int, **kwargs):
        dataset = self.get_object()
        if not dataset.geodata_file:
            return HttpResponse(status=400)
        with dataset.geodata_file.open() as geodata:
            tile_index = geojson2vt.geojson2vt(json.loads(geodata.read().decode()), {})
            vector_tile = tile_index.get_tile(z, x, y)
            if not vector_tile:
                return HttpResponse(status=404)
            tile_geojson = vt2geojson.vt2geojson(vector_tile)
            return HttpResponse(json.dumps(tile_geojson))

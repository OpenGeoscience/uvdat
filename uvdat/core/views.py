import json
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.decorators import action

from geojson2vt.geojson2vt import geojson2vt
from uvdat.core.models import City, Dataset
from uvdat.core.serializers import CitySerializer, DatasetSerializer

simple_cache = {}


class CityViewSet(ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer


class DatasetViewSet(ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer

    @action(
        detail=True,
        methods=['get'],
        url_path='tiles/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)',
        url_name='tile',
    )
    def tile(self, request, *args, **kwargs):
        dataset = self.get_object()
        tile_index = simple_cache.get(dataset.id)
        if not tile_index:
            with dataset.geodata_file.open() as geodata_file:
                geodata = json.load(geodata_file)
                tile_index = geojson2vt(geodata, {})
                simple_cache.update({dataset.id: tile_index})
        return Response(tile_index.get_tile(kwargs.get('z'), kwargs.get('x'), kwargs.get('y')))

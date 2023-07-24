import json
import tempfile

from django.http import HttpResponse
from django_large_image.rest import LargeImageFileDetailMixin
import ijson
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import City, Dataset
from uvdat.core.serializers import CitySerializer, DatasetSerializer, NetworkNodeSerializer
from uvdat.core.tasks.conversion import convert_raw_archive

TILES_DIR = tempfile.TemporaryDirectory()


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
        with dataset.vector_tiles_file.open() as vector_tile_json:
            # use ijson to fetch only needed key (much faster than json parse)
            tile = ijson.items(vector_tile_json, f'{z}.{x}.{y}', use_float=True)
            try:
                return HttpResponse(json.dumps(tile.__next__()), status=200)
            except StopIteration:
                return HttpResponse(status=404)

    @action(
        detail=True,
        methods=['get'],
        url_path=r'network',
        url_name='network',
    )
    def get_network_nodes(self, request, **kwargs):
        dataset = self.get_object()
        return Response(
            [NetworkNodeSerializer(n).data for n in dataset.network_nodes.all()], status=200
        )

    @action(
        detail=True,
        methods=['get'],
        url_path=r'convert',
        url_name='convert',
    )
    def spawn_conversion_task(self, request, **kwargs):
        dataset = self.get_object()
        dataset.geodata_file = None
        dataset.vector_tiles_file = None
        dataset.raster_file = None
        dataset.processing = True
        dataset.save()
        convert_raw_archive.delay(dataset.id)
        return Response(DatasetSerializer(dataset).data, status=200)

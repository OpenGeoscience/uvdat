import json
import ijson
import tempfile
import large_image
from pathlib import Path

from django.http import HttpResponse
from django_large_image.rest import LargeImageFileDetailMixin

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import City, Dataset
from uvdat.core.serializers import (
    CitySerializer,
    DatasetSerializer,
    NetworkNodeSerializer,
    ChartSerializer,
)
from uvdat.core.tasks.conversion import convert_raw_data
from uvdat.core.tasks.networks import network_gcc
from uvdat.core.tasks.charts import add_gcc_chart_datum


class CityViewSet(ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer

    @action(
        detail=True,
        methods=['get'],
        url_path=r'charts',
        url_name='charts',
    )
    def get_charts(self, request, **kwargs):
        city = self.get_object()
        return Response([ChartSerializer(c).data for c in city.charts.all()], status=200)


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
        url_path=r'raster-data/(?P<resolution>[\d*\.?\d*]+)',
        url_name='raster_data',
    )
    def get_raster_data(self, request, resolution: str = '1', **kwargs):
        dataset = self.get_object()
        if dataset.raster_file:
            with tempfile.TemporaryDirectory() as tmp:
                raster_path = Path(tmp, 'raster')
                with open(raster_path, 'wb') as raster_file:
                    raster_file.write(dataset.raster_file.read())
                source = large_image.open(raster_path)
                data, data_format = source.getRegion(format='numpy')
                data = data[:, :, 0]
                if resolution:
                    resolution = float(resolution)
                    if resolution != 1.0:
                        step = int(1 / resolution)
                        data = data[::step][::step]
                return HttpResponse(json.dumps(data.tolist()), status=200)
        else:
            return HttpResponse('Dataset has no raster file.', status=400)

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
        convert_raw_data.delay(dataset.id)
        return Response(status=200)

    @action(
        detail=True,
        methods=['get'],
        url_path=r'gcc',
        url_name='gcc',
    )
    def get_gcc(self, request, **kwargs):
        dataset = self.get_object()
        if not dataset.network:
            return Response('This dataset is not a network dataset.', status=400)
        if "exclude_nodes" not in dict(request.query_params):
            return Response('Please specify a list of nodes to exclude in `exclude_nodes`.')
        exclude_nodes = request.query_params.get('exclude_nodes')
        exclude_nodes = exclude_nodes.split(',')
        exclude_nodes = [int(n) for n in exclude_nodes if len(n)]
        edge_list = {}
        visited_nodes = []
        excluded_node_names = []

        for node in dataset.network_nodes.all():
            adjacencies = [
                adj_node.id
                for adj_node in node.adjacent_nodes.all()
                if adj_node.id not in visited_nodes
            ]
            if len(adjacencies) > 0:
                edge_list[node.id] = sorted(adjacencies)
            visited_nodes.append(node.id)
            if node.id in exclude_nodes:
                excluded_node_names.append(node.name)

        gcc = network_gcc(edge_list, exclude_nodes)
        add_gcc_chart_datum(dataset, excluded_node_names, len(gcc))
        return Response(gcc, status=200)

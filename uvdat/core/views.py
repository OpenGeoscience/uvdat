import json
from pathlib import Path
import tempfile

from django.core.serializers import serialize
from django.http import HttpResponse
from django_large_image.rest import LargeImageFileDetailMixin
import ijson
import large_image
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ModelViewSet, mixins

from uvdat.core.models import Chart, City, Dataset, Region, SimulationResult
from uvdat.core.serializers import (
    ChartSerializer,
    CitySerializer,
    DatasetSerializer,
    NetworkNodeSerializer,
    SimulationResultSerializer,
)
from uvdat.core.tasks.charts import add_gcc_chart_datum
from uvdat.core.tasks.conversion import convert_raw_data
from uvdat.core.tasks.networks import construct_edge_list, network_gcc
from uvdat.core.tasks.simulations import get_available_simulations, run_simulation


class CityViewSet(ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer


class DatasetViewSet(ModelViewSet, LargeImageFileDetailMixin):
    serializer_class = DatasetSerializer
    FILE_FIELD_NAME = 'raster_file'

    def get_queryset(self):
        city_id = self.request.query_params.get('city')
        if city_id:
            return Dataset.objects.filter(city__id=city_id)
        else:
            return Dataset.objects.all()

    @action(detail=True, methods=['get'])
    def regions(self, request, **kwargs):
        dataset = self.get_object()
        if dataset.category != 'region':
            return HttpResponse('Not a region dataset', status=400)

        # Serialize all regions as a feature collection
        multipolygons = Region.objects.filter(dataset=dataset)
        return HttpResponse(serialize('geojson', multipolygons, geometry_field='boundary'))

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

        excluded_node_names = []
        for node in dataset.network_nodes.all():
            if node.id in exclude_nodes:
                excluded_node_names.append(node.name)

        edge_list = construct_edge_list(dataset, exclude_nodes)
        gcc = network_gcc(edge_list)
        add_gcc_chart_datum(dataset, excluded_node_names, len(gcc))
        return Response(gcc, status=200)


class ChartViewSet(GenericViewSet, mixins.ListModelMixin):
    queryset = Chart.objects.all()
    serializer_class = ChartSerializer

    def get_queryset(self, **kwargs):
        city_id = kwargs.get('city')
        if city_id:
            return Chart.objects.filter(city__id=city_id)
        return Chart.objects.all()

    @action(detail=True, methods=['post'])
    def clear(self, request, **kwargs):
        chart = self.get_object()
        if not chart.clearable:
            return HttpResponse('Not a clearable chart.', status=400)

        chart.metadata = []
        chart.chart_data = {}
        chart.save()
        return HttpResponse(status=200)


class SimulationViewSet(GenericViewSet):
    # Not based on a database model;
    # Available Simulations must be hard-coded
    # and associated with a function

    @action(
        detail=False,
        methods=['get'],
        url_path=r'available/city/(?P<city_id>[\d*]+)',
    )
    def list_available(self, request, city_id: int, **kwargs):
        sims = get_available_simulations(city_id)
        return HttpResponse(
            json.dumps(sims),
            status=200,
        )

    @action(
        detail=False,
        methods=['get'],
        url_path=r'(?P<simulation_id>[\d*]+)/city/(?P<city_id>[\d*]+)/results',
    )
    def list_results(self, request, simulation_id: int, city_id: int, **kwargs):
        return HttpResponse(
            json.dumps(
                list(
                    SimulationResultSerializer(s).data
                    for s in SimulationResult.objects.filter(
                        simulation_id=int(simulation_id), city__id=city_id
                    ).all()
                )
            ),
            status=200,
        )

    @action(
        detail=False,
        methods=['post'],
        url_path=r'run/(?P<simulation_id>[\d*]+)/city/(?P<city_id>[\d*]+)',
    )
    def run(self, request, simulation_id: int, city_id: int, **kwargs):
        result = run_simulation(int(simulation_id), int(city_id), **request.data)
        return HttpResponse(
            json.dumps({'result': result}),
            status=200,
        )

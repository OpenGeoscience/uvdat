import json

from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Dataset, NetworkEdge, NetworkNode
from uvdat.core.rest.serializers import (
    DatasetSerializer,
    RasterMapLayerSerializer,
    VectorMapLayerSerializer,
    NetworkEdgeSerializer,
    NetworkNodeSerializer,
)
from uvdat.core.rest.filter import AccessControl
from uvdat.core.tasks.chart import add_gcc_chart_datum


class DatasetViewSet(ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    filter_backends = [AccessControl]

    @action(detail=True, methods=['get'])
    def map_layers(self, request, **kwargs):
        dataset: Dataset = self.get_object()
        map_layers = list(dataset.get_map_layers().select_related('dataset'))

        # Set serializer based on dataset type
        if dataset.dataset_type == Dataset.DatasetType.RASTER:
            serializer = RasterMapLayerSerializer(map_layers, many=True)
        elif dataset.dataset_type == Dataset.DatasetType.VECTOR:
            # Set serializer
            serializer = VectorMapLayerSerializer(map_layers, many=True)
        else:
            raise NotImplementedError(f'Dataset Type {dataset.dataset_type}')

        # Return response with rendered data
        return Response(serializer.data, status=200)

    @action(detail=True, methods=['get'])
    def convert(self, request, **kwargs):
        dataset = self.get_object()
        dataset.spawn_conversion_task()
        return HttpResponse(status=200)

    @action(detail=True, methods=['get'])
    def network(self, request, **kwargs):
        dataset = self.get_object()
        networks = []
        for network in dataset.networks.all():
            networks.append(
                {
                    'nodes': [
                        NetworkNodeSerializer(n).data
                        for n in NetworkNode.objects.filter(network=network)
                    ],
                    'edges': [
                        NetworkEdgeSerializer(e).data
                        for e in NetworkEdge.objects.filter(network=network)
                    ],
                }
            )
        return HttpResponse(json.dumps(networks), status=200)

    @action(detail=True, methods=['get'])
    def gcc(self, request, **kwargs):
        dataset = self.get_object()
        project_id = request.query_params.get('project')
        exclude_nodes = request.query_params.get('exclude_nodes', [])
        exclude_nodes = exclude_nodes.split(',')
        exclude_nodes = [int(n) for n in exclude_nodes if len(n)]

        # TODO: improve this for datasets with multiple networks;
        # this currently returns the gcc for the network with the most excluded nodes
        results = []
        for network in dataset.networks.all():
            excluded_node_names = [n.name for n in network.nodes.all() if n.id in exclude_nodes]
            gcc = network.get_gcc(exclude_nodes)
            results.append(dict(excluded=excluded_node_names, gcc=gcc))
        if len(results):
            results.sort(key=lambda r: len(r.get('excluded')), reverse=True)
            gcc = results[0].get('gcc')
            excluded = results[0].get('excluded')
            add_gcc_chart_datum(dataset, project_id, excluded, len(gcc))
            return HttpResponse(json.dumps(gcc), status=200)

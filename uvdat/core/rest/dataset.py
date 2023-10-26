import json

from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Dataset
from uvdat.core.rest import serializers as uvdat_serializers


class DatasetViewSet(ModelViewSet):
    serializer_class = uvdat_serializers.DatasetSerializer

    def get_queryset(self):
        context_id = self.request.query_params.get('context')
        if context_id:
            return Dataset.objects.filter(context__id=context_id)
        else:
            return Dataset.objects.all()

    @action(detail=True, methods=['get'])
    def convert(self, request, **kwargs):
        dataset = self.get_object()
        dataset.spawn_conversion_task()
        return HttpResponse(status=200)

    @action(detail=True, methods=['get'])
    def network(self, request, **kwargs):
        dataset = self.get_object()
        network = dataset.get_network()
        return HttpResponse(
            json.dumps(
                {
                    'nodes': [
                        uvdat_serializers.NetworkNodeSerializer(n).data
                        for n in network.get('nodes')
                    ],
                    'edges': [
                        uvdat_serializers.NetworkEdgeSerializer(e).data
                        for e in network.get('edges')
                    ],
                }
            ),
            status=200,
        )

    @action(detail=True, methods=['get'])
    def gcc(self, request, **kwargs):
        dataset = self.get_object()
        exclude_nodes = request.query_params.get('exclude_nodes', [])
        exclude_nodes = exclude_nodes.split(',')
        exclude_nodes = [int(n) for n in exclude_nodes if len(n)]

        gcc = dataset.get_network_gcc(exclude_nodes)
        return HttpResponse(json.dumps(gcc), status=200)

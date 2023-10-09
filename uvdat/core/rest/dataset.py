from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import DataCollection, Dataset
from uvdat.core.rest import serializers as uvdat_serializers


class DatasetViewSet(ModelViewSet):
    serializer_class = uvdat_serializers.DatasetSerializer

    def get_queryset(self):
        city_id = self.request.query_params.get('city')
        if city_id:
            return Dataset.objects.filter(city__id=city_id)
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
        return HttpResponse(network, status=200)

    @action(detail=True, methods=['get'])
    def gcc(self, request, **kwargs):
        dataset = self.get_object()
        exclude_nodes = request.query_params.get('exclude_nodes')
        gcc = dataset.get_gcc(exclude_nodes)
        return HttpResponse(gcc, status=200)


class DataCollectionViewSet(ModelViewSet):
    queryset = DataCollection.objects.all()
    serializer_class = uvdat_serializers.DataCollectionSerializer

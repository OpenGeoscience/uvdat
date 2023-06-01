from django.http import HttpResponse
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action

from uvdat.core.models import City, Dataset
from uvdat.core.serializers import CitySerializer, DatasetSerializer


class CityViewSet(ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer


class DatasetViewSet(ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer

    @action(
        detail=True,
        methods=['get'],
        url_path='json',
        url_name='json',
    )
    def get_geojson(self, request, *args, **kwargs):
        dataset = self.get_object()
        if not dataset.geodata_file:
            return HttpResponse({})
        with dataset.geodata_file.open() as geodata:
            return HttpResponse(geodata)

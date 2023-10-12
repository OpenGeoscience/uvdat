from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import City
from uvdat.core.rest.serializers import CitySerializer


class CityViewSet(ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer

    @action(detail=True, methods=['get'])
    def regions(self, request, **kwargs):
        city = self.get_object()
        regions = city.get_regions()
        return HttpResponse(regions, status=200)

    @action(detail=True, methods=['get'])
    def simulation_results(self, request, **kwargs):
        city = self.get_object()
        simulation_results = city.get_simulation_results()
        return HttpResponse(simulation_results, status=200)

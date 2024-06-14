from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Context
from uvdat.core.rest.serializers import ContextSerializer
from uvdat.core.tasks.context import load_roads


class ContextViewSet(ModelViewSet):
    queryset = Context.objects.all()
    serializer_class = ContextSerializer

    @action(detail=True, methods=['get'])
    def regions(self, request, **kwargs):
        context = self.get_object()
        regions = context.derived_regions.all()
        return HttpResponse(regions, status=200)

    @action(detail=True, methods=['get'])
    def simulation_results(self, request, **kwargs):
        context = self.get_object()
        simulation_results = context.simulation_results.all()
        return HttpResponse(simulation_results, status=200)

    @action(
        detail=True,
        methods=['get'],
        url_path=r'load_roads/(?P<location>.+)',
    )
    def load_roads(self, request, location, **kwargs):
        context = self.get_object()
        load_roads.delay(context.id, location)
        return HttpResponse('Task spawned successfully.', status=200)

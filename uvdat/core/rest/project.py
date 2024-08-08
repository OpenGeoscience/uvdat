from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Project
from uvdat.core.rest.serializers import ProjectSerializer
from uvdat.core.tasks.osmnx import load_roads


class ProjectViewSet(ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    @action(detail=True, methods=['get'])
    def regions(self, request, **kwargs):
        project = self.get_object()
        regions = project.derived_regions.all()
        return HttpResponse(regions, status=200)

    @action(detail=True, methods=['get'])
    def simulation_results(self, request, **kwargs):
        project = self.get_object()
        simulation_results = project.simulation_results.all()
        return HttpResponse(simulation_results, status=200)

    @action(
        detail=True,
        methods=['get'],
        url_path=r'load_roads/(?P<location>.+)',
    )
    def load_roads(self, request, location, **kwargs):
        project = self.get_object()
        load_roads.delay(project.id, location)
        return HttpResponse('Task spawned successfully.', status=200)

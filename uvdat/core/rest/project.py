from django.contrib.auth.models import User
from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Dataset, Project
from uvdat.core.rest.access_control import GuardianFilter, GuardianPermission
from uvdat.core.rest.serializers import DatasetSerializer, ProjectSerializer
from uvdat.core.tasks.osmnx import load_roads


class ProjectViewSet(ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

    def perform_create(self, serializer):
        project: Project = serializer.save()
        user: User = self.request.user
        project.set_permissions(owner=user)

    def partial_update(self, request, id):
        project = self.get_object()
        dataset_ids = request.data.pop('dataset_ids', None)
        if dataset_ids is not None:
            project.datasets.set(Dataset.objects.filter(id__in=dataset_ids))
        owner_id = request.data.pop('owner', None)
        collaborator_ids = request.data.pop('collaborators', [])
        follower_ids = request.data.pop('followers', [])
        if owner_id is not None:
            project.set_permissions(
                owner=User.objects.get(id=owner_id),
                collaborator=User.objects.filter(id__in=collaborator_ids),
                follower=User.objects.filter(id__in=follower_ids),
            )
        serializer = ProjectSerializer(project, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
        project.save()
        response = ProjectSerializer(project).data
        response.update(
            datasets=[DatasetSerializer(dataset).data for dataset in project.datasets.all()]
        )
        return Response(response, status=200)

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

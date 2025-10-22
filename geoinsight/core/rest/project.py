import typing
from typing import Any

from django.contrib.auth.models import User
from django.http import HttpResponse
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from geoinsight.core.models import Project
from geoinsight.core.rest.access_control import GuardianFilter, GuardianPermission
from geoinsight.core.rest.serializers import ProjectPermissionsSerializer, ProjectSerializer
from geoinsight.core.tasks.osmnx import load_roads


class ProjectViewSet(ModelViewSet):
    queryset = Project.objects.all().order_by('name')
    serializer_class = ProjectSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

    def perform_create(self, serializer):
        project: Project = serializer.save()
        user: User = self.request.user
        project.set_permissions(owner=user)

    @swagger_auto_schema(method='PUT', request_body=ProjectPermissionsSerializer)
    @action(detail=True, methods=['PUT'])
    def permissions(self, request: Request, *args: Any, **kwargs: Any):
        if request.user.is_anonymous:
            raise Exception('Anonymous user received after guardian filter')
        user = typing.cast(User, request.user)

        # Only the owner can modify project permissions
        project: Project = self.get_object()
        if not user.has_perm('owner', project):  # type: ignore
            return Response(status=403)

        serializer = ProjectPermissionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        project: Project = self.get_object()
        project.set_permissions(
            owner=User.objects.get(id=data['owner_id']),
            collaborator=list(User.objects.filter(id__in=data['collaborator_ids'])),
            follower=list(User.objects.filter(id__in=data['follower_ids'])),
        )

        return Response(ProjectSerializer(project).data, status=200)

    # TODO: This should be a POST
    @action(
        detail=True,
        methods=['get'],
        url_path=r'load_roads/(?P<location>.+)',
    )
    def load_roads(self, request, location, **kwargs):
        project = self.get_object()
        load_roads.delay(project.id, location)
        return HttpResponse('Task spawned successfully.', status=200)

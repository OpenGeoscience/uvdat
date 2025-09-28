from django.db.models import QuerySet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from uvdat.core.models import Project, TaskResult
from uvdat.core.rest.access_control import (
    GuardianFilter,
    GuardianPermission,
    filter_queryset_by_projects,
)
import uvdat.core.rest.serializers as uvdat_serializers
from uvdat.core.tasks.analytics import __all__ as analysis_types


class AnalyticsViewSet(ReadOnlyModelViewSet):
    queryset = TaskResult.objects.all()
    serializer_class = uvdat_serializers.TaskResultSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

    @action(
        detail=False,
        methods=['get'],
        url_path=r'project/(?P<project_id>[\d*]+)/types',
    )
    def list_types(self, request, project_id: int, **kwargs):
        serialized = []
        for analysis_type in analysis_types:
            instance = analysis_type()
            filtered_input_options = {}
            for k, v in instance.get_input_options().items():
                if isinstance(v, QuerySet):
                    filtered_queryset = filter_queryset_by_projects(
                        v, Project.objects.filter(id=project_id)
                    )
                    v = [dict(id=o.id, name=o.name) for o in filtered_queryset]
                elif not all(isinstance(o, dict) for o in v):
                    v = [dict(id=o, name=o) for o in v]
                filtered_input_options[k] = v
            serializer = uvdat_serializers.AnalysisTypeSerializer(
                data=dict(
                    name=instance.name,
                    db_value=instance.db_value,
                    description=instance.description,
                    attribution=instance.attribution,
                    input_options=filtered_input_options,
                    input_types=instance.input_types,
                    output_types=instance.output_types,
                )
            )
            serializer.is_valid(raise_exception=True)
            serialized.append(serializer.data)
        return Response(serialized, status=200)

    @action(
        detail=False,
        methods=['get'],
        url_path=r'project/(?P<project_id>[\d*]+)/types/(?P<task_type>.+)/results',
    )
    def list_results(self, request, project_id: int, task_type: str, **kwargs):
        results = TaskResult.objects.filter(
            project__id=project_id,
            task_type=task_type,
        )
        return Response(
            [uvdat_serializers.TaskResultSerializer(result).data for result in results],
            status=200,
        )

    @action(
        detail=False,
        methods=['post'],
        url_path=r'project/(?P<project_id>[\d*]+)/types/(?P<task_type>.+)/run',
    )
    def run(self, request, project_id: int, task_type: str, **kwargs):
        project = Project.objects.get(id=project_id)
        analysis_type_class = next(
            iter(at for at in analysis_types if at().db_value == task_type), None
        )
        if analysis_type_class is None:
            return Response(f'Analysis type "{task_type}" not found', status=404)
        result = analysis_type_class().run_task(project, **request.data)
        return Response(
            uvdat_serializers.TaskResultSerializer(result).data,
            status=200,
        )

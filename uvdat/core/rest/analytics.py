import inspect

from django.db.models import QuerySet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from rest_framework.viewsets import ReadOnlyModelViewSet

from uvdat.core.models import AnalysisResult, Project
from uvdat.core.rest.access_control import (
    GuardianFilter,
    GuardianPermission,
    filter_queryset_by_projects,
)
import uvdat.core.rest.serializers as uvdat_serializers
from uvdat.core.tasks.analytics import __all__ as analysis_types


class AnalyticsViewSet(ReadOnlyModelViewSet):
    queryset = AnalysisResult.objects.all()
    serializer_class = uvdat_serializers.AnalysisResultSerializer
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
                    queryset_serializer = next(
                        iter(
                            s
                            for name, s in inspect.getmembers(uvdat_serializers, inspect.isclass)
                            if issubclass(s, ModelSerializer) and s.Meta.model is v.model
                        ),
                        None,
                    )
                    if queryset_serializer is None:
                        v = None
                    else:
                        v = [queryset_serializer(o) for o in filtered_queryset]
                filtered_input_options[k] = v
            serializer = uvdat_serializers.AnalysisTypeSerializer(
                data=dict(
                    name=instance.name,
                    description=instance.description,
                    attribution=instance.attribution,
                    input_options=filtered_input_options,
                    output_types=instance.output_types,
                )
            )
            serializer.is_valid(raise_exception=True)
            serialized.append(serializer.data)
        return Response(serialized, status=200)

    @action(
        detail=False,
        methods=['post'],
        url_path=r'project/(?P<project_id>[\d*]+)/types/(?P<analysis_type>.+)/run',
    )
    def run(self, request, project_id: int, analysis_type: str, **kwargs):
        project = Project.objects.get(id=project_id)
        analysis_type_class = next(
            iter(at for at in analysis_types if at().db_value == analysis_type), None
        )
        if analysis_type_class is None:
            return Response(f'Analysis type "{analysis_type}" not found', status=404)
        result = analysis_type_class().run_task(project, **request.data)
        return Response(
            uvdat_serializers.AnalysisResultSerializer(result).data,
            status=200,
        )

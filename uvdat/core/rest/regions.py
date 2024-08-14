import json

from django.http import HttpResponse
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import DerivedRegion, SourceRegion
from uvdat.core.tasks.regions import DerivedRegionCreationError, create_derived_region
from uvdat.core.rest.filter import AccessControl

from .serializers import (
    DerivedRegionCreationSerializer,
    DerivedRegionDetailSerializer,
    DerivedRegionListSerializer,
    SourceRegionSerializer,
)


class SourceRegionViewSet(ModelViewSet):
    queryset = SourceRegion.objects.all()
    serializer_class = SourceRegionSerializer
    filter_backends = [AccessControl]
    lookup_field = "id"


class DerivedRegionViewSet(ModelViewSet):
    queryset = DerivedRegion.objects.all()
    serializer_class = DerivedRegionListSerializer
    filter_backends = [AccessControl]
    lookup_field = "id"

    def get_serializer_class(self):
        if self.detail:
            return DerivedRegionDetailSerializer

        return super().get_serializer_class()

    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        if project_id:
            return DerivedRegion.objects.filter(project__id=project_id)
        else:
            return DerivedRegion.objects.all()

    @action(detail=True, methods=['GET'])
    def as_feature(self, request, *args, **kwargs):
        obj: DerivedRegion = self.get_object()
        feature = {
            'type': 'Feature',
            'geometry': json.loads(obj.boundary.geojson),
            'properties': DerivedRegionListSerializer(instance=obj).data,
        }

        return HttpResponse(json.dumps(feature))

    @swagger_auto_schema(request_body=DerivedRegionCreationSerializer)
    def create(self, request, *args, **kwargs):
        serializer = DerivedRegionCreationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            data = serializer.validated_data
            derived_region = create_derived_region(
                name=data['name'],
                project=data['project'],
                region_ids=data['regions'],
                operation=data['operation'],
            )
        except DerivedRegionCreationError as e:
            return HttpResponse(str(e), status=400)

        return HttpResponse(DerivedRegionDetailSerializer(instance=derived_region).data, status=201)

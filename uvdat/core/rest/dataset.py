from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from uvdat.core.models import Dataset
from uvdat.core.rest.access_control import GuardianFilter, GuardianPermission
from uvdat.core.rest.serializers import (
    DatasetSerializer,
    FileItemSerializer,
    LayerSerializer,
    NetworkSerializer,
    RasterDataSerializer,
    VectorDataSerializer,
)


class DatasetViewSet(ReadOnlyModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

    def get_queryset(self):
        qs = super().get_queryset()
        project_id: str = self.request.query_params.get('project')
        if project_id is None or not project_id.isdigit():
            return qs

        return qs.filter(project=int(project_id))

    @action(detail=True, methods=['get'])
    def layers(self, request, **kwargs):
        dataset: Dataset = self.get_object()
        layers = list(dataset.layers.all())
        serializer = LayerSerializer(layers, many=True)
        return Response(serializer.data, status=200)

    @action(detail=True, methods=['get'])
    def data(self, request, **kwargs):
        dataset: Dataset = self.get_object()

        data = []
        for raster in dataset.rasters.all():
            data.append(RasterDataSerializer(raster).data)
        for vector in dataset.vectors.all():
            data.append(VectorDataSerializer(vector).data)
        return Response(data, status=200)

    @action(detail=True, methods=['get'])
    def networks(self, request, **kwargs):
        dataset = self.get_object()
        return Response(
            [NetworkSerializer(network).data for network in dataset.get_networks().all()],
            status=200,
        )

    @action(detail=True, methods=['get'])
    def files(self, request, **kwargs):
        dataset = self.get_object()
        return Response(
            [FileItemSerializer(file).data for file in dataset.source_files.all()],
            status=200,
        )

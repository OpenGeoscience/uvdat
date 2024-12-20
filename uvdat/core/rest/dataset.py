from drf_yasg.utils import swagger_auto_schema
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from uvdat.core.models import Dataset, Network, NetworkEdge, NetworkNode
from uvdat.core.rest.access_control import GuardianFilter, GuardianPermission
from uvdat.core.rest.serializers import (
    DatasetSerializer,
    NetworkEdgeSerializer,
    NetworkNodeSerializer,
    RasterMapLayerSerializer,
    VectorMapLayerSerializer,
)
from uvdat.core.tasks.chart import add_gcc_chart_datum


class GCCQueryParamSerializer(serializers.Serializer):
    project = serializers.IntegerField()
    exclude_nodes = serializers.RegexField(r'^\d+(,\s?\d+)*$')


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
    def map_layers(self, request, **kwargs):
        dataset: Dataset = self.get_object()
        map_layers = list(dataset.get_map_layers().select_related('dataset'))

        # Set serializer based on dataset type
        if dataset.dataset_type == Dataset.DatasetType.RASTER:
            serializer = RasterMapLayerSerializer(map_layers, many=True)
        elif dataset.dataset_type == Dataset.DatasetType.VECTOR:
            # Set serializer
            serializer = VectorMapLayerSerializer(map_layers, many=True)
        else:
            raise NotImplementedError(f'Dataset Type {dataset.dataset_type}')

        # Return response with rendered data
        return Response(serializer.data, status=200)

    @action(detail=True, methods=['get'])
    def network(self, request, **kwargs):
        dataset = self.get_object()
        networks = []
        for network in dataset.networks.all():
            networks.append(
                {
                    'nodes': [
                        NetworkNodeSerializer(n).data
                        for n in NetworkNode.objects.filter(network=network)
                    ],
                    'edges': [
                        NetworkEdgeSerializer(e).data
                        for e in NetworkEdge.objects.filter(network=network)
                    ],
                }
            )
        return Response(networks, status=200)

    @swagger_auto_schema(query_serializer=GCCQueryParamSerializer)
    @action(detail=True, methods=['get'])
    def gcc(self, request, **kwargs):
        dataset = self.get_object()

        # Validate and de-serialize query params
        serializer = GCCQueryParamSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        project_id = serializer.validated_data['project']
        exclude_nodes = [int(n) for n in serializer.validated_data['exclude_nodes'].split(',')]

        if not dataset.networks.exists():
            return Response(data='No networks exist in selected dataset', status=400)

        # Find the GCC for each network in the dataset
        network_gccs: list[list[int]] = []
        for network in dataset.networks.all():
            network: Network
            network_gccs.append(network.get_gcc(excluded_nodes=exclude_nodes))

        # TODO: improve this for datasets with multiple networks.
        # This currently returns the gcc for the network with the most excluded nodes
        gcc = max(network_gccs, key=len)

        add_gcc_chart_datum(dataset, project_id, exclude_nodes, len(gcc))
        return Response(gcc, status=200)

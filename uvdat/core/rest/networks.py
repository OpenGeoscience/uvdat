from drf_yasg.utils import swagger_auto_schema
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Network
from uvdat.core.rest.access_control import GuardianFilter, GuardianPermission
from uvdat.core.rest.serializers import (
    NetworkEdgeSerializer,
    NetworkNodeSerializer,
    NetworkSerializer,
)


class GCCQueryParamSerializer(serializers.Serializer):
    exclude_nodes = serializers.RegexField(r'^\d+(,\s?\d+)*$')


class GCCResultSerializer(serializers.Serializer):
    gcc = serializers.ListField(child=serializers.IntegerField())


class NetworkViewSet(ModelViewSet):
    queryset = Network.objects.all()
    serializer_class = NetworkSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

    @action(detail=True, methods=['get'])
    def nodes(self, request, **kwargs):
        network: Network = self.get_object()
        return Response(
            NetworkNodeSerializer(network.nodes.all(), many=True).data,
            status=200,
        )

    @action(detail=True, methods=['get'])
    def edges(self, request, **kwargs):
        network: Network = self.get_object()
        return Response(
            NetworkEdgeSerializer(network.edges.all(), many=True).data,
            status=200,
        )

    @swagger_auto_schema(query_serializer=GCCQueryParamSerializer)
    @action(detail=True, methods=['get'])
    def gcc(self, request, **kwargs):
        network = self.get_object()

        # Validate and de-serialize query params
        serializer = GCCQueryParamSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        exclude_nodes = [int(n) for n in serializer.validated_data['exclude_nodes'].split(',')]

        gcc = network.get_gcc(excluded_nodes=exclude_nodes)
        result = GCCResultSerializer(data=dict(gcc=gcc))
        result.is_valid(raise_exception=True)
        return Response(result.validated_data['gcc'], status=200)

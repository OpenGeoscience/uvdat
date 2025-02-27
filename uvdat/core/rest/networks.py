from drf_yasg.utils import swagger_auto_schema
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Network
from uvdat.core.rest.access_control import GuardianFilter, GuardianPermission
from uvdat.core.rest.serializers import NetworkSerializer


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
        if result.is_valid():
            return Response(result.data.get('gcc'), status=200)

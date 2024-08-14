from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Network, NetworkEdge, NetworkNode
from uvdat.core.rest.filter import AccessControl
from uvdat.core.rest.serializers import (
    NetworkEdgeSerializer,
    NetworkNodeSerializer,
    NetworkSerializer,
)


class NetworkViewSet(ModelViewSet):
    queryset = Network.objects.all()
    serializer_class = NetworkSerializer
    filter_backends = [AccessControl]
    lookup_field = "id"


class NetworkNodeViewSet(ModelViewSet):
    queryset = NetworkNode.objects.all()
    serializer_class = NetworkNodeSerializer
    filter_backends = [AccessControl]
    lookup_field = "id"


class NetworkEdgeViewSet(ModelViewSet):
    queryset = NetworkEdge.objects.all()
    serializer_class = NetworkEdgeSerializer
    filter_backends = [AccessControl]
    lookup_field = "id"

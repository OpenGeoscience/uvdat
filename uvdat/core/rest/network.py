from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Network, NetworkEdge, NetworkNode
from uvdat.core.rest.serializers import (
    NetworkEdgeSerializer,
    NetworkNodeSerializer,
    NetworkSerializer,
)


class NetworkViewSet(ModelViewSet):
    queryset = Network.objects.all()
    serializer_class = NetworkSerializer


class NetworkNodeViewSet(ModelViewSet):
    queryset = NetworkNode.objects.all()
    serializer_class = NetworkNodeSerializer


class NetworkEdgeViewSet(ModelViewSet):
    queryset = NetworkEdge.objects.all()
    serializer_class = NetworkEdgeSerializer

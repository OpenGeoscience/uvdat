from rest_framework.viewsets import ReadOnlyModelViewSet

from uvdat.core.models import Layer, LayerFrame
from uvdat.core.rest.access_control import GuardianFilter, GuardianPermission
from uvdat.core.rest.serializers import LayerFrameSerializer, LayerSerializer


class LayerViewSet(ReadOnlyModelViewSet):
    queryset = Layer.objects.select_related('dataset').all()
    serializer_class = LayerSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'


class LayerFrameViewSet(ReadOnlyModelViewSet):
    queryset = LayerFrame.objects.select_related('dataset').all()
    serializer_class = LayerFrameSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

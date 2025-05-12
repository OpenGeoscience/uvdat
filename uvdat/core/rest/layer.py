from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from uvdat.core.models import Layer, LayerFrame
from uvdat.core.rest.access_control import GuardianFilter, GuardianPermission
from uvdat.core.rest.serializers import LayerFrameSerializer, LayerSerializer, LayerStyleSerializer


class LayerViewSet(ReadOnlyModelViewSet):
    queryset = Layer.objects.select_related('dataset').all()
    serializer_class = LayerSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

    @action(detail=True, methods=['get'])
    def styles(self, request, **kwargs):
        layer = self.get_object()
        return Response(
            [LayerStyleSerializer(style).data for style in layer.styles.all()],
            status=200,
        )


class LayerFrameViewSet(ReadOnlyModelViewSet):
    queryset = LayerFrame.objects.select_related('dataset').all()
    serializer_class = LayerFrameSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

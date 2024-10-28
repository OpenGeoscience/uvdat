from rest_framework import mixins
from rest_framework.viewsets import GenericViewSet

from uvdat.core.models import SourceRegion
from uvdat.core.rest.access_control import GuardianFilter, GuardianPermission

from .serializers import SourceRegionSerializer


class SourceRegionViewSet(mixins.RetrieveModelMixin, mixins.ListModelMixin, GenericViewSet):
    queryset = SourceRegion.objects.all()
    serializer_class = SourceRegionSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

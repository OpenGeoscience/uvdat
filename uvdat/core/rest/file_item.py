from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import FileItem
from uvdat.core.rest.guardian import GuardianFilter, GuardianPermission
from uvdat.core.rest.serializers import FileItemSerializer


class FileItemViewSet(ModelViewSet):
    queryset = FileItem.objects.all()
    serializer_class = FileItemSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

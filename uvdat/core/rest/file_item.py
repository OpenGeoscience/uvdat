from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import FileItem
from uvdat.core.rest.serializers import FileItemSerializer
from uvdat.core.rest.filter import AccessControl


class FileItemViewSet(ModelViewSet):
    queryset = FileItem.objects.all()
    serializer_class = FileItemSerializer
    filter_backends = [AccessControl]

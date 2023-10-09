from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import City
from uvdat.core.rest.serializers import CitySerializer


class CityViewSet(ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer

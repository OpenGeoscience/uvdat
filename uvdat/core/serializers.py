from rest_framework import serializers
from uvdat.core.models import City, Dataset


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = '__all__'


class CitySerializer(serializers.ModelSerializer):
    datasets = DatasetSerializer(many=True)
    center = serializers.SerializerMethodField("get_center")

    def get_center(self, obj):
        if obj.center:
            return [obj.center.y, obj.center.x]
        else:
            return [0, 0]

    class Meta:
        model = City
        fields = '__all__'

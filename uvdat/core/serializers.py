from rest_framework import serializers

from uvdat.core.models import Chart, City, Dataset, NetworkNode, SimulationResult


class NetworkNodeSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField('get_location')

    def get_location(self, obj):
        if obj.location:
            return [obj.location.y, obj.location.x]
        else:
            return [0, 0]

    class Meta:
        model = NetworkNode
        fields = '__all__'


class ChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chart
        fields = '__all__'


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = '__all__'


class CitySerializer(serializers.ModelSerializer):
    datasets = DatasetSerializer(many=True)
    center = serializers.SerializerMethodField('get_center')

    def get_center(self, obj):
        if obj.center:
            return [obj.center.y, obj.center.x]
        else:
            return [0, 0]

    class Meta:
        model = City
        fields = '__all__'


class SimulationResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationResult
        fields = '__all__'

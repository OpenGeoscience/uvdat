import json

from django.contrib.gis.serializers import geojson
from rest_framework import serializers

from uvdat.core.models import (
    Chart,
    Context,
    Dataset,
    DerivedRegion,
    FileItem,
    NetworkEdge,
    NetworkNode,
    RasterMapLayer,
    SimulationResult,
    SourceRegion,
    VectorMapLayer,
)


class ContextSerializer(serializers.ModelSerializer):
    default_map_center = serializers.SerializerMethodField('get_center')

    def get_center(self, obj):
        if obj.default_map_center:
            return [obj.default_map_center.x, obj.default_map_center.y]

    class Meta:
        model = Context
        fields = '__all__'


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = '__all__'


class FileItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileItem
        fields = '__all__'


class ChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chart
        fields = '__all__'


class RasterMapLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RasterMapLayer
        fields = '__all__'


class VectorMapLayerSerializer(serializers.ModelSerializer):
    tile_coords = serializers.SerializerMethodField('get_tile_coords')

    def get_tile_coords(self, obj):
        return obj.get_available_tile_coords()

    class Meta:
        model = VectorMapLayer
        fields = '__all__'


class SourceRegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceRegion
        fields = '__all__'


class RegionFeatureCollectionSerializer(geojson.Serializer):
    # Override this method to ensure the pk field is a number instead of a string
    def get_dump_object(self, obj):
        val = super().get_dump_object(obj)
        val['properties']['id'] = int(val['properties'].pop('pk'))

        return val


class DerivedRegionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DerivedRegion
        fields = ['id', 'name', 'context', 'properties', 'source_regions', 'source_operation']


class DerivedRegionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = DerivedRegion
        fields = '__all__'

    boundary = serializers.SerializerMethodField()

    def get_boundary(self, obj):
        return json.loads(obj.boundary.geojson)


class DerivedRegionCreationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DerivedRegion
        fields = [
            'name',
            'context',
            'regions',
            'operation',
        ]

    regions = serializers.ListField(child=serializers.IntegerField())
    operation = serializers.ChoiceField(choices=DerivedRegion.VectorOperation.choices)


class NetworkNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = NetworkNode
        fields = '__all__'


class NetworkEdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = NetworkEdge
        fields = '__all__'


class SimulationResultSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField('get_name')

    def get_name(self, obj):
        return obj.get_name()

    class Meta:
        model = SimulationResult

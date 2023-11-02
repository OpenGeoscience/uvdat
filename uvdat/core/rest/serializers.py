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
        # Web client expects Lon, Lat
        if obj.default_map_center:
            return [obj.default_map_center.y, obj.default_map_center.x]

    class Meta:
        model = Context
        fields = '__all__'


class DatasetSerializer(serializers.ModelSerializer):
    map_layers = serializers.SerializerMethodField('get_map_layers')
    networked = serializers.SerializerMethodField('get_networked')

    def get_map_layers(self, obj):
        return obj.get_map_layers()

    def get_networked(self, obj):
        return obj.get_network() is not None

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
    name = serializers.SerializerMethodField('get_name')
    type = serializers.SerializerMethodField('get_type')
    dataset_id = serializers.SerializerMethodField('get_dataset_id')
    file_item = serializers.SerializerMethodField('get_file_item')

    def get_name(self, obj):
        if obj.file_item is None:
            return None
        return obj.file_item.name

    def get_type(self, obj):
        return 'raster'

    def get_dataset_id(self, obj):
        if obj.file_item and obj.file_item.dataset:
            return obj.file_item.dataset.id
        return None

    def get_file_item(self, obj):
        if obj.file_item is None:
            return None
        return {
            'id': obj.file_item.id,
            'name': obj.file_item.name,
        }

    class Meta:
        model = RasterMapLayer
        fields = '__all__'


class VectorMapLayerSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField('get_name')
    type = serializers.SerializerMethodField('get_type')
    dataset_id = serializers.SerializerMethodField('get_dataset_id')
    file_item = serializers.SerializerMethodField('get_file_item')
    derived_region_id = serializers.SerializerMethodField('get_derived_region_id')
    tile_coords = serializers.SerializerMethodField('get_tile_coords')

    def get_name(self, obj):
        if obj.file_item is None:
            return None
        return obj.file_item.name

    def get_type(self, obj):
        return 'vector'

    def get_dataset_id(self, obj):
        if obj.file_item and obj.file_item.dataset:
            return obj.file_item.dataset.id
        return None

    def get_file_item(self, obj):
        if obj.file_item is None:
            return None
        return {
            'id': obj.file_item.id,
            'name': obj.file_item.name,
        }

    def get_derived_region_id(self, obj):
        dr = obj.derivedregion_set.first()
        if dr is None:
            return None
        return dr.id

    def get_tile_coords(self, obj):
        return obj.get_available_tile_coords()

    class Meta:
        model = VectorMapLayer
        exclude = ['geojson_file']


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
    map_layers = serializers.SerializerMethodField('get_map_layers')

    def get_map_layers(self, obj):
        return obj.get_map_layers()

    class Meta:
        model = DerivedRegion
        fields = [
            'id',
            'name',
            'context',
            'metadata',
            'source_regions',
            'operation',
            'map_layers',
        ]


class DerivedRegionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = DerivedRegion
        fields = '__all__'

    boundary = serializers.SerializerMethodField()
    map_layers = serializers.SerializerMethodField('get_map_layers')

    def get_boundary(self, obj):
        return json.loads(obj.boundary.geojson)

    def get_map_layers(self, obj):
        return obj.get_map_layers()


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
        fields = '__all__'

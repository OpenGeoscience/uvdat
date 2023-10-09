import json

from django.contrib.gis.serializers import geojson
from rest_framework import serializers

from uvdat.core.models import (
    ChartDataSource,
    City,
    DataCollection,
    Dataset,
    DerivedRegion,
    FileItem,
    NetworkEdge,
    NetworkNode,
    OriginalRegion,
    RasterDataSource,
    SimulationResult,
    VectorDataSource,
)


class CitySerializer(serializers.ModelSerializer):
    center = serializers.SerializerMethodField('get_center')

    def get_center(self, obj):
        return obj.get_center()

    class Meta:
        model = City
        fields = '__all__'


class DataCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataCollection
        fields = '__all__'


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = '__all__'


class FileItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileItem
        fields = '__all__'


class ChartDataSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartDataSource
        fields = '__all__'


class RasterDataSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RasterDataSource
        fields = '__all__'


class VectorDataSourceSerializer(serializers.ModelSerializer):
    tile_coords = serializers.SerializerMethodField('get_tile_coords')

    def get_tile_coords(self, obj):
        return obj.get_available_tile_coords()

    class Meta:
        model = VectorDataSource
        fields = '__all__'


class OriginalRegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OriginalRegion
        fields = '__all__'


class RegionFeatureCollectionSerializer(geojson.Serializer):
    # Override this method to ensure the pk field is a number instead of a string
    def get_dump_object(self, obj):
        val = super().get_dump_object(obj)
        val["properties"]["id"] = int(val["properties"].pop("pk"))

        return val


class DerivedRegionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DerivedRegion
        fields = ['id', 'name', 'city', 'properties', 'source_regions', 'source_operation']


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
            'city',
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

import json

from django.contrib.auth.models import User
from django.contrib.gis.geos import Point
from django.contrib.gis.serializers import geojson
from guardian.shortcuts import get_users_with_perms
from rest_framework import serializers

from uvdat.core.models import (
    Chart,
    Dataset,
    DerivedRegion,
    FileItem,
    Network,
    NetworkEdge,
    NetworkNode,
    Project,
    RasterMapLayer,
    SimulationResult,
    SourceRegion,
    VectorMapLayer,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_superuser']


class ProjectSerializer(serializers.ModelSerializer):
    default_map_center = serializers.SerializerMethodField('get_center')
    owner = serializers.SerializerMethodField('get_owner')
    collaborators = serializers.SerializerMethodField('get_collaborators')
    followers = serializers.SerializerMethodField('get_followers')

    def get_center(self, obj):
        # Web client expects Lon, Lat
        if obj.default_map_center:
            return [obj.default_map_center.y, obj.default_map_center.x]

    def get_owner(self, obj):
        users = list(get_users_with_perms(obj, only_with_perms_in=['owner']))
        if len(users) != 1:
            raise Exception('Project must have exactly one owner')

        return UserSerializer(users[0]).data

    def get_collaborators(self, obj):
        users = get_users_with_perms(obj, only_with_perms_in=['collaborator'])
        return [UserSerializer(user).data for user in users.all()]

    def get_followers(self, obj):
        users = get_users_with_perms(obj, only_with_perms_in=['follower'])
        return [UserSerializer(user).data for user in users.all()]

    def to_internal_value(self, data):
        center = data.get('default_map_center')
        data = super().to_internal_value(data)
        if isinstance(center, list):
            data['default_map_center'] = Point(center[1], center[0])
        return data

    class Meta:
        model = Project
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


class AbstractMapLayerSerializer(serializers.Serializer):
    name = serializers.SerializerMethodField('get_name')
    type = serializers.SerializerMethodField('get_type')
    dataset_id = serializers.SerializerMethodField('get_dataset_id')
    file_item = serializers.SerializerMethodField('get_file_item')

    def get_name(self, obj: VectorMapLayer | RasterMapLayer):
        if obj.dataset:
            for file_item in obj.dataset.source_files.all():
                if file_item.index == obj.index:
                    return file_item.name
            return f'{obj.dataset.name} Layer {obj.index}'
        return None

    def get_type(self, obj: VectorMapLayer | RasterMapLayer):
        if isinstance(obj, VectorMapLayer):
            return 'vector'
        return 'raster'

    def get_dataset_id(self, obj: VectorMapLayer | RasterMapLayer):
        if obj.dataset:
            return obj.dataset.id
        return None

    def get_file_item(self, obj: VectorMapLayer | RasterMapLayer):
        if obj.dataset is None:
            return None
        for file_item in obj.dataset.source_files.all():
            if file_item.index == obj.index:
                return {
                    'id': file_item.id,
                    'name': file_item.name,
                }


class RasterMapLayerSerializer(serializers.ModelSerializer, AbstractMapLayerSerializer):
    class Meta:
        model = RasterMapLayer
        fields = '__all__'


class VectorMapLayerSerializer(serializers.ModelSerializer, AbstractMapLayerSerializer):
    dataset_category = serializers.SerializerMethodField()

    def get_dataset_category(self, obj: VectorMapLayer):
        if obj.dataset is None:
            raise Exception('map layer with null dataset!')

        return obj.dataset.category

    class Meta:
        model = VectorMapLayer
        exclude = ['geojson_file']


class VectorMapLayerDetailSerializer(VectorMapLayerSerializer):
    derived_region_id = serializers.SerializerMethodField('get_derived_region_id')

    def get_derived_region_id(self, obj):
        dr = obj.derivedregion_set.first()
        if dr is None:
            return None
        return dr.id

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
            'project',
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
            'project',
            'regions',
            'operation',
        ]

    regions = serializers.ListField(child=serializers.IntegerField())
    operation = serializers.ChoiceField(choices=DerivedRegion.VectorOperation.choices)


class NetworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Network
        fields = '__all__'

    name = serializers.SerializerMethodField('get_name')

    def get_name(self, obj):
        return obj.dataset.name


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

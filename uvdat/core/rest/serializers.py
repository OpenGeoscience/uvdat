from django.contrib.auth.models import User
from django.contrib.gis.geos import Point
from django.contrib.gis.serializers import geojson
from rest_framework import serializers

from uvdat.core.models import (
    Chart,
    Dataset,
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


class ProjectPermissionsSerializer(serializers.Serializer):
    owner_id = serializers.IntegerField()
    collaborator_ids = serializers.ListField(child=serializers.IntegerField())
    follower_ids = serializers.ListField(child=serializers.IntegerField())

    def validate(self, attrs):
        collaborators = set(attrs['collaborator_ids'])
        followers = set(attrs['follower_ids'])
        owner = attrs['owner_id']

        if collaborators & followers or owner in (collaborators | followers):
            raise serializers.ValidationError(
                'A user cannot have multiple permissions on a single project'
            )

        return super().validate(attrs)


class ProjectSerializer(serializers.ModelSerializer):
    default_map_center = serializers.SerializerMethodField('get_center')
    owner = serializers.SerializerMethodField('get_owner')
    collaborators = serializers.SerializerMethodField('get_collaborators')
    followers = serializers.SerializerMethodField('get_followers')
    item_counts = serializers.SerializerMethodField('get_item_counts')

    def get_center(self, obj):
        # Web client expects Lon, Lat
        if obj.default_map_center:
            return [obj.default_map_center.y, obj.default_map_center.x]

    def get_owner(self, obj: Project):
        return UserSerializer(obj.owner()).data

    def get_collaborators(self, obj: Project):
        return [UserSerializer(user).data for user in obj.collaborators()]

    def get_followers(self, obj: Project):
        return [UserSerializer(user).data for user in obj.followers()]

    def get_item_counts(self, obj):
        return {
            'datasets': obj.datasets.count(),
            'charts': obj.charts.count(),
            'simulations': obj.simulation_results.count(),
        }

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

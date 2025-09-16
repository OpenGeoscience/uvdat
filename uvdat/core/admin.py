from django.contrib import admin

from uvdat.core.models import (
    Chart,
    Dataset,
    FileItem,
    Layer,
    LayerFrame,
    LayerStyle,
    Network,
    NetworkEdge,
    NetworkNode,
    Project,
    RasterData,
    Region,
    TaskResult,
    VectorData,
    VectorFeature,
)


class ProjectAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


class DatasetAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'category']


class FileItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_relationship']

    def get_relationship(self, obj):
        if obj.dataset is not None:
            return obj.dataset.name
        if obj.chart is not None:
            return obj.chart.name
        return 'None'


class ChartAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'editable']


class LayerAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_dataset_name']

    def get_dataset_name(self, obj):
        return obj.dataset.name


class LayerFrameAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'index', 'get_layer_name']

    def get_layer_name(self, obj):
        return obj.layer.name


class LayerStyleAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_layer_name']

    def get_layer_name(self, obj):
        return obj.layer.name


class RasterDataAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_source_file_name']

    def get_source_file_name(self, obj):
        if obj.source_file is not None:
            return obj.source_file.name
        return ''


class VectorDataAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_source_file_name']

    def get_source_file_name(self, obj):
        if obj.source_file is not None:
            return obj.source_file.name
        return ''


class VectorFeatureAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_dataset_name']

    def get_dataset_name(self, obj):
        return obj.vector_data.dataset.name


class RegionAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_dataset_name']

    def get_dataset_name(self, obj):
        return obj.dataset.name


class NetworkAdmin(admin.ModelAdmin):
    list_display = ['id', 'category']


class NetworkEdgeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_network_id', 'get_dataset_name']

    def get_network_id(self, obj):
        return obj.network.id

    def get_dataset_name(self, obj):
        return obj.network.vector_data.dataset.name


class NetworkNodeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_network_id', 'get_dataset_name', 'get_adjacent_node_names']

    def get_network_id(self, obj):
        return obj.network.id

    def get_dataset_name(self, obj):
        return obj.network.vector_data.dataset.name

    def get_adjacent_node_names(self, obj):
        return ', '.join(n.name for n in obj.get_adjacent_nodes())


class TaskResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'analysis_type', 'inputs']


admin.site.register(Project, ProjectAdmin)
admin.site.register(Dataset, DatasetAdmin)
admin.site.register(FileItem, FileItemAdmin)
admin.site.register(Chart, ChartAdmin)
admin.site.register(Layer, LayerAdmin)
admin.site.register(LayerFrame, LayerFrameAdmin)
admin.site.register(LayerStyle, LayerStyleAdmin)
admin.site.register(RasterData, RasterDataAdmin)
admin.site.register(VectorData, VectorDataAdmin)
admin.site.register(VectorFeature, VectorFeatureAdmin)
admin.site.register(Region, RegionAdmin)
admin.site.register(Network, NetworkAdmin)
admin.site.register(NetworkNode, NetworkNodeAdmin)
admin.site.register(NetworkEdge, NetworkEdgeAdmin)
admin.site.register(TaskResult, TaskResultAdmin)

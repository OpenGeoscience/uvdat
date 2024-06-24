from django.contrib import admin

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
    VectorFeature,
    VectorMapLayer,
)


class ContextAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


class DatasetAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'dataset_type', 'category']


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


class RasterMapLayerAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_dataset_name', 'index']

    def get_dataset_name(self, obj):
        return obj.file_item.dataset.name


class VectorMapLayerAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_dataset_name', 'index']

    def get_dataset_name(self, obj):
        return obj.file_item.dataset.name


class VectorFeatureAdmin(admin.ModelAdmin):
    list_display = ['id', 'map_layer']


class SourceRegionAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_dataset_name']

    def get_dataset_name(self, obj):
        return obj.dataset.name


class DerivedRegionAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_context_name', 'operation', 'get_source_region_names']

    def get_context_name(self, obj):
        return obj.context.name

    def get_source_region_names(self, obj):
        return ', '.join(r.name for r in obj.source_regions.all())


class NetworkEdgeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_dataset_name']

    def get_dataset_name(self, obj):
        return obj.dataset.name


class NetworkNodeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_dataset_name', 'get_adjacent_node_names']

    def get_dataset_name(self, obj):
        return obj.dataset.name

    def get_adjacent_node_names(self, obj):
        return ', '.join(n.name for n in obj.get_adjacent_nodes())


class SimulationResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'simulation_type', 'input_args']


admin.site.register(Context, ContextAdmin)
admin.site.register(Dataset, DatasetAdmin)
admin.site.register(FileItem, FileItemAdmin)
admin.site.register(Chart, ChartAdmin)
admin.site.register(RasterMapLayer, RasterMapLayerAdmin)
admin.site.register(VectorMapLayer, VectorMapLayerAdmin)
admin.site.register(VectorFeature, VectorFeatureAdmin)
admin.site.register(SourceRegion, SourceRegionAdmin)
admin.site.register(DerivedRegion, DerivedRegionAdmin)
admin.site.register(NetworkNode, NetworkNodeAdmin)
admin.site.register(NetworkEdge, NetworkEdgeAdmin)
admin.site.register(SimulationResult, SimulationResultAdmin)

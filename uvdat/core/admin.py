from django.contrib import admin

from uvdat.core.models import (
    Chart,
    City,
    Dataset,
    DerivedRegion,
    FileItem,
    NetworkEdge,
    NetworkNode,
    OriginalRegion,
    RasterDataSource,
    SimulationResult,
    VectorDataSource,
    VectorTile,
)


class CityAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


class DatasetAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'dataset_type', 'category', 'get_city_name']

    def get_city_name(self, obj):
        return obj.city.name


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


class RasterDataSourceAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_dataset_name', 'index']

    def get_dataset_name(self, obj):
        return obj.dataset.name


class VectorDataSourceAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_dataset_name', 'index']

    def get_dataset_name(self, obj):
        return obj.dataset.name


class VectorTileAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_dataset_name', 'get_data_source_index', 'x', 'y', 'z']

    def get_dataset_name(self, obj):
        return obj.data_source.dataset.name

    def get_data_source_index(self, obj):
        return obj.data_source.index


class OriginalRegionAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_city_name']

    def get_city_name(self, obj):
        return obj.city.name


class DerivedRegionAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_city_name', 'operation', 'get_original_region_names']

    def get_city_name(self, obj):
        return obj.city.name

    def get_original_region_names(self, obj):
        return ', '.join(r.name for r in obj.original_regions.all())


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


admin.site.register(City, CityAdmin)
admin.site.register(Dataset, DatasetAdmin)
admin.site.register(FileItem, FileItemAdmin)
admin.site.register(Chart, ChartAdmin)
admin.site.register(RasterDataSource, RasterDataSourceAdmin)
admin.site.register(VectorDataSource, VectorDataSourceAdmin)
admin.site.register(VectorTile, VectorTileAdmin)
admin.site.register(OriginalRegion, OriginalRegionAdmin)
admin.site.register(DerivedRegion, DerivedRegionAdmin)
admin.site.register(NetworkNode, NetworkNodeAdmin)
admin.site.register(NetworkEdge, NetworkEdgeAdmin)
admin.site.register(SimulationResult, SimulationResultAdmin)

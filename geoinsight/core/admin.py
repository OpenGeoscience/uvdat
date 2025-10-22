from django.contrib import admin

from geoinsight.core.models import (
    Chart,
    ColorConfig,
    Colormap,
    ColormapConfig,
    Dataset,
    FileItem,
    FilterConfig,
    Layer,
    LayerFrame,
    LayerStyle,
    Network,
    NetworkEdge,
    NetworkNode,
    Project,
    RasterData,
    Region,
    SizeConfig,
    SizeRangeConfig,
    TaskResult,
    VectorData,
    VectorFeature,
)


class ProjectAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


class DatasetAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'category']


class FileItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'dataset', 'chart']


class ChartAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'editable']


class LayerAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'dataset']


class LayerFrameAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'index', 'layer']


class LayerStyleAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'layer']


class ColormapAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


class ColorConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'style', 'name']


class ColormapConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'colormap', 'color_by']


class SizeConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'style', 'name']


class SizeRangeConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'minimum', 'maximum', 'size_by']


class FilterConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'style', 'filter_by']


class RasterDataAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'source_file']


class VectorDataAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'source_file']


class VectorFeatureAdmin(admin.ModelAdmin):
    list_display = ['id', 'dataset']
    list_select_related = ['vector_data__dataset']


class RegionAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'dataset']


class NetworkAdmin(admin.ModelAdmin):
    list_display = ['id', 'category', 'dataset']
    list_select_related = ['vector_data__dataset']


class NetworkEdgeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'network', 'dataset']
    list_select_related = ['network__vector_data__dataset']


class NetworkNodeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'network', 'dataset']
    list_select_related = ['network__vector_data__dataset']


class TaskResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'task_type', 'inputs']


admin.site.register(Project, ProjectAdmin)
admin.site.register(Dataset, DatasetAdmin)
admin.site.register(FileItem, FileItemAdmin)
admin.site.register(Chart, ChartAdmin)
admin.site.register(Layer, LayerAdmin)
admin.site.register(LayerFrame, LayerFrameAdmin)
admin.site.register(LayerStyle, LayerStyleAdmin)
admin.site.register(Colormap, ColormapAdmin)
admin.site.register(ColorConfig, ColorConfigAdmin)
admin.site.register(ColormapConfig, ColormapConfigAdmin)
admin.site.register(SizeConfig, SizeConfigAdmin)
admin.site.register(SizeRangeConfig, SizeRangeConfigAdmin)
admin.site.register(FilterConfig, FilterConfigAdmin)
admin.site.register(RasterData, RasterDataAdmin)
admin.site.register(VectorData, VectorDataAdmin)
admin.site.register(VectorFeature, VectorFeatureAdmin)
admin.site.register(Region, RegionAdmin)
admin.site.register(Network, NetworkAdmin)
admin.site.register(NetworkNode, NetworkNodeAdmin)
admin.site.register(NetworkEdge, NetworkEdgeAdmin)
admin.site.register(TaskResult, TaskResultAdmin)

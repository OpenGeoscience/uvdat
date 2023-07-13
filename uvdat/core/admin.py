from django.contrib import admin

from uvdat.core.models import City, Dataset, NetworkNode


class CityAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


class DatasetAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'category']


class NetworkNodeAdmin(admin.ModelAdmin):
    list_display = ['name', 'dataset', 'get_adjacent']

    def get_adjacent(self, obj):
        return ', '.join(n.name for n in obj.adjacent_nodes.all())


admin.site.register(City, CityAdmin)
admin.site.register(Dataset, DatasetAdmin)
admin.site.register(NetworkNode, NetworkNodeAdmin)

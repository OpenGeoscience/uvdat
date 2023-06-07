from django.contrib import admin
from uvdat.core.models import City, Dataset


class CityAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


class DatasetAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'category']


admin.site.register(City, CityAdmin)
admin.site.register(Dataset, DatasetAdmin)

from django.db import models

from .city import City


class Dataset(models.Model):
    class DatasetType(models.TextChoices):
        VECTOR = 'VECTOR', 'Vector'
        RASTER = 'RASTER', 'Raster'
        CHART = 'CHART', 'Chart'

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='datasets')
    category = models.CharField(max_length=25)
    processing = models.BooleanField(default=False)
    metadata = models.JSONField(blank=True, null=True)
    dataset_type = models.CharField(
        max_length=max(len(choice[0]) for choice in DatasetType.choices),
        choices=DatasetType.choices,
    )

    def spawn_conversion_task(self):
        # TODO: spawn conversion task
        pass

    def get_network(self):
        # TODO: get network
        pass

    def get_network_graph(self):
        # TODO: get network graph
        pass

    def get_network_gcc(self, exclude_nodes):
        # TODO: get network gcc
        pass

from django.db import models
from django.contrib.gis.db import models as geo_models

from .dataset import Dataset


class NetworkNode(models.Model):
    name = models.CharField(max_length=255, unique=True)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='network_nodes')
    metadata = models.JSONField(blank=True, null=True)
    capacity = models.IntegerField(null=True)
    location = geo_models.PointField()
    connected_edges = models.ManyToManyField('NetworkEdge')

    def get_adjacent_nodes(self):
        # TODO: get adjacent nodes from connected_edges
        return []


class NetworkEdge(models.Model):
    name = models.CharField(max_length=255, unique=True)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='network_edges')
    metadata = models.JSONField(blank=True, null=True)
    capacity = models.IntegerField(null=True)
    line = geo_models.LineStringField()
    connected_nodes = models.ManyToManyField('NetworkNode')

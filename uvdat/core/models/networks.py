from django.contrib.gis.db import models as geo_models
from django.db import models

from .dataset import Dataset


class NetworkNode(models.Model):
    name = models.CharField(max_length=255, unique=True)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='network_nodes')
    metadata = models.JSONField(blank=True, null=True)
    capacity = models.IntegerField(null=True)
    location = geo_models.PointField()

    def get_adjacent_nodes(self) -> models.QuerySet:
        entering_node_ids = (
            NetworkEdge.objects.filter(to_node=self.id)
            .values_list('from_node_id', flat=True)
            .distinct()
        )
        exiting_node_ids = (
            NetworkEdge.objects.filter(from_node=self.id)
            .values_list('to_node_id', flat=True)
            .distinct()
        )
        return NetworkNode.objects.exclude(id=self.id).filter(
            models.Q(id__in=entering_node_ids) | models.Q(id__in=exiting_node_ids)
        )


class NetworkEdge(models.Model):
    name = models.CharField(max_length=255, unique=True)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='network_edges')
    metadata = models.JSONField(blank=True, null=True)
    capacity = models.IntegerField(null=True)
    line_geometry = geo_models.LineStringField()
    directed = models.BooleanField(default=False)
    from_node = models.ForeignKey(NetworkNode, related_name='+', on_delete=models.CASCADE)
    to_node = models.ForeignKey(NetworkNode, related_name='+', on_delete=models.CASCADE)

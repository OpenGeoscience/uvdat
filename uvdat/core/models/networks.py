from django.contrib.gis.db import models as geo_models
from django.db import models
import networkx as nx

from .dataset import Dataset


class Network(models.Model):
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='networks')
    category = models.CharField(max_length=25)
    metadata = models.JSONField(blank=True, null=True)

    def is_in_context(self, context_id):
        return self.dataset.is_in_context(context_id)

    def get_graph(self):
        from uvdat.core.tasks.networks import get_network_graph

        return get_network_graph(self)

    def get_gcc(self, exclude_nodes):
        graph = self.get_graph()
        graph.remove_nodes_from(exclude_nodes)
        if graph.number_of_nodes == 0 or nx.number_connected_components(graph) == 0:
            return []
        gcc = max(nx.connected_components(graph), key=len)
        return list(gcc)


class NetworkNode(models.Model):
    name = models.CharField(max_length=255)
    network = models.ForeignKey(Network, on_delete=models.CASCADE, related_name='nodes')
    metadata = models.JSONField(blank=True, null=True)
    capacity = models.IntegerField(null=True)
    location = geo_models.PointField()

    def is_in_context(self, context_id):
        return self.network.is_in_context(context_id)

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
    name = models.CharField(max_length=255)
    network = models.ForeignKey(Network, on_delete=models.CASCADE, related_name='edges')
    metadata = models.JSONField(blank=True, null=True)
    capacity = models.IntegerField(null=True)
    line_geometry = geo_models.LineStringField()
    directed = models.BooleanField(default=False)
    from_node = models.ForeignKey(NetworkNode, related_name='+', on_delete=models.CASCADE)
    to_node = models.ForeignKey(NetworkNode, related_name='+', on_delete=models.CASCADE)

    def is_in_context(self, context_id):
        return self.network.is_in_context(context_id)

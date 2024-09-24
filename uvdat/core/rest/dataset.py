import json

from django.db import connection
from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Dataset, Network, NetworkEdge, NetworkNode
from uvdat.core.rest.access_control import GuardianFilter, GuardianPermission
from uvdat.core.rest.serializers import (
    DatasetSerializer,
    NetworkEdgeSerializer,
    NetworkNodeSerializer,
    RasterMapLayerSerializer,
    VectorMapLayerSerializer,
)
from uvdat.core.tasks.chart import add_gcc_chart_datum

GCC_QUERY = """
WITH RECURSIVE n as (
    -- starting node
    SELECT id FROM (
        SELECT cnn.id
        FROM core_networknode cnn
        WHERE
            cnn.network_id = %(network_id)s AND
            NOT (cnn.id = ANY(%(excluded_nodes)s))
        ORDER BY random()
        LIMIT 1
    ) nn
    UNION
    -- Select the *other* node in the edge
    SELECT CASE
        WHEN e.to_node_id = n.id
        THEN e.from_node_id
        ELSE e.to_node_id
    END
    FROM n
    JOIN (
        SELECT *
        FROM core_networkedge ne
        WHERE
            ne.network_id = %(network_id)s AND
            NOT (
                ne.from_node_id = ANY(%(excluded_nodes)s) OR
                ne.to_node_id = ANY(%(excluded_nodes)s)
            )
    ) e
    ON
        e.from_node_id = n.id OR
        e.to_node_id = n.id
)
SELECT id FROM n ORDER BY id
;
"""


def find_network_gcc(network: Network, excluded_nodes: list[int]) -> list[int]:
    total_nodes = NetworkNode.objects.filter(network=network).count()

    # This is used to store all the nodes we've already visited,
    # starting with the explicitly excluded nodes
    cur_excluded_nodes = excluded_nodes.copy()

    # Store largest network found so far
    gcc = []

    with connection.cursor() as cursor:
        # If the GCC size is greater than half the network, we know that there's no way to find a
        # larger one. If we've exhausted all nodes, also stop searching
        while not (len(gcc) > (total_nodes // 2) or len(cur_excluded_nodes) >= total_nodes):
            cursor.execute(
                GCC_QUERY,
                {
                    'excluded_nodes': cur_excluded_nodes,
                    'network_id': network.pk,
                },
            )
            nodes = [x[0] for x in cursor.fetchall()]
            if not nodes:
                raise Exception('Expected to find nodes but found none')

            cur_excluded_nodes.extend(nodes)
            if len(nodes) > len(gcc):
                gcc = nodes

    return gcc


class DatasetViewSet(ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

    def get_queryset(self):
        qs = super().get_queryset()
        project_id: str = self.request.query_params.get('project')
        if project_id is None or not project_id.isdigit():
            return qs

        return qs.filter(project=int(project_id))

    @action(detail=True, methods=['get'])
    def map_layers(self, request, **kwargs):
        dataset: Dataset = self.get_object()
        map_layers = list(dataset.get_map_layers().select_related('dataset'))

        # Set serializer based on dataset type
        if dataset.dataset_type == Dataset.DatasetType.RASTER:
            serializer = RasterMapLayerSerializer(map_layers, many=True)
        elif dataset.dataset_type == Dataset.DatasetType.VECTOR:
            # Set serializer
            serializer = VectorMapLayerSerializer(map_layers, many=True)
        else:
            raise NotImplementedError(f'Dataset Type {dataset.dataset_type}')

        # Return response with rendered data
        return Response(serializer.data, status=200)

    @action(detail=True, methods=['get'])
    def convert(self, request, **kwargs):
        dataset = self.get_object()
        dataset.spawn_conversion_task()
        return HttpResponse(status=200)

    @action(detail=True, methods=['get'])
    def network(self, request, **kwargs):
        dataset = self.get_object()
        networks = []
        for network in dataset.networks.all():
            networks.append(
                {
                    'nodes': [
                        NetworkNodeSerializer(n).data
                        for n in NetworkNode.objects.filter(network=network)
                    ],
                    'edges': [
                        NetworkEdgeSerializer(e).data
                        for e in NetworkEdge.objects.filter(network=network)
                    ],
                }
            )
        return HttpResponse(json.dumps(networks), status=200)

    @action(detail=True, methods=['get'])
    def gcc(self, request, **kwargs):
        dataset = self.get_object()
        project_id = request.query_params.get('project')
        exclude_nodes = request.query_params.get('exclude_nodes', [])
        exclude_nodes = exclude_nodes.split(',')
        exclude_nodes = [int(n) for n in exclude_nodes if len(n)]

        # Find the GCC for each network in the dataset
        network_gccs: list[list[int]] = []
        for network in dataset.networks.all():
            network_gccs.append(find_network_gcc(network=network, excluded_nodes=exclude_nodes))

        # TODO: improve this for datasets with multiple networks.
        # This currently returns the gcc for the network with the most excluded nodes
        gcc = max(network_gccs, key=len)

        add_gcc_chart_datum(dataset, project_id, exclude_nodes, len(gcc))
        return Response(gcc, status=200)

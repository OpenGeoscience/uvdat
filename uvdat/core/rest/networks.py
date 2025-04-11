import typing

from django.db import connection
from drf_yasg.utils import swagger_auto_schema
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Dataset, Network
from uvdat.core.rest.access_control import GuardianFilter, GuardianPermission
from uvdat.core.rest.serializers import NetworkSerializer

AFFECTED_REGIONS_QUERY = """
with nodes as (
    SELECT
        *
    FROM core_networknode nn
    WHERE nn.id = ANY(%(nodes)s)
)

SELECT
    r.id
FROM core_region r
    INNER JOIN nodes ON ST_INTERSECTS(r.boundary, nodes.location)
WHERE r.dataset_id = %(region_dataset_id)s
;
"""


class GCCQueryParamSerializer(serializers.Serializer):
    exclude_nodes = serializers.RegexField(r'^\d+(,\s?\d+)*$')

    # The ID of the region dataset for which we want to check the affected regions
    affected_region_dataset_id = serializers.IntegerField(allow_null=True, default=None)


class GCCResultSerializer(serializers.Serializer):
    gcc = serializers.ListField(child=serializers.IntegerField())
    affected_region_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True, default=None
    )


class NetworkViewSet(ModelViewSet):
    queryset = Network.objects.all()
    serializer_class = NetworkSerializer
    permission_classes = [GuardianPermission]
    filter_backends = [GuardianFilter]
    lookup_field = 'id'

    @swagger_auto_schema(query_serializer=GCCQueryParamSerializer)
    @action(detail=True, methods=['get'])
    def gcc(self, request, **kwargs):
        network = typing.cast(Network, self.get_object())

        # Validate and de-serialize query params
        serializer = GCCQueryParamSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        exclude_nodes = [int(n) for n in serializer.validated_data['exclude_nodes'].split(',')]

        gcc = network.get_gcc(excluded_nodes=exclude_nodes)

        # affected regions
        region_ids: list[int] | None = None
        region_dataset_id = serializer.validated_data['affected_region_dataset_id']
        if region_dataset_id is not None:
            region_dataset = Dataset.objects.filter(category='region', id=region_dataset_id).first()
            if region_dataset is None:
                return Response(f'Region dataset with ID {region_dataset_id} not found', status=400)

            # region_dataset
            unavailable_nodes = list(
                set(network.nodes.all().values_list('id', flat=True)) - set(gcc)
            )

            with connection.cursor() as cursor:
                cursor.execute(
                    sql=AFFECTED_REGIONS_QUERY,
                    params={
                        'nodes': unavailable_nodes,
                        'region_dataset_id': region_dataset_id,
                    },
                )
                region_ids = [x[0] for x in cursor.fetchall()]

        result = GCCResultSerializer(data={'gcc': gcc, 'affected_region_ids': region_ids})
        result.is_valid(raise_exception=True)
        return Response(result.validated_data, status=200)

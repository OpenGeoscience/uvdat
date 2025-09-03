import json
import pathlib

from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.core.management.base import BaseCommand

from uvdat.core.models.networks import Network, NetworkNode

data_path = pathlib.Path(__file__).parents[4] / 'sample_data' / 'failed_node_names.json'


class Command(BaseCommand):
    help = 'asd.'

    def handle(self, **kwargs):
        with open(data_path) as f:
            points = json.load(f)

        for _point in points:
            lon, lat = [float(x) for x in _point.split('/')]
            point = Point(x=lat, y=lon)
            # NetworkNode.objects.filter(location__lon=lon, location__lat=lat)
            qs = NetworkNode.objects.filter(location__distance_lte=(point, D(m=100.0)))
            print(qs.count())
        network = Network.objects.get(id=15)
        excluded_nodes = NetworkNode.objects.order_by('?').values_list('id', flat=True)[:7000]
        network.get_gcc(excluded_nodes=list(excluded_nodes))

from django.core.management.base import BaseCommand

from uvdat.core.models.networks import Network, NetworkNode


class Command(BaseCommand):
    help = 'asd.'

    def handle(self, **kwargs):
        network = Network.objects.get(id=15)
        excluded_nodes = NetworkNode.objects.order_by('?').values_list('id', flat=True)[:7000]
        network.get_gcc(excluded_nodes=list(excluded_nodes))

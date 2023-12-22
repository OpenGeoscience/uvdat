from django.core.management.base import BaseCommand

from sample_data.ingest_sample_road_network import load_roads


class Command(BaseCommand):
    requires_migrations_checks = True

    def handle(self, *args, **kwargs):
        print('Populating server with sample road network...')
        load_roads()

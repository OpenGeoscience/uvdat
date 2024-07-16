from django.core.management.base import BaseCommand

from uvdat.core.tasks.osmnx import load_roads


class Command(BaseCommand):
    requires_migrations_checks = True

    def add_arguments(self, parser):
        parser.add_argument(
            'city',
            action='store',
            type=str,
            help='Target city to fetch roads from (e.g. "Boston, MA")',
        )
        parser.add_argument('--context_id', nargs='?', type=int, const=1)

    def handle(self, *args, **kwargs):
        city = kwargs['city']
        context_id = kwargs['context_id']
        print(f'Populating context {context_id} with roads for {city}...')
        load_roads(context_id, city)

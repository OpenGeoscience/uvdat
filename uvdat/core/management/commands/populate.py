from django.core.management.base import BaseCommand
from sample_data.ingest_sample_data import ingest_charts, ingest_cities, ingest_datasets


class Command(BaseCommand):
    requires_migrations_checks = True

    def add_arguments(self, parser):
        parser.add_argument(
            "--include_large",
            action="store_true",
            help="Include conversion step for large datasets",
        )

    def handle(self, *args, **kwargs):
        print('Populating server with sample data...')
        ingest_cities()
        ingest_charts()
        ingest_datasets(include_large=kwargs['include_large'])

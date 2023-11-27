from django.core.management.base import BaseCommand

from sample_data.ingest_sample_data import ingest_charts, ingest_contexts, ingest_datasets


class Command(BaseCommand):
    requires_migrations_checks = True

    def add_arguments(self, parser):
        parser.add_argument(
            '--include_large',
            action='store_true',
            help='Include conversion step for large datasets',
        )
        parser.add_argument('--dataset_indexes', nargs='*', type=int)

    def handle(self, *args, **kwargs):
        print('Populating server with sample data...')
        include_large = kwargs['include_large']
        dataset_indexes = kwargs['dataset_indexes']
        if dataset_indexes is None or len(dataset_indexes) == 0:
            dataset_indexes = None

        ingest_datasets(
            include_large=include_large,
            dataset_indexes=dataset_indexes,
        )
        ingest_contexts()
        ingest_charts()

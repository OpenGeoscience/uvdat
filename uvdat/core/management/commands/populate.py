from django.core.management.base import BaseCommand

from sample_data.ingest_use_case import ingest_use_case


class Command(BaseCommand):
    requires_migrations_checks = True

    def add_arguments(self, parser):
        parser.add_argument(
            'use_case',
            choices=['boston_floods', 'new_york_energy', 'la_wildfires', 'test'],
            help='Sample data collection to load',
        )
        parser.add_argument(
            '--include_large',
            action='store_true',
            help='Include conversion step for large datasets',
        )
        parser.add_argument('--dataset_indexes', nargs='*', type=int)

    def handle(self, *args, **kwargs):
        use_case_name = kwargs['use_case']
        include_large = kwargs['include_large']
        dataset_indexes = kwargs['dataset_indexes']
        if dataset_indexes is None or len(dataset_indexes) == 0:
            dataset_indexes = None

        ingest_use_case(
            use_case_name,
            include_large=include_large,
            dataset_indexes=dataset_indexes,
        )

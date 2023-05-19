import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.core.files.base import ContentFile
from uvdat.core.models import City, Dataset
from uvdat.core.tasks import convert_raw_archive


class Command(BaseCommand):
    requires_migrations_checks = True

    def handle(self, *args, **kwargs):
        print('Clearing existing cities.')
        City.objects.all().delete()
        print('Creating new City objects...')
        with open("sample_data/cities.json") as cities_json:
            data = json.load(cities_json)
            for city in data:
                print('\t', city['name'])
                City.objects.create(
                    name=city['name'],
                    center=Point(
                        x=city['latitude'],
                        y=city['longitude'],
                    ),
                    default_zoom=city['default_zoom'],
                )
        print('Creating new Dataset objects...')
        with open("sample_data/datasets.json") as datasets_json:
            data = json.load(datasets_json)
            for dataset in data:
                print('\t', dataset['name'])
                new_dataset = Dataset.objects.create(
                    name=dataset['name'],
                    description=dataset['description'],
                    category=dataset['category'],
                    city=City.objects.get(name=dataset['city']),
                    raw_data_type=dataset['raw_data_type'],
                )
                archive_location = Path('sample_data', dataset['raw_data_archive'])
                with open(archive_location, 'rb') as archive:
                    new_dataset.raw_data_archive.save(archive_location, ContentFile(archive.read()))
                print('\t Starting conversion task...')
                # convert_raw_archive.delay(new_dataset.id)
                convert_raw_archive(new_dataset.id)

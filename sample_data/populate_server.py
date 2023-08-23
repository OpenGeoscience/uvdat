import json
from pathlib import Path

from django.contrib.gis.geos import Point
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
import requests

from uvdat.core.models import City, Dataset, Chart
from uvdat.core.tasks.conversion import convert_raw_data
from uvdat.core.tasks.charts import convert_chart_data


class Command(BaseCommand):
    requires_migrations_checks = True

    def handle(self, *args, **kwargs):
        print('Creating new City objects...')
        with open('sample_data/cities.json') as cities_json:
            data = json.load(cities_json)
            for city in data:
                print('\t', city['name'])
                existing = City.objects.filter(name=city['name'])
                if existing.count():
                    print('\t', 'already exists, deleting old copy.')
                    existing.delete()
                City.objects.create(
                    name=city['name'],
                    center=Point(
                        x=city['latitude'],
                        y=city['longitude'],
                    ),
                    default_zoom=city['default_zoom'],
                )

        print('Creating new Dataset objects...')
        with open('sample_data/datasets.json') as datasets_json:
            data = json.load(datasets_json)
            for dataset in data:
                print('\t', dataset['name'])
                existing = Dataset.objects.filter(name=dataset['name'])
                if existing.count():
                    print('\t', 'already exists, deleting old copy.')
                    existing.delete()

                new_dataset = Dataset.objects.create(
                    name=dataset['name'],
                    description=dataset['description'],
                    category=dataset['category'],
                    city=City.objects.get(name=dataset['city']),
                    raw_data_type=dataset['raw_data_type'],
                    metadata=dataset.get('metadata'),
                    style=dataset.get('style'),
                    network=dataset.get('network', False),
                )
                archive_location = Path('sample_data', dataset['path'])
                if not archive_location.exists():
                    print('\t Downloading data file.')
                    archive_location.parent.mkdir(parents=True, exist_ok=True)
                    with open(archive_location, 'wb') as archive:
                        r = requests.get(dataset['url'])
                        archive.write(r.content)
                with open(archive_location, 'rb') as archive:
                    new_dataset.raw_data_archive.save(archive_location, ContentFile(archive.read()))
                print('\t Starting conversion task.')
                convert_raw_data(new_dataset.id)
                print()

        print('Creating new Chart objects...')
        with open('sample_data/charts.json') as charts_json:
            data = json.load(charts_json)
            for chart in data:
                print('\t', chart['name'])
                existing = Chart.objects.filter(name=chart['name'])
                if existing.count():
                    print('\t', 'already exists, deleting old copy.')
                    existing.delete()

                new_chart = Chart.objects.create(
                    name=chart['name'],
                    description=chart['description'],
                    category=chart['category'],
                    city=City.objects.get(name=chart['city']),
                    raw_data_type=chart['raw_data_type'],
                    chart_options=chart.get('chart_options'),
                    metadata=chart.get('metadata'),
                    style=chart.get('style'),
                )
                file_location = Path('sample_data', chart['path'])
                if not file_location.exists():
                    print('\t Downloading data file.')
                    file_location.parent.mkdir(parents=True, exist_ok=True)
                    with open(file_location, 'wb') as f:
                        r = requests.get(chart['url'])
                        f.write(r.content)
                with open(file_location, 'rb') as f:
                    new_chart.raw_data_file.save(file_location, ContentFile(f.read()))
                print('\t Starting conversion task.')
                convert_chart_data(new_chart)
                print()

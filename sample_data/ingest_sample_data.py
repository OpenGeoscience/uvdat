import json
import os
from pathlib import Path
from datetime import datetime

from django.contrib.gis.geos import Point
from django.core.files.base import ContentFile
import requests

from uvdat.core.models import Chart, Context, Dataset, FileItem


def ingest_file(file_info, index=0, dataset=None, chart=None):
    file_path = file_info.get('path')
    file_name = file_info.get('name', file_path.split('/')[-1])
    file_url = file_info.get('url')
    file_metadata = file_info.get('metadata', {})

    file_location = Path('sample_data', file_path)
    file_type = file_path.split('.')[-1]
    if not file_location.exists():
        print(f'\t Downloading data file {file_name}.')
        file_location.parent.mkdir(parents=True, exist_ok=True)
        with open(file_location, 'wb') as f:
            r = requests.get(file_url)
            f.write(r.content)

    existing = FileItem.objects.filter(name=file_name)
    if existing.count():
        print('\t', f'FileItem {file_name} already exists.')
    else:
        new_file_item = FileItem.objects.create(
            name=file_name,
            dataset=dataset,
            chart=chart,
            file_type=file_type,
            file_size=os.path.getsize(file_location),
            metadata=dict(
                **file_metadata,
                uploaded=str(datetime.now()),
            ),
            index=index,
        )
        with file_location.open('rb') as f:
            new_file_item.file.save(file_path, ContentFile(f.read()))


def ingest_contexts():
    print('Creating Context objects...')
    with open('sample_data/contexts.json') as contexts_json:
        data = json.load(contexts_json)
        for context in data:
            print('\t- ', context['name'])
            existing = Context.objects.filter(name=context['name'])
            if existing.count():
                context_for_setting = existing.first()
            else:
                context_for_setting = Context.objects.create(
                    name=context['name'],
                    default_map_center=Point(*context['default_map_center']),
                    default_map_zoom=context['default_map_zoom'],
                )

            context_for_setting.datasets.set(Dataset.objects.filter(name__in=context['datasets']))


def ingest_charts():
    print('Creating Chart objects...')
    with open('sample_data/charts.json') as charts_json:
        data = json.load(charts_json)
        for chart in data:
            print('\t- ', chart['name'])
            existing = Chart.objects.filter(name=chart['name'])
            if existing.count():
                chart_for_conversion = existing.first()
            else:
                new_chart = Chart.objects.create(
                    name=chart['name'],
                    description=chart['description'],
                    context=Context.objects.get(name=chart['context']),
                    chart_options=chart.get('chart_options'),
                    metadata=chart.get('metadata'),
                    editable=chart.get('editable', False),
                )
                for index, file_info in enumerate(chart.get('files', [])):
                    ingest_file(
                        file_info,
                        index=index,
                        chart=new_chart,
                    )
                chart_for_conversion = new_chart

            print('\t', f'Converting data for {chart_for_conversion.name}...')
            chart_for_conversion.spawn_conversion_task(
                conversion_options=chart.get('conversion_options'),
                asynchronous=False,
            )


def ingest_datasets(include_large=False):
    print('Creating Dataset objects...')
    with open('sample_data/datasets.json') as datasets_json:
        data = json.load(datasets_json)
        for dataset in data:
            print('\t- ', dataset['name'])
            existing = Dataset.objects.filter(name=dataset['name'])
            if existing.count():
                dataset_for_conversion = existing.first()
            else:
                new_dataset = Dataset.objects.create(
                    name=dataset['name'],
                    description=dataset['description'],
                    category=dataset['category'],
                    dataset_type=dataset.get('type', 'vector').upper(),
                    metadata=dataset.get('metadata', {}),
                )
                for index, file_info in enumerate(dataset.get('files', [])):
                    ingest_file(
                        file_info,
                        index=index,
                        dataset=new_dataset,
                    )
                dataset_for_conversion = new_dataset

            dataset_size_mb = dataset_for_conversion.get_size() >> 20
            if include_large or dataset_size_mb < 50:
                print('\t', f'Converting data for {dataset_for_conversion.name}...')
                dataset_for_conversion.spawn_conversion_task(
                    style_options=dataset.get('style_options'),
                    network_options=dataset.get('network_options'),
                    region_options=dataset.get('region_options'),
                    asynchronous=False,
                )
            else:
                print('\t', f'Dataset too large ({dataset_size_mb} MB); skipping conversion step.')
                print('\t', 'Use `--include_large` to include conversions for large datasets.')

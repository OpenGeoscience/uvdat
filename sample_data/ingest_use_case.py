from datetime import datetime
import importlib
import json
import os
from pathlib import Path

from django.contrib.auth.models import User
from django.contrib.gis.geos import Point
from django.core.files.base import ContentFile
import requests

from uvdat.core.models import Chart, Project, Dataset, FileItem

from .use_cases.boston_floods import ingest as boston_floods_ingest
from .use_cases.new_york_energy import ingest as new_york_energy_ingest


USE_CASE_FOLDER = Path('sample_data/use_cases')
DOWNLOADS_FOLDER = Path('sample_data/downloads')


def ingest_file(file_info, index=0, dataset=None, chart=None):
    file_path = file_info.get('path')
    file_name = file_info.get('name', file_path.split('/')[-1])
    file_url = file_info.get('url')
    file_metadata = file_info.get('metadata', {})

    file_location = Path(DOWNLOADS_FOLDER, file_path)
    file_type = file_path.split('.')[-1]
    if not file_location.exists():
        print(f'\t Downloading data file {file_name}.')
        file_location.parent.mkdir(parents=True, exist_ok=True)
        with open(file_location, 'wb') as f:
            r = requests.get(file_url)
            r.raise_for_status()
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
        print('\t', f'FileItem {new_file_item.name} created.')
        with file_location.open('rb') as f:
            new_file_item.file.save(file_path, ContentFile(f.read()))


def ingest_projects(use_case):
    project_file_path = USE_CASE_FOLDER / use_case / 'projects.json'
    if not project_file_path.exists():
        return

    print('Creating Project objects...')
    with open(project_file_path) as projects_json:
        data = json.load(projects_json)
        for project in data:
            print('\t- ', project['name'])
            project_for_setting, created = Project.objects.get_or_create(
                name=project['name'],
                defaults={
                    'default_map_center': Point(*project['default_map_center']),
                    'default_map_zoom': project['default_map_zoom'],
                },
            )
            if created:
                print('\t', f'Project {project_for_setting.name} created.')

            project_for_setting.datasets.set(Dataset.objects.filter(name__in=project['datasets']))
            project_for_setting.set_permissions(owner=User.objects.filter(is_superuser=True).first())


def ingest_charts(use_case):
    chart_file_path = USE_CASE_FOLDER / use_case / 'charts.json'
    if chart_file_path.exists():
        print('Creating Chart objects...')
        with open(chart_file_path) as charts_json:
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
                        project=Project.objects.get(name=chart['project']),
                        chart_options=chart.get('chart_options'),
                        metadata=chart.get('metadata'),
                        editable=chart.get('editable', False),
                    )
                    print('\t', f'Chart {new_chart.name} created.')
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


def ingest_datasets(use_case, include_large=False, dataset_indexes=None):
    dataset_file_path = USE_CASE_FOLDER / use_case / 'datasets.json'
    if dataset_file_path.exists():
        print('Creating Dataset objects...')
        with open(dataset_file_path) as datasets_json:
            data = json.load(datasets_json)
            for index, dataset in enumerate(data):
                if dataset_indexes is None or index in dataset_indexes:
                    existing = Dataset.objects.filter(name=dataset['name'])
                    if existing.count():
                        dataset_for_conversion = existing.first()
                    else:
                        # Create dataset
                        new_dataset = Dataset.objects.create(
                            name=dataset['name'],
                            description=dataset['description'],
                            category=dataset['category'],
                            dataset_type=dataset.get('type', 'vector').upper(),
                            metadata=dataset.get('metadata', {}),
                        )
                        print('\t', f'Dataset {new_dataset.name} created.')
                        for index, file_info in enumerate(dataset.get('files', [])):
                            ingest_file(
                                file_info,
                                index=index,
                                dataset=new_dataset,
                            )
                        dataset_for_conversion = new_dataset

                    dataset_size_mb = dataset_for_conversion.get_size() >> 20
                    if include_large or dataset_size_mb < 50:
                        if use_case in ['boston_floods', 'curbs_aid']:
                            boston_floods_ingest.convert_dataset(dataset_for_conversion, dataset)
                        elif use_case == 'new_york_energy':
                            new_york_energy_ingest.convert_dataset(dataset_for_conversion, dataset)
                    else:
                        print(
                            '\t', f'Dataset too large ({dataset_size_mb} MB); skipping conversion step.'
                        )
                        print('\t', 'Use `--include_large` to include conversions for large datasets.')



def ingest_use_case(use_case_name, include_large=False, dataset_indexes=None):
    print(f'Populating server with data for use case {use_case_name}...')
    ingest_datasets(
        use_case=use_case_name,
        include_large=include_large,
        dataset_indexes=dataset_indexes,
    )
    ingest_projects(use_case=use_case_name)
    ingest_charts(use_case=use_case_name)

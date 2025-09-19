from datetime import datetime
import os
from pathlib import Path
import tempfile
from urllib.request import urlretrieve

from celery import shared_task
from django.core.files.base import ContentFile

from uvdat.core.models import Chart, Dataset, FileItem, TaskResult

from .analysis_type import AnalysisType

HYETOGRAPHS = [
    dict(label='Parabolic', value='parabolic'),
    dict(label='NCRS Type II', value='type2'),
]

LIKELIHOODS = [
    dict(label='1 in 25 year (4% chance)', value=0.04),
    dict(label='1 in 100 year (1% chance)', value=0.01),
]

TIME_PERIODS = [
    dict(label='2030-2050', value=[2030, 2050]),
    dict(label='2080-2100', value=[2080, 2100]),
]

DATA_PRODUCTS = [
    dict(
        url='https://data.kitware.com/api/v1/item/67e4061f3e5f3e5e96b9753d/download',
        precipitation='parabolic',
        likelihood=0.04,
        time_period=[2030, 2050],
    ),
    dict(
        url='https://data.kitware.com/api/v1/item/67e408513e5f3e5e96b97544/download',
        precipitation='type2',
        likelihood=0.04,
        time_period=[2030, 2050],
    ),
    dict(
        url='https://data.kitware.com/api/v1/item/67e40d693e5f3e5e96b97547/download',
        precipitation='parabolic',
        likelihood=0.01,
        time_period=[2030, 2050],
    ),
    dict(
        url='https://data.kitware.com/api/v1/item/67e40f4e3e5f3e5e96b9754a/download',
        precipitation='type2',
        likelihood=0.01,
        time_period=[2030, 2050],
    ),
    dict(
        url='https://data.kitware.com/api/v1/item/67d875e5429cb34d95af01a4/download',
        precipitation='parabolic',
        likelihood=0.04,
        time_period=[2080, 2100],
    ),
    dict(
        url='https://data.kitware.com/api/v1/item/67d87697429cb34d95af01a7/download',
        precipitation='type2',
        likelihood=0.04,
        time_period=[2080, 2100],
    ),
    dict(
        url='https://data.kitware.com/api/v1/item/67d8773c429cb34d95af01ab/download',
        precipitation='parabolic',
        likelihood=0.01,
        time_period=[2080, 2100],
    ),
    dict(
        url='https://data.kitware.com/api/v1/item/67d87868429cb34d95af01ae/download',
        precipitation='type2',
        likelihood=0.01,
        time_period=[2080, 2100],
    ),
]


class FloodSimulation(AnalysisType):
    def __init__(self):
        super().__init__(self)
        self.name = 'Flood Simulation'
        self.description = (
            'Select a precipitation model, likelihood, and time period to simulate a flood event.'
        )
        self.db_value = 'flood_simulation'
        self.input_types = {
            'precipitation': 'Chart',
            'likelihood': 'string',
            'time_period': 'string',
        }
        self.output_types = {'flood': 'Dataset'}
        self.attribution = 'Northeastern University'

    def get_input_options(self):
        return {
            'precipitation': Chart.objects.filter(name__icontains='hyetograph'),
            'likelihood': [likelihood.get('label') for likelihood in LIKELIHOODS],
            'time_period': [period.get('label') for period in TIME_PERIODS],
        }

    def run_task(self, project, **inputs):
        result = TaskResult.objects.create(
            name='Flood Simulation',
            task_type=self.db_value,
            inputs=inputs,
            project=project,
            status='Initializing task...',
        )
        flood_simulation.delay(result.id)
        return result


@shared_task
def flood_simulation(result_id):
    result = TaskResult.objects.get(id=result_id)

    try:
        # Verify inputs
        chart = None
        hyetograph = None
        chart_id = result.inputs.get('precipitation')
        if chart_id is None:
            result.write_error('Precipitation hyetograph chart not provided')
        else:
            try:
                chart = Chart.objects.get(id=chart_id)
            except Chart.DoesNotExist:
                result.write_error('Precipitation hyetograph chart not found')
        if chart is not None:
            hyetograph = next(
                iter(
                    hyeto
                    for hyeto in HYETOGRAPHS
                    if hyeto.get('label') == chart.metadata.get('precipitation_model')
                ),
                None,
            )
        if hyetograph is None:
            result.write_error('Hyetograph selection not valid')

        likelihood = next(
            iter(lik for lik in LIKELIHOODS if lik.get('label') == result.inputs.get('likelihood')),
            None,
        )
        if likelihood is None:
            result.write_error('Likelihood selection not valid')

        period = next(
            iter(tp for tp in TIME_PERIODS if tp.get('label') == result.inputs.get('time_period')),
            None,
        )
        if period is None:
            result.write_error('Time period selection not valid')

        data_product = None
        if hyetograph is not None:
            data_product = next(
                iter(
                    dp
                    for dp in DATA_PRODUCTS
                    if dp.get('precipitation') == hyetograph.get('value')
                    and dp.get('likelihood') == likelihood.get('value')
                    and dp.get('time_period') == period.get('value')
                ),
                None,
            )
        if data_product is None:
            result.write_error('Data product not found')

        # Run task
        if result.error is None:

            # Update name
            result.name = (
                f'{hyetograph["label"].title()} {likelihood["value"] * 100}% '
                f'Chance flood for {period["label"]}'
            )
            result.save()

            result.write_status('Downloading pregenerated data product as zip file...')

            folder = Path(tempfile.gettempdir(), 'flood_data_products')
            folder.mkdir(exist_ok=True, parents=True)
            file_name = (
                f'{hyetograph.get("value")}_{likelihood.get("value")}'
                f'_{period.get("label")}_flood.zip'
            )
            zip_path = Path(folder, file_name)
            if not zip_path.exists():
                urlretrieve(data_product.get('url'), zip_path)

            dataset_name = hyetograph.get('label') + ' ' + likelihood.get('label')
            dataset_name += ' Flood Simulation for ' + period.get('label')
            dataset, created = Dataset.objects.get_or_create(
                name=dataset_name,
                description='Generated by Flood Simulation Analysis Task',
                category='flood',
                metadata=dict(
                    attribution=(
                        'Simulated by August Posch and Jack Watson at Northeastern University'
                    ),
                    likelihood=likelihood.get('label'),
                    downscaling=dict(
                        climate_model='CESM2-LENS',
                        ensemble_member='r1i1p1f1',
                        emissions_scenario=370,
                        method='LOCA (Localized Constructed Analogs) to daily 1/16 degree',
                        time_period=period.get('label'),
                        return_period='100 years',
                    ),
                    precipitation=dict(
                        hyetograph=hyetograph.get('label'),
                        spatially_uniform=True,
                        dem_resolution='1/3 arcsecond = 10 m',
                    ),
                ),
            )
            if created:
                file_item = FileItem.objects.create(
                    name=file_name,
                    dataset=dataset,
                    file_type='zip',
                    file_size=os.path.getsize(zip_path),
                    metadata=dict(
                        **dataset.metadata,
                        uploaded=datetime.now().strftime('%m/%d/%Y %H:%M:%S'),
                    ),
                )
                with zip_path.open('rb') as f:
                    file_item.file.save(zip_path, ContentFile(f.read()))

                result.write_status('Interpreting data in zip file...')
                dataset.spawn_conversion_task(
                    layer_options=[
                        dict(name='Flood Simulation', source_file=zip_path.name),
                    ],
                    network_options=None,
                    region_options=None,
                    asynchronous=False,
                )

            result.outputs = dict(flood=dataset.id)
    except Exception as e:
        result.error = str(e)
    result.complete()

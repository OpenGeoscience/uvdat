from datetime import datetime
import os
from pathlib import Path
import subprocess
import tempfile

from celery import shared_task
from django.core.files.base import ContentFile

from uvdat.core.models import Chart, Dataset, FileItem, TaskResult

from .analysis_type import AnalysisType

MODULE_REPOSITORY = 'https://github.com/OpenGeoscience/uvdat-flood-sim.git'
MODULE_PATH = Path('/analytics/modules/uvdat-flood-sim')
VENV_PATH = Path('/venvs/flood_simulation')


class FloodSimulation(AnalysisType):
    def __init__(self):
        super().__init__(self)
        self.name = 'Flood Simulation'
        self.description = 'Select parameters to simulate a 24-hour flood of the Charles River'
        self.db_value = 'flood_simulation'
        self.input_types = {
            'time_period': 'string',
            'hydrograph': 'Chart',
            'potential_evapotranspiration_percentile': 'number',
            'soil_moisture_percentile': 'number',
            'ground_water_percentile': 'number',
            'annual_probability': 'number',
        }
        self.output_types = {'flood': 'Dataset'}
        self.attribution = 'Northeastern University'

    def get_input_options(self):
        return {
            'time_period': ['2030-2050'],
            'hydrograph': Chart.objects.filter(name__icontains='hydrograph'),
            'potential_evapotranspiration_percentile': [25, 50, 75, 90],
            'soil_moisture_percentile': [25, 50, 75, 90],
            'ground_water_percentile': [25, 50, 75, 90],
            'annual_probability': [dict(min=0, max=1, step=0.05)],
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


def run_command(cmd, cwd):
    print(f'Running command {cmd} in {cwd}.')
    process = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    (out, err) = process.communicate()
    print(out, err)
    if err:
        raise Exception(err)


def pull_module():
    MODULE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not MODULE_PATH.exists():
        run_command(
            ['git', 'clone', MODULE_REPOSITORY],
            MODULE_PATH.parent,
        )
    run_command(['git', 'pull'], MODULE_PATH)


def install_module_dependencies():
    VENV_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not VENV_PATH.exists():
        run_command(['python', '-m', 'venv', VENV_PATH], MODULE_PATH)
    run_command(
        [VENV_PATH / 'bin' / 'python', '-m', 'pip', 'install', '--upgrade', 'pip'],
        MODULE_PATH,
    )
    run_command(
        [VENV_PATH / 'bin' / 'python', '-m', 'pip', 'install', '-r', 'requirements.txt'],
        MODULE_PATH,
    )


@shared_task
def flood_simulation(result_id):
    result = TaskResult.objects.get(id=result_id)

    try:
        result.write_status(
            'Ensuring that flood simulation module code and dependencies are up to date'
        )
        pull_module()
        install_module_dependencies()

        result.write_status('Interpreting input values')
        time_period = result.inputs.get('time_period')
        hydrograph_id = result.inputs.get('hydrograph')
        hydrograph_chart = Chart.objects.get(id=hydrograph_id)
        hydrograph = hydrograph_chart.chart_data.get('datasets')[0].get('data')
        pet_percentile = result.inputs.get('potential_evapotranspiration_percentile')
        sm_percentile = result.inputs.get('soil_moisture_percentile')
        gw_percentile = result.inputs.get('ground_water_percentile')
        annual_probability = result.inputs.get('annual_probability')

        name = (
            f'{time_period} {annual_probability} Flood Simulation '
            f'with {hydrograph_chart.name} and '
            f'percentiles {pet_percentile}, {sm_percentile}, {gw_percentile}'
        )
        result.name = name
        result.write_status('Running flood simulation module with specified inputs')
        output_path = Path(tempfile.gettempdir(), 'flood_simulation.tif')

        run_command(
            [
                VENV_PATH / 'bin' / 'python',
                'main.py',
                '--time_period',
                time_period,
                '--hydrograph',
                *[str(v) for v in hydrograph],
                '--pet_percentile',
                str(pet_percentile),
                '--sm_percentile',
                str(sm_percentile),
                '--gw_percentile',
                str(gw_percentile),
                '--annual_probability',
                str(annual_probability),
                '--output_path',
                output_path,
                '--no_animation',
            ],
            MODULE_PATH,
        )

        result.write_status('Saving result to database')
        if output_path.exists():
            metadata = dict(
                attribution='Simulation code by August Posch at Northeastern University',
                simulation_steps=[
                    'downscaling_prediction',
                    'hydrological_prediction',
                    'hydrodynamic_prediction',
                ],
                module_repository=MODULE_REPOSITORY,
                inputs=dict(
                    time_period=time_period,
                    hydrograph=hydrograph,
                    pet_percentile=pet_percentile,
                    sm_percentile=sm_percentile,
                    gw_percentile=gw_percentile,
                    annual_probability=annual_probability,
                ),
                uploaded=datetime.now().strftime('%m/%d/%Y %H:%M:%S'),
            )
            name_match = Dataset.objects.filter(name=name)
            if name_match.count() > 0:
                name += f' ({name_match.count() + 1})'
            dataset = Dataset.objects.create(
                name=name,
                description='Generated by Flood Simulation Analytics Task',
                category='flood',
                metadata=metadata,
            )
            file_item = FileItem.objects.create(
                name=output_path.name,
                dataset=dataset,
                file_type='tif',
                file_size=os.path.getsize(output_path),
                metadata=metadata,
            )
            with output_path.open('rb') as f:
                file_item.file.save(output_path.name, ContentFile(f.read()))
            dataset.spawn_conversion_task(
                layer_options=[
                    dict(
                        name='Flood Simulation',
                        source_files=[output_path.name],
                        frame_property='frame',
                    ),
                ],
                network_options=None,
                region_options=None,
                asynchronous=False,
            )

            result.outputs = dict(flood=dataset.id)
    except Exception as e:
        result.error = str(e)
    result.complete()

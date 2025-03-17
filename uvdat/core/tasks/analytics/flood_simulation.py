from celery import shared_task

from uvdat.core.models import AnalysisResult, Chart

from .analysis_type import AnalysisType

LIKELIHOODS = [
    dict(label='1 in 25 year (4%% chance)', value='0.04'),
    dict(label='1 in 100 year (1%% chance)', value='0.01'),
]

TIME_PERIODS = [
    dict(label='2030-2050', value=[2030, 2050]),
    dict(label='2080-2100', value=[2080, 2100]),
]


class FloodSimulation(AnalysisType):
    def __init__(self):
        super().__init__(self)
        self.name = 'Flood Simulation'
        self.description = (
            'Select a precipitation model, likelihood, and time period to simulate a flood event.'
        )
        self.db_value = 'flood_simulation'
        self.output_types = {'flood': 'dataset'}
        self.attribution = 'Northeastern University'

    def get_input_options(self):
        return {
            'precipitation': Chart.objects.filter(name__icontains='hyetograph'),
            'likelihood': [likelihood.get('label') for likelihood in LIKELIHOODS],
            'time_period': [period.get('label') for period in TIME_PERIODS],
        }

    def run_task(self, project, **inputs):
        result = AnalysisResult.objects.create(
            analysis_type=self.db_value,
            inputs=inputs,
            project=project,
            status='Initializing task...',
        )
        flood_simulation.delay(result.id)
        return result


@shared_task
def flood_simulation(result_id):
    result = AnalysisResult.objects.get(id=result_id)

    # Verify inputs
    hyetograph = None
    hyetograph_id = result.inputs.get('precipitation')
    if hyetograph_id is None:
        result.write_error('Precipitation hyetograph chart not provided')
    else:
        try:
            hyetograph = Chart.objects.get(id=hyetograph_id)
        except Chart.DoesNotExist:
            result.write_error('Precipitation hyetograph chart not found')

    likelihood = next(
        iter(
            lik.get('value')
            for lik in LIKELIHOODS
            if lik.get('label') == result.inputs.get('likelihood')
        ),
        None,
    )
    if likelihood is None:
        result.write_error('Likelihood selection not valid')

    period = next(
        iter(
            tp.get('value')
            for tp in TIME_PERIODS
            if tp.get('label') == result.inputs.get('time_period')
        ),
        None,
    )
    if period is None:
        result.write_error('Time period selection not valid')

    if result.error is None:
        result.write_status(f'Ready to run with inputs {hyetograph=} {likelihood=} {period=}')

    result.complete()

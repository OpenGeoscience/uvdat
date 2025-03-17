from celery import shared_task

from uvdat.core.models import AnalysisResult, Network

from .analysis_type import AnalysisType
from .flood_simulation import FloodSimulation


class FloodNetworkFailure(AnalysisType):
    def __init__(self):
        super().__init__(self)
        self.name = 'Flood Network Failure'
        self.description = (
            'Select an urban network and flood simulation result '
            'to determine network failures during the flood event.'
        )
        self.db_value = 'flood_network_failure'
        self.output_types = {'failure': 'network_animation'}
        self.attribution = 'Northeastern University & Kitware, Inc.'

    def get_input_options(self):
        return {
            'network': Network.objects.all(),
            'flood_simulation': AnalysisResult.objects.filter(
                analysis_type=FloodSimulation().db_value
            ),
            'depth_tolerance_meters': 'number',
            'station_radius_meters': 'number',
        }

    def run_task(self, project, **inputs):
        result = AnalysisResult.objects.create(
            analysis_type=self.db_value,
            inputs=inputs,
            project=project,
            status='Initializing task...',
        )
        flood_network_failure.delay(result.id)
        return result


@shared_task
def flood_network_failure(result_id):
    result = AnalysisResult.objects.get(id=result_id)

    # Verify inputs
    network = None
    network_id = result.inputs.get('network')
    if network_id is None:
        result.write_error('Network not provided')
    else:
        try:
            network = Network.objects.get(id=network_id)
        except Network.DoesNotExist:
            result.write_error('Network not found')

    flood_sim = None
    flood_sim_id = result.inputs.get('flood_simulation')
    if flood_sim_id is None:
        result.write_error('Flood simulation not provided')
    else:
        try:
            flood_sim = AnalysisResult.objects.get(id=flood_sim_id)
        except AnalysisResult.DoesNotExist:
            result.write_error('Flood simulation not found')

    tolerance = result.inputs.get('depth_tolerance_meters')
    if tolerance is None:
        result.write_error('Depth tolerance not provided')
    else:
        try:
            tolerance = float(tolerance)
        except ValueError:
            result.write_error('Depth tolerance not valid')

    radius = result.inputs.get('station_radius_meters')
    if radius is None:
        result.write_error('Station radius not provided')
    else:
        try:
            radius = float(radius)
        except ValueError:
            result.write_error('Station radius not valid')

    if result.error is None:
        result.write_status(
            f'Ready to run with inputs {network=} {flood_sim=} {tolerance=} {radius=}'
        )

    result.complete()

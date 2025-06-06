import math

from celery import shared_task
from django_large_image import tilesource, utilities
import numpy

from uvdat.core.models import AnalysisResult, Layer, Network

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
        self.input_types = {
            'network': 'Network',
            'flood_simulation': 'AnalysisResult',
            'depth_tolerance_meters': 'number',
            'station_radius_meters': 'number',
        }
        self.output_types = {'failures': 'network_animation'}
        self.attribution = 'Northeastern University & Kitware, Inc.'

    def get_input_options(self):
        return {
            'network': Network.objects.all(),
            'flood_simulation': AnalysisResult.objects.filter(
                analysis_type=FloodSimulation().db_value
            ),
            'depth_tolerance_meters': [0.1, 0.5, 1, 2, 3],
            'station_radius_meters': [10, 15, 20, 25, 30, 35, 40, 45, 50],
        }

    def run_task(self, project, **inputs):
        result = AnalysisResult.objects.create(
            name='Flood Network Failure',
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

    try:
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
            if tolerance <= 0:
                result.write_error('Depth tolerance must be greater than 0')

        radius_meters = result.inputs.get('station_radius_meters')
        if radius_meters is None:
            result.write_error('Station radius not provided')
        else:
            try:
                radius_meters = float(radius_meters)
            except ValueError:
                result.write_error('Station radius not valid')
            if radius_meters < 10:
                # data is at 10 meter resolution
                result.write_error('Station radius must be greater than 10')

        # Run task
        if result.error is None:

            # Update name
            result.name = (
                f'Failures for Network {network.id} with Flood Result {flood_sim.id}, '
                f'{tolerance} Tolerance, {radius_meters} Radius'
            )
            result.save()

            node_failures = {}
            flood_dataset_id = flood_sim.outputs.get('flood')
            flood_layer = Layer.objects.get(dataset__id=flood_dataset_id)

            # this uses radius_meters to get a rectangular region, not a circular one
            def get_station_region(point):
                earth_radius_meters = 6378000
                lat_delta = (radius_meters / earth_radius_meters) * (180 / math.pi)
                lon_delta = (
                    (radius_meters / earth_radius_meters)
                    * (180 / math.pi)
                    / math.cos(point.y * math.pi / 180)
                )
                return dict(
                    top=point.y + lat_delta,
                    bottom=point.y - lat_delta,
                    left=point.x - lon_delta,
                    right=point.x + lon_delta,
                    units='EPSG:4326',
                )

            for frame in flood_layer.frames.all():
                n_nodes = network.nodes.count()
                result.write_status(
                    f'Evaluating flood levels at {n_nodes} nodes for frame {frame.index}...'
                )
                raster_path = utilities.field_file_to_local_path(
                    frame.raster.cloud_optimized_geotiff
                )
                source = tilesource.get_tilesource_from_path(raster_path)

                node_failures[frame.index] = []
                for node in network.nodes.all():
                    region = get_station_region(node.location)
                    region_data, _ = source.getRegion(region=region, format='numpy')
                    water_heights = numpy.take(region_data, 0, axis=2)
                    if numpy.any(numpy.where(water_heights > tolerance)):
                        node_failures[frame.index].append(node.id)

            result.outputs = dict(failures=node_failures)
    except Exception as e:
        result.error = str(e)
    result.complete()

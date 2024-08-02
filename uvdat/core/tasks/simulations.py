from pathlib import Path
import random
import tempfile

from celery import shared_task
from django_large_image import tilesource
import large_image
import shapely

from uvdat.core.tasks.networks import NODE_RECOVERY_MODES, get_network_graph, sort_graph_centrality


def get_network_node_elevations(network_nodes, elevation_data):
    with tempfile.TemporaryDirectory() as tmp:
        raster_path = Path(tmp, 'raster')
        with open(raster_path, 'wb') as raster_file:
            raster_file.write(elevation_data.cloud_optimized_geotiff.read())
        source = large_image.open(raster_path)
        data, data_format = source.getRegion(format='numpy')
        data = data[:, :, 0]
        metadata = tilesource.get_metadata(source)
        source_bounds = metadata.get('bounds')

        elevations = {}
        for network_node in network_nodes:
            # same logic as client-side tooltip
            location = network_node.location
            x_proportion = (location[0] - source_bounds.get('xmin')) / (
                source_bounds.get('xmax') - source_bounds.get('xmin')
            )
            y_proportion = (location[1] - source_bounds.get('ymin')) / (
                source_bounds.get('ymax') - source_bounds.get('ymin')
            )
            x_index = int(x_proportion * len(data[0]))
            y_index = int(y_proportion * len(data))
            elevations[network_node.id] = data[y_index, x_index]
        return elevations


@shared_task
def flood_scenario_1(simulation_result_id, network, elevation_data, flood_area):
    from uvdat.core.models import Network, RasterMapLayer, SimulationResult, VectorMapLayer

    result = SimulationResult.objects.get(id=simulation_result_id)
    try:
        network = Network.objects.get(id=network)
        elevation_data = RasterMapLayer.objects.get(id=elevation_data)
        flood_area = VectorMapLayer.objects.get(id=flood_area)
    except Exception:
        result.error_message = 'Object not found.'
        result.save()
        return

    if (
        network.nodes.count() < 1
        or elevation_data.dataset.category != 'elevation'
        or flood_area.dataset.category != 'flood'
    ):
        result.error_message = 'Invalid dataset selected.'
        result.save()
        return

    node_failures = []
    network_nodes = network.nodes.all()
    flood_geodata = flood_area.read_geojson_data()
    flood_areas = [
        shapely.geometry.shape(feature['geometry']) for feature in flood_geodata['features']
    ]
    for network_node in network_nodes:
        node_point = shapely.geometry.Point(*network_node.location)
        if any(flood_area.contains(node_point) for flood_area in flood_areas):
            node_failures.append(network_node)

    node_elevations = get_network_node_elevations(network_nodes, elevation_data)
    node_failures.sort(key=lambda n: node_elevations[n.id])

    result.output_data = {'node_failures': [n.id for n in node_failures]}
    result.save()


@shared_task
def recovery_scenario(simulation_result_id, node_failure_simulation_result, recovery_mode):
    from uvdat.core.models import Network, SimulationResult

    result = SimulationResult.objects.get(id=simulation_result_id)
    try:
        node_failure_simulation_result = SimulationResult.objects.get(
            id=node_failure_simulation_result
        )
    except SimulationResult.DoesNotExist:
        result.error_message = 'Node failure simulation result not found.'
        result.save()
        return
    if recovery_mode not in NODE_RECOVERY_MODES:
        result.error_message = f'Invalid recovery mode {recovery_mode}.'
        result.save()
        return

    node_failures = node_failure_simulation_result.output_data['node_failures']
    node_recoveries = node_failures.copy()
    if recovery_mode == 'random':
        random.shuffle(node_recoveries)
    else:
        network_id = node_failure_simulation_result.input_args['network']
        try:
            network = Network.objects.get(id=network_id)
        except Network.DoesNotExist:
            result.error_message = 'Network not found.'
            result.save()
            return
        graph = get_network_graph(network)
        nodes_sorted, edge_list = sort_graph_centrality(graph, recovery_mode)
        node_recoveries.sort(key=lambda n: nodes_sorted.index(n))

    result.output_data = {
        'node_failures': node_failures,
        'node_recoveries': node_recoveries,
    }
    result.save()

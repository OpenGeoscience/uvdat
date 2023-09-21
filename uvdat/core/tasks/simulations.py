import json
from pathlib import Path
import re
import tempfile

from celery import shared_task
from django_large_image import tilesource
import large_image
import shapely

from uvdat.core.models import City, Dataset, SimulationResult
from uvdat.core.serializers import DatasetSerializer, SimulationResultSerializer


def get_network_node_elevations(network_nodes, elevation_dataset):
    with tempfile.TemporaryDirectory() as tmp:
        raster_path = Path(tmp, 'raster')
        with open(raster_path, 'wb') as raster_file:
            raster_file.write(elevation_dataset.raster_file.read())
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
def flood_scenario_1(simulation_result_id, network_dataset, elevation_dataset, flood_dataset):
    result = SimulationResult.objects.get(id=simulation_result_id)
    try:
        network_dataset = Dataset.objects.get(id=network_dataset)
        elevation_dataset = Dataset.objects.get(id=elevation_dataset)
        flood_dataset = Dataset.objects.get(id=flood_dataset)
    except Dataset.DoesNotExist:
        result.error_message = 'Dataset not found.'
        result.save()
        return None

    if (
        not network_dataset.network
        or elevation_dataset.category != 'elevation'
        or flood_dataset.category != 'flood'
    ):
        result.error_message = 'Invalid dataset selected.'
        result.save()
        return None

    disabled_nodes = []
    network_nodes = network_dataset.network_nodes.all()
    flood_geodata = json.loads(flood_dataset.geodata_file.open().read().decode())
    flood_areas = [
        shapely.geometry.shape(feature['geometry']) for feature in flood_geodata['features']
    ]
    for network_node in network_nodes:
        node_point = shapely.geometry.Point(*network_node.location)
        if any(flood_area.contains(node_point) for flood_area in flood_areas):
            disabled_nodes.append(network_node)

    node_elevations = get_network_node_elevations(network_nodes, elevation_dataset)
    disabled_nodes.sort(key=lambda n: node_elevations[n.id])

    result.output_data = [n.id for n in disabled_nodes]
    result.save()


AVAILABLE_SIMULATIONS = [
    {
        'id': 1,
        'name': 'Flood Scenario 1',
        'description': '''
            Provide a network dataset, elevation dataset, and flood dataset
            to determine which network nodes go out of service
            when the target flood occurs.
        ''',
        'output_type': 'node_failure_animation',
        'func': flood_scenario_1,
        'args': [
            {
                'name': 'network_dataset',
                'type': Dataset,
                'options_query': {'network': True},
            },
            {
                'name': 'elevation_dataset',
                'type': Dataset,
                'options_query': {'category': 'elevation'},
            },
            {
                'name': 'flood_dataset',
                'type': Dataset,
                'options_query': {'category': 'flood'},
            },
        ],
    }
]


def get_available_simulations(city_id: int):
    sims = []
    for available in AVAILABLE_SIMULATIONS:
        available = available.copy()
        available['description'] = re.sub(r'\n\s+', ' ', available['description'])
        available['args'] = [
            {
                'name': a['name'],
                'options': list(
                    DatasetSerializer(d).data
                    for d in a['type']
                    .objects.filter(
                        city__id=city_id,
                        **a['options_query'],
                    )
                    .all()
                ),
            }
            for a in available['args']
        ]
        del available['func']
        sims.append(available)
    return sims


def run_simulation(simulation_id: int, city_id: int, **kwargs):
    city = City.objects.get(id=city_id)
    simulation_matches = [s for s in AVAILABLE_SIMULATIONS if s['id'] == simulation_id]
    if len(simulation_matches) > 0:
        sim_result, created = SimulationResult.objects.get_or_create(
            simulation_id=simulation_id,
            input_args=kwargs,
            city=city,
        )
        sim_result.output_data = None
        sim_result.save()

        simulation = simulation_matches[0]
        simulation['func'].delay(sim_result.id, **kwargs)
        return SimulationResultSerializer(sim_result).data
    return f"No simulation found with id {simulation_id}."

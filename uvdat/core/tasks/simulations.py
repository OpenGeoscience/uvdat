import inspect
import json
import networkx as nx
from pathlib import Path
import random
import re
import tempfile

from celery import shared_task
from django_large_image import tilesource
import large_image
import shapely

from rest_framework.serializers import ModelSerializer
from uvdat.core.models import City, Dataset, SimulationResult
from uvdat.core.tasks.networks import (
    NODE_RECOVERY_MODES,
    construct_edge_list,
    sort_graph_centrality,
)
import uvdat.core.serializers as serializers


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
        return

    if (
        not network_dataset.network
        or elevation_dataset.category != 'elevation'
        or flood_dataset.category != 'flood'
    ):
        result.error_message = 'Invalid dataset selected.'
        result.save()
        return

    node_failures = []
    network_nodes = network_dataset.network_nodes.all()
    flood_geodata = json.loads(flood_dataset.geodata_file.open().read().decode())
    flood_areas = [
        shapely.geometry.shape(feature['geometry']) for feature in flood_geodata['features']
    ]
    for network_node in network_nodes:
        node_point = shapely.geometry.Point(*network_node.location)
        if any(flood_area.contains(node_point) for flood_area in flood_areas):
            node_failures.append(network_node)

    node_elevations = get_network_node_elevations(network_nodes, elevation_dataset)
    node_failures.sort(key=lambda n: node_elevations[n.id])

    result.output_data = {'node_failures': [n.id for n in node_failures]}
    result.save()


@shared_task
def recovery_scenario(simulation_result_id, node_failure_simulation_result, recovery_mode):
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
        dataset_id = node_failure_simulation_result.input_args['network_dataset']
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            result.error_message = 'Dataset not found.'
            result.save()
            return
        edge_list = construct_edge_list(dataset)
        int_edges = {int(k): v for k, v in edge_list.items()}
        G = nx.from_dict_of_lists(int_edges)
        nodes_sorted, edge_list = sort_graph_centrality(G, recovery_mode)
        node_recoveries.sort(key=lambda n: nodes_sorted.index(n))

    result.output_data = {
        'node_failures': node_failures,
        'node_recoveries': node_recoveries,
    }
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
        'output_type': 'node_animation',
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
    },
    {
        'id': 2,
        'name': 'Recovery Scenario',
        'description': '''
            Provide the output of another simulation which returns a list of deactivated nodes,
            and select a recovery mode to determine the order in which
            nodes will come back online.
        ''',
        'output_type': 'node_animation',
        'func': recovery_scenario,
        'args': [
            {
                'name': 'node_failure_simulation_result',
                'type': SimulationResult,
                'options_query': {'simulation_id__in': [1]},
            },
            {
                'name': 'recovery_mode',
                'type': str,
                'options': NODE_RECOVERY_MODES,
            },
        ],
    },
]


def get_available_simulations(city_id: int):
    sims = []
    for available in AVAILABLE_SIMULATIONS:
        available = available.copy()
        available['description'] = re.sub(r'\n\s+', ' ', available['description'])
        args = []
        for a in available['args']:
            options = a.get('options')
            if not options:
                options_query = a.get('options_query')
                options_type = a.get('type')
                option_serializer_matches = [
                    s
                    for name, s in inspect.getmembers(serializers, inspect.isclass)
                    if issubclass(s, ModelSerializer) and s.Meta.model == options_type
                ]
                if not options_query or not options_type or len(option_serializer_matches) == 0:
                    options = []
                else:
                    option_serializer = option_serializer_matches[0]
                    if hasattr(options_type, 'city'):
                        options_query['city__id'] = city_id
                    options = list(
                        option_serializer(d).data
                        for d in options_type.objects.filter(
                            **options_query,
                        ).all()
                    )
            args.append(
                {
                    'name': a['name'],
                    'options': options,
                }
            )
        available['args'] = args
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
        return serializers.SimulationResultSerializer(sim_result).data
    return f"No simulation found with id {simulation_id}."

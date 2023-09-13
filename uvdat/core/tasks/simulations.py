import re

from uvdat.core.models import Dataset, SimulationResult
from uvdat.core.serializers import DatasetSerializer, SimulationResultSerializer


def flood_scenario_1(result, network_dataset, elevation_dataset, flood_dataset):
    disabled_nodes = []
    print(result, network_dataset, elevation_dataset, flood_dataset)
    return disabled_nodes


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


def run_simulation(simulation_id: int, **kwargs):
    simulation_matches = [s for s in AVAILABLE_SIMULATIONS if s['id'] == simulation_id]
    if len(simulation_matches) > 0:
        sim_result, created = SimulationResult.objects.get_or_create(
            simulation_id=simulation_id, input_args=kwargs
        )
        sim_result.output_data = None
        sim_result.save()

        simulation = simulation_matches[0]
        simulation['func'](sim_result, **kwargs)
        return SimulationResultSerializer(sim_result).data
    return f"No simulation found with id {simulation_id}."

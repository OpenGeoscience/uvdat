import re
from uvdat.core.models import Dataset
from uvdat.core.serializers import DatasetSerializer


def flood_scenario_1(network_dataset, elevation_dataset, flood_dataset):
    print(network_dataset, elevation_dataset, flood_dataset)


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

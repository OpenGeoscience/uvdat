from django.db import models
from django_extensions.db.models import TimeStampedModel

from uvdat.core.tasks import simulations as uvdat_simulations

from .context import Context
from .dataset import Dataset


class SimulationResult(TimeStampedModel):
    class SimulationType(models.TextChoices):
        FLOOD_1 = 'FLOOD_1', 'Flood Scenario 1'
        RECOVERY = 'RECOVERY', 'Recovery Scenario'

    simulation_type = models.CharField(
        max_length=max(len(choice[0]) for choice in SimulationType.choices),
        choices=SimulationType.choices,
    )
    context = models.ForeignKey(
        Context, on_delete=models.CASCADE, related_name='simulation_results'
    )
    input_args = models.JSONField(blank=True, null=True)
    output_data = models.JSONField(blank=True, null=True)
    error_message = models.TextField(null=True, blank=True)

    def get_simulation_type(self):
        if not self.simulation_type or self.simulation_type not in AVAILABLE_SIMULATIONS:
            raise ValueError(f'Simulation type not found: {self.simulation_type}')
        return AVAILABLE_SIMULATIONS[self.simulation_type]

    def get_name(self):
        # method built into text choice field
        simulation_type = self.get_simulation_type_display()
        print(simulation_type)
        return 'Unnamed Simulation Result'

    def run(self, **kwargs):
        self.output_data = None
        self.save()
        simulation_type = self.get_simulation_type()
        simulation_type['func'].delay(self.id, **kwargs)


AVAILABLE_SIMULATIONS = {
    'FLOOD_1': {
        'description': """
            Provide a network dataset, elevation dataset, and flood dataset
            to determine which network nodes go out of service
            when the target flood occurs.
        """,
        'output_type': 'node_animation',
        'func': uvdat_simulations.flood_scenario_1,
        'args': [
            {
                'name': 'network_dataset',
                'type': Dataset,
                'options_annotations': {
                    'network_nodes_count': models.Count('network_nodes'),
                    'network_edges_count': models.Count('network_edges'),
                },
                'options_query': {
                    'network_nodes_count__gte': 1,
                    'network_edges_count__gte': 1,
                },
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
    'RECOVERY': {
        'description': """
            Provide the output of another simulation which returns a list of deactivated nodes,
            and select a recovery mode to determine the order in which
            nodes will come back online.
        """,
        'output_type': 'node_animation',
        'func': uvdat_simulations.recovery_scenario,
        'args': [
            {
                'name': 'node_failure_simulation_result',
                'type': SimulationResult,
                'options_query': {
                    'simulation_type__in': [
                        'Flood 1',
                        # add other node failure simulation types here as created
                    ]
                },
            },
            {
                'name': 'recovery_mode',
                'type': str,
                'options': uvdat_simulations.NODE_RECOVERY_MODES,
            },
        ],
    },
}

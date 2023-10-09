from django.db import models
from django_extensions.db.models import TimeStampedModel

from .city import City
from .dataset import Dataset
from uvdat.core.tasks import simulations as uvdat_simulations


class SimulationResult(TimeStampedModel):
    class SimulationType(models.TextChoices):
        FLOOD_1 = 'FLOOD_1', 'Flood Scenario 1'
        RECOVERY = 'RECOVERY', 'Recovery Scenario'

    simulation_type = models.CharField(
        max_length=max(len(choice[0]) for choice in SimulationType.choices),
        choices=SimulationType.choices,
    )
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='simulation_results')
    input_args = models.JSONField(blank=True, null=True)
    output_data = models.JSONField(blank=True, null=True)
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['simulation_id', 'city', 'input_args'], name='unique_simulation_combination'
            )
        ]

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
        'description': '''
            Provide a network dataset, elevation dataset, and flood dataset
            to determine which network nodes go out of service
            when the target flood occurs.
        ''',
        'output_type': 'node_animation',
        'func': uvdat_simulations.flood_scenario_1,
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
    'RECOVERY': {
        'description': '''
            Provide the output of another simulation which returns a list of deactivated nodes,
            and select a recovery mode to determine the order in which
            nodes will come back online.
        ''',
        'output_type': 'node_animation',
        'func': uvdat_simulations.recovery_scenario,
        'args': [
            {
                'name': 'node_failure_simulation_result',
                'type': SimulationResult,
                'options_query': {'simulation_id__in': [1]},
            },
            {
                'name': 'recovery_mode',
                'type': str,
                'options': uvdat_simulations.NODE_RECOVERY_MODES,
            },
        ],
    },
}

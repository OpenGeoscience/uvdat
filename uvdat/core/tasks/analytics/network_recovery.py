from celery import shared_task

from uvdat.core.models import AnalysisResult

from .analysis_type import AnalysisType

RECOVERY_MODES = [
    'random',
    'betweenness',
    'degree',
    'information',
    'eigenvector',
    'load',
    'closeness',
    'second order',
]


class NetworkRecovery(AnalysisType):
    def __init__(self):
        super().__init__(self)
        self.name = 'Network Recovery'
        self.description = (
            'Provide a network failure state and select a '
            'recovery mode to view network recovery priority.'
        )
        self.db_value = 'network_recovery'
        self.output_types = {'recovery': 'network_animation'}
        self.attribution = 'Jack Watson, Northeastern University'

    def get_input_options(self):
        from .__init__ import __all__ as analysis_types

        node_failure_analysis_types = [
            at().db_value
            for at in analysis_types
            if at().output_types.get('failure') == 'network_animation'
        ]
        return {
            'network_failure': AnalysisResult.objects.filter(
                analysis_type__in=node_failure_analysis_types
            ),
            'recovery_mode': RECOVERY_MODES,
        }

    def run_task(self, project, **inputs):
        result = AnalysisResult.objects.create(
            analysis_type=self.db_value,
            inputs=inputs,
            project=project,
            status='Initializing task...',
        )
        network_recovery.delay(result.id)
        return result


@shared_task
def network_recovery(result_id):
    result = AnalysisResult.objects.get(id=result_id)

    # Verify inputs
    failure = None
    failure_id = result.inputs.get('network_failure')
    if failure_id is None:
        result.write_error('Network failure result not provided')
    else:
        try:
            failure = AnalysisResult.objects.get(id=failure_id)
        except AnalysisResult.DoesNotExist:
            result.write_error('Network failure result not found')

    mode = result.inputs.get('recovery_mode')
    if mode is None:
        result.write_error('Recovery mode not provided')
    elif mode not in RECOVERY_MODES:
        result.write_error('Recovery mode not a valid option')

    if result.error is None:
        result.write_status(f'Ready to run with inputs {failure=} {mode=}')

    result.complete()

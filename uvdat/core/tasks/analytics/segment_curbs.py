from celery import shared_task

from uvdat.core.models import AnalysisResult, RasterData

from .analysis_type import AnalysisType


class SegmentCurbs(AnalysisType):
    def __init__(self):
        super().__init__(self)
        self.name = 'Segment Walkable Paths'
        self.description = (
            'Leverage tile2net to detect roads, sidewalks, '
            'footpaths, and crosswalks in aerial imagery.'
        )
        self.db_value = 'segment_curbs'
        self.output_types = {'polygons': 'dataset', 'network': 'dataset'}
        self.attribution = 'VIDA NYU & Kitware Inc.'

    def get_input_options(self):
        return {'aerial_imagery': RasterData.objects.filter(dataset__category='imagery')}

    def run_task(self, project, **inputs):
        result = AnalysisResult.objects.create(
            analysis_type=self.db_value,
            inputs=inputs,
            project=project,
            status='Initializing task...',
        )
        segment_curbs.delay(result.id)
        return result


@shared_task
def segment_curbs(result_id):
    result = AnalysisResult.objects.get(id=result_id)

    # Verify inputs
    imagery = None
    imagery_id = result.inputs.get('aerial_imagery')
    if imagery_id is None:
        result.write_error('Aerial imagery raster data not provided')
    else:
        try:
            imagery = RasterData.objects.get(id=imagery_id)
        except RasterData.DoesNotExist:
            result.write_error('Aerial imagery raster data not found')

    if result.error is None:
        result.write_status(f'Ready to run with inputs {imagery=}')

    result.complete()

import datetime
import os
from pathlib import Path
import tempfile
import zipfile

from celery import shared_task
from django.core.files.base import ContentFile
from django_large_image import tilesource, utilities

from geoinsight.core.models import Dataset, FileItem, RasterData, TaskResult

from .analysis_type import AnalysisType


class Tile2NetSegmentation(AnalysisType):
    def __init__(self):
        super().__init__(self)
        self.name = 'Tile2Net Segmentation'
        self.description = (
            'Leverage tile2net to detect roads, sidewalks, '
            'footpaths, and crosswalks in aerial imagery.'
        )
        self.db_value = 'tile2net_segmentation'
        self.input_types = {'aerial_imagery': 'RasterData'}
        self.output_types = {'polygons': 'Dataset', 'network': 'Dataset'}
        self.attribution = 'VIDA NYU & Kitware Inc.'

    @classmethod
    def is_enabled(cls):
        from django.conf import settings

        return settings.ENABLE_TASK_TILE2NET_SEGMENTATION

    def get_input_options(self):
        return {'aerial_imagery': RasterData.objects.filter(dataset__category='imagery')}

    def run_task(self, project, **inputs):
        result = TaskResult.objects.create(
            name='Tile2Net Segmentation',
            task_type=self.db_value,
            inputs=inputs,
            project=project,
            status='Initializing task...',
        )
        tile2net_segmentation.delay(result.id)
        return result


@shared_task
def tile2net_segmentation(result_id):
    result = TaskResult.objects.get(id=result_id)

    try:
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

        # Run task
        if result.error is None:
            from tile2net import Raster

            # Update name
            result.name = f'Segmentation of {imagery.name}'
            result.save()

            result.write_status('Reading aerial imagery...')
            # use django-large-image to open file;
            # uses slippy map coords instead of pixel coords to comply with tile2net
            imagery_path = utilities.field_file_to_local_path(imagery.cloud_optimized_geotiff)
            source = tilesource.get_tilesource_from_path(imagery_path, projection='EPSG:3857')
            metadata = source.getMetadata()
            zoom = metadata['levels'] - 1
            bounds = metadata.get('sourceBounds')
            bbox = [bounds['ymin'], bounds['xmin'], bounds['ymax'], bounds['xmax']]

            with tempfile.TemporaryDirectory() as tmp:
                # write tiles to folder for tile2net to access
                xyz_folder = Path(tmp, 'xyz')
                xyz_folder.mkdir(parents=True, exist_ok=True)
                output_folder = Path(tmp, 'output')
                output_folder.mkdir(parents=True, exist_ok=True)
                raster = Raster(
                    location=bbox,
                    name='area',
                    input_dir=f'{str(xyz_folder)}/x_y.png',
                    output_dir=output_folder,
                    zoom=zoom,
                )
                for tile_row in raster.tiles:
                    for tile_spec in tile_row:
                        x, y = tile_spec.xtile, tile_spec.ytile
                        tile_path = xyz_folder / f'{x}_{y}.png'
                        tile = source.getTile(x, y, zoom, pilImageAllowed=True)
                        tile.save(tile_path)

                result.write_status('Using tile2net to generate raster data...')
                stitch_step = 4
                raster.generate(stitch_step)
                # inference step requires NVIDIA driver and increased memory limit
                result.write_status('Running tile2net inference...')
                raster.inference()

                result.write_status('Saving results as new datasets...')
                outputs = {}
                for result_set in ['polygons', 'network']:
                    result_folder = next(output_folder.glob(f'area/{result_set}'))
                    zip_path = output_folder / f'{result_set}.zip'
                    if result_folder.exists():
                        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
                            for result_file_path in result_folder.glob('**/*'):
                                if result_file_path.is_file():
                                    z.write(str(result_file_path))
                    if zip_path.exists():
                        dataset_name = f'Generated {result_set} for {imagery.dataset.name}'
                        existing_count = Dataset.objects.filter(name__contains=dataset_name).count()
                        if existing_count:
                            dataset_name += f' ({existing_count + 1})'
                        dataset = Dataset.objects.create(
                            name=dataset_name,
                            description='Segmentation generated by tile2net from orthoimagery',
                            category='segmentation',
                            tags=['analytics', 'segmentation', 'imagery'],
                            metadata={
                                'creation_time': datetime.datetime.now(datetime.UTC).isoformat()
                            },
                        )
                        result.project.datasets.add(dataset)
                        file_item = FileItem.objects.create(
                            name=zip_path.name,
                            dataset=dataset,
                            file_type='zip',
                            file_size=os.path.getsize(zip_path),
                        )
                        with zip_path.open('rb') as f:
                            file_item.file.save(zip_path, ContentFile(f.read()))
                        dataset.spawn_conversion_task(asynchronous=False)
                        outputs[result_set] = dataset.id
                result.outputs = outputs
    except Exception as e:
        result.error = str(e)
    result.complete()

import json
from pathlib import Path
import tempfile

from django.contrib.gis.db import models as geomodels
from django.core.files.base import ContentFile
from django.db import models
from django.dispatch import receiver
import large_image
from s3_file_field import S3FileField

from .dataset import Dataset
from .file_item import FileItem


class RasterData(models.Model):
    name = models.CharField(max_length=255, default='Raster Data')
    dataset = models.ForeignKey(Dataset, related_name='rasters', on_delete=models.CASCADE)
    source_file = models.ForeignKey(FileItem, null=True, on_delete=models.CASCADE)
    cloud_optimized_geotiff = S3FileField(null=True)
    metadata = models.JSONField(blank=True, null=True)

    def get_image_data(self, resolution: float = 1.0):
        with tempfile.TemporaryDirectory() as tmp:
            raster_path = Path(tmp, 'raster')
            with open(raster_path, 'wb') as raster_file:
                raster_file.write(self.cloud_optimized_geotiff.read())
            source = large_image.open(raster_path)
            data, data_format = source.getRegion(format='numpy')
            data = data[:, :, 0]
            if resolution != 1.0:
                step = int(1 / resolution)
                data = data[::step][::step]
            return data.tolist()


class VectorData(models.Model):
    name = models.CharField(max_length=255, default='Vector Data')
    dataset = models.ForeignKey(Dataset, related_name='vectors', on_delete=models.CASCADE)
    source_file = models.ForeignKey(FileItem, null=True, on_delete=models.CASCADE)
    geojson_data = S3FileField(null=True)
    metadata = models.JSONField(blank=True, null=True)

    def write_geojson_data(self, content: str | dict):
        if isinstance(content, str):
            data = content
        elif isinstance(content, dict):
            data = json.dumps(content)
        else:
            raise Exception(f'Invalid content type supplied: {type(content)}')

        self.geojson_data.save('vectordata.geojson', ContentFile(data.encode()))

    def read_geojson_data(self) -> dict:
        """Read and load the data from geojson_data into a dict."""
        return json.load(self.geojson_data.open())

    def get_summary(self) -> dict:
        features = VectorFeature.objects.filter(vector_data=self)
        # TODO: is there a query way to do this?
        summary = {
            'feature_count': features.count(),
            'all': {},
            'polygons': {},
            'lines': {},
            'points': {},
        }
        exclude_keys = ['node_id', 'edge_id', 'to_node_id', 'from_node_id']
        for feature in features:
            for k, v in feature.properties.items():
                if k not in exclude_keys:
                    geom_type = feature.geometry.geom_type
                    group = (
                        'points'
                        if geom_type == 'Point'
                        else 'lines' if geom_type == 'LineString' else 'polygons'
                    )
                    if k not in summary[group]:
                        summary[group][k] = []
                    if v not in summary[group][k]:
                        summary[group][k].append(v)
                    if k not in summary['all']:
                        summary['all'][k] = []
                    if v not in summary['all'][k]:
                        summary['all'][k].append(v)
        return summary


class VectorFeature(models.Model):
    vector_data = models.ForeignKey(
        VectorData, on_delete=models.CASCADE, related_name='features', null=True
    )
    geometry = geomodels.GeometryField()
    properties = models.JSONField()


@receiver(models.signals.post_delete, sender=RasterData)
def delete_raster_content(sender, instance, **kwargs):
    if instance.cloud_optimized_geotiff:
        instance.cloud_optimized_geotiff.delete(save=False)


@receiver(models.signals.post_delete, sender=VectorData)
def delete_vector_content(sender, instance, **kwargs):
    if instance.geojson_data:
        instance.geojson_data.delete(save=False)

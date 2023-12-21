import json
from pathlib import Path
import tempfile

from django.core.files.base import ContentFile
from django.db import models
from django_extensions.db.models import TimeStampedModel
import large_image
from s3_file_field import S3FileField

from .file_item import FileItem


class AbstractMapLayer(TimeStampedModel):
    file_item = models.ForeignKey(FileItem, on_delete=models.CASCADE, null=True)
    metadata = models.JSONField(blank=True, null=True)
    default_style = models.JSONField(blank=True, null=True)
    index = models.IntegerField(null=True)

    def is_in_context(self, context_id):
        return self.file_item.is_in_context(context_id)

    class Meta:
        abstract = True


class RasterMapLayer(AbstractMapLayer):
    cloud_optimized_geotiff = S3FileField()

    def get_image_data(self, resolution: float = 1.0):
        with tempfile.TemporaryDirectory() as tmp:
            raster_path = Path(tmp, 'raster')
            with open(raster_path, 'wb') as raster_file:
                if self.cloud_optimized_geotiff:
                    raster_file.write(self.cloud_optimized_geotiff.read())
                else:
                    raster_file.write(self.file_item.file.read())
            source = large_image.open(raster_path)
            data, data_format = source.getRegion(format='numpy')
            data = data[:, :, 0]
            if resolution != 1.0:
                step = int(1 / resolution)
                data = data[::step][::step]
            return data.tolist()


class VectorMapLayer(AbstractMapLayer):
    geojson_file = S3FileField(null=True)

    def write_geojson_data(self, content: str | dict):
        if isinstance(content, str):
            data = content
        elif isinstance(content, dict):
            data = json.dumps(content)
        else:
            raise Exception(f'Invalid content type supplied: {type(content)}')

        self.geojson_file.save('vectordata.geojson', ContentFile(data.encode()))

    def read_geojson_data(self) -> dict:
        """Read and load the data from geojson_file into a dict."""
        return json.load(self.geojson_file.open())

    def get_tile_extents(self):
        """Return a dict that maps z tile values to the x/y extent at that depth."""
        return {
            entry.pop('z'): entry
            for entry in (
                VectorTile.objects.filter(map_layer=self)
                .values('z')
                .annotate(
                    min_x=models.Min('x'),
                    min_y=models.Min('y'),
                    max_x=models.Max('x'),
                    max_y=models.Max('y'),
                )
                .order_by()
            )
        }


class VectorTile(models.Model):
    EMPTY_TILE_DATA = {
        'type': 'FeatureCollection',
        'features': [],
    }

    map_layer = models.ForeignKey(VectorMapLayer, on_delete=models.CASCADE)
    geojson_data = models.JSONField(blank=True, null=True)
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    z = models.IntegerField(default=0)

    class Meta:
        constraints = [
            # Ensure that a full index only ever resolves to one record
            models.UniqueConstraint(
                name='unique-map-layer-index', fields=['map_layer', 'z', 'x', 'y']
            )
        ]
        indexes = [models.Index(fields=('z', 'x', 'y'), name='vectortile-coordinates-index')]

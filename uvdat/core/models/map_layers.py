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
                raster_file.write(self.cloud_optimized_geotiff.read())
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
        """Reads and loads the data from geojson_file into a dict."""
        return json.load(self.geojson_file.open())

            )

    def get_available_tile_coords(self):
        # TODO: compute this once and save it on the object;
        # Query can take a while, and this is called on the RasterMapLayerSerializer
        tile_coords = []
        for vector_tile in VectorTile.objects.filter(map_layer=self):
            tile_coords.append(
                dict(
                    x=vector_tile.x,
                    y=vector_tile.y,
                    z=vector_tile.z,
                )
            )
        return tile_coords

    def get_vector_tile(self, x, y, z):
        return VectorTile.objects.get(map_layer=self, x=x, y=y, z=z)


class VectorTile(models.Model):
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

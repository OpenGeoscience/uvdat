from pathlib import Path
import tempfile

from django.db import models
from django_extensions.db.models import TimeStampedModel
import large_image
from s3_file_field import S3FileField

from .dataset import Dataset


class AbstractDataSource(TimeStampedModel):
    # TODO: when auth is implemented, add a User pointer `uploaded_by`
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, null=True)
    metadata = models.JSONField(blank=True, null=True)
    default_style = models.JSONField(blank=True, null=True)
    index = models.IntegerField(null=True)

    class Meta:
        abstract = True

    def clean(self):
        cleaned_data = super().clean()
        # TODO: validate fields (original_files, index)
        # on failure raise forms.ValidationError('details')
        return cleaned_data


class RasterDataSource(AbstractDataSource):
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


class VectorDataSource(AbstractDataSource):
    geojson_data = models.JSONField(blank=True, null=True)

    def get_available_tile_coords(self):
        tile_coords = []
        for vector_tile in VectorTile.objects.filter(data_source=self):
            tile_coords.append(
                dict(
                    x=vector_tile.x,
                    y=vector_tile.y,
                    z=vector_tile.z,
                )
            )
        return tile_coords

    def get_vector_tile(self, x, y, z):
        return VectorTile.objects.get(data_source=self, x=x, y=y, z=z)


class VectorTile(models.Model):
    data_source = models.ForeignKey(VectorDataSource, on_delete=models.CASCADE)
    geojson_data = models.JSONField(blank=True, null=True)
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    z = models.IntegerField(default=0)

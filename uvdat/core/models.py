from django.contrib.gis.db import models as geo_models
from django.db import models
from django_extensions.db.models import TimeStampedModel
from s3_file_field import S3FileField


class City(TimeStampedModel):
    name = models.CharField(max_length=255, unique=True)
    center = geo_models.PointField()
    default_zoom = models.IntegerField(default=10)

    class Meta:
        verbose_name_plural = 'cities'


class Dataset(TimeStampedModel):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='datasets')
    category = models.CharField(max_length=25)
    style = models.JSONField(blank=True, null=True)
    network = models.BooleanField(default=False)
    processing = models.BooleanField(default=False)
    metadata = models.JSONField(blank=True, null=True)

    # A ZIP file containing the original data files
    raw_data_archive = S3FileField(null=True, blank=True)
    raw_data_type = models.CharField(max_length=25, default='shape_file_archive')

    # GeoJSON file, containing geometries and other properties for features
    geodata_file = S3FileField(null=True, blank=True)

    # JSON file, containing GeoJSON tiles, nested by z-x-y tile coordinates
    vector_tiles_file = S3FileField(null=True, blank=True)

    # Raster file, containing a cloud-optimized geotiff
    raster_file = S3FileField(null=True, blank=True)


class NetworkNode(models.Model):
    name = models.CharField(max_length=255, unique=True)
    location = geo_models.PointField()
    properties = models.JSONField(blank=True, null=True)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='network_nodes')
    adjacent_nodes = models.ManyToManyField('NetworkNode')


class Region(models.Model):
    name = models.CharField(max_length=255)
    properties = models.JSONField(blank=True, null=True)
    boundary = geo_models.MultiPolygonField()
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='regions')
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='regions')

    class Meta:
        constraints = [
            models.UniqueConstraint(name='unique-name-per-dataset', fields=['dataset', 'name'])
        ]


class DerivedRegion(models.Model):
    """A Region that's derived from other regions."""

    class VectorOperation(models.TextChoices):
        UNION = 'UNION', 'Union'
        INTERSECTION = 'INTERSECTION', 'Intersection'

    name = models.CharField(max_length=255)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='derived_regions')
    properties = models.JSONField(blank=True, null=True)
    boundary = geo_models.MultiPolygonField()

    # Data from the source regions
    source_regions = models.ManyToManyField(Region, related_name='derived_regions')
    source_operation = models.CharField(
        max_length=max(len(choice[0]) for choice in VectorOperation.choices),
        choices=VectorOperation.choices,
    )

    class Meta:
        constraints = [
            # We enforce name uniqueness across cities, since
            # DerivedRegions can consist of regions from multiple datasets
            models.UniqueConstraint(name='unique-name-per-city', fields=['city', 'name'])
        ]


class Chart(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='charts')
    category = models.CharField(max_length=25)
    raw_data_file = S3FileField(null=True, blank=True)
    raw_data_type = models.CharField(max_length=25, default='csv')
    chart_data = models.JSONField(blank=True, null=True)
    chart_options = models.JSONField(blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True)
    style = models.JSONField(blank=True, null=True)
    clearable = models.BooleanField(default=False)


class SimulationResult(TimeStampedModel):
    simulation_id = models.IntegerField()
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

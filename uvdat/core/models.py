from django.contrib.gis.db import models as geo_models
from django.db import models
from django_extensions.db.models import TimeStampedModel
from s3_file_field import S3FileField


class City(TimeStampedModel, models.Model):
    name = models.CharField(max_length=255, unique=True)
    center = geo_models.PointField()
    default_zoom = models.IntegerField(default=10)

    class Meta:
        verbose_name_plural = 'cities'


class Dataset(TimeStampedModel, models.Model):
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
    name = models.CharField(max_length=255, unique=True)
    properties = models.JSONField(blank=True, null=True)
    boundary = geo_models.MultiPolygonField()
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='regions')
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='regions')


class Chart(models.Model):
    name = models.CharField(max_length=255, unique=True)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='charts')
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='charts')
    data = models.JSONField(blank=True, null=True)

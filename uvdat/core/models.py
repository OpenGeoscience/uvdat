from django.db import models
from django.contrib.gis.db import models as geo_models
from django_extensions.db.models import TimeStampedModel
from s3_file_field import S3FileField


class City(TimeStampedModel, models.Model):
    name = models.CharField(max_length=255, unique=True)
    center = geo_models.PointField()
    default_zoom = models.IntegerField(default=10)


class Dataset(TimeStampedModel, models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="datasets")
    category = models.CharField(max_length=25)

    # A ZIP file containing the original data files
    raw_data_archive = S3FileField(null=True, blank=True)
    raw_data_type = models.CharField(max_length=25, default="shape_file_archive")

    # Geometries only field for faster intersection queries
    geometries = geo_models.GeometryCollectionField(null=True, blank=True)

    # GeoJSON file, containing geometries AND other properties for features
    geodata_file = S3FileField(null=True, blank=True)

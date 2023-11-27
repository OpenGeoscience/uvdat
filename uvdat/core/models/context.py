from django.contrib.gis.db import models as geo_models
from django.db import models

from .dataset import Dataset


class Context(models.Model):
    name = models.CharField(max_length=255, unique=True)
    default_map_center = geo_models.PointField()
    default_map_zoom = models.IntegerField(default=10)
    datasets = models.ManyToManyField(Dataset, blank=True)

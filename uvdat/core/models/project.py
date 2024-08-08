from django.contrib.auth.models import User
from django.contrib.gis.db import models as geo_models
from django.db import models

from .dataset import Dataset


class Project(models.Model):
    name = models.CharField(max_length=255, unique=True)
    default_map_center = geo_models.PointField()
    default_map_zoom = models.IntegerField(default=10)
    datasets = models.ManyToManyField(Dataset, blank=True)
    owner = models.ForeignKey(User, null=True, on_delete=models.PROTECT)
    collaborators = models.ManyToManyField(User, related_name='read_write_projects')
    followers = models.ManyToManyField(User, related_name='read_only_projects')

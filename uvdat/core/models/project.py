from django.contrib.auth.models import User
from django.contrib.gis.db import models as geo_models
from django.db import models
from guardian.shortcuts import assign_perm

from .dataset import Dataset


class Project(models.Model):
    name = models.CharField(max_length=255, unique=True)
    default_map_center = geo_models.PointField()
    default_map_zoom = models.IntegerField(default=10)
    datasets = models.ManyToManyField(Dataset, blank=True)

    def update_permissions(self, **kwargs):
        for key, value in kwargs.items():
            if not isinstance(value, list):
                value = [value]
            for v in value:
                user = None
                if isinstance(v, int):
                    user = User.objects.get(id=v)
                elif isinstance(v, User):
                    user = v

                if key in ['owner', 'collaborator', 'follower']:
                    assign_perm(key, user, self)

    class Meta:
        permissions = [
            ('owner', 'Can read, write, and delete'),
            ('collaborator', 'Can read and write'),
            ('follower', 'Can read'),
        ]

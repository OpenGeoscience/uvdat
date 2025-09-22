from django.db import models

from .project import Project


class Colormap(models.Model):
    name = models.CharField(max_length=255)
    markers = models.JSONField(default=list)
    project = models.ForeignKey(
        Project,
        related_name='colormaps',
        on_delete=models.CASCADE,
        null=True,
    )

from django.contrib.gis.db import models as geo_models
from django.db import models

from .data import VectorFeature
from .dataset import Dataset


class Region(models.Model):
    name = models.CharField(max_length=255)
    vector_feature = models.ForeignKey(
        VectorFeature, on_delete=models.CASCADE, related_name='regions', null=True
    )
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='regions')
    metadata = models.JSONField(blank=True, null=True)
    boundary = geo_models.MultiPolygonField()

    class Meta:
        constraints = [
            # We enforce name uniqueness across datasets
            models.UniqueConstraint(name='unique-source-region-name', fields=['dataset', 'name'])
        ]

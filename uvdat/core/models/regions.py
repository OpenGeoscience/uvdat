from django.contrib.gis.db import models as geo_models
from django.db import models

from .context import Context
from .map_layers import VectorMapLayer
from .dataset import Dataset


class OriginalRegion(models.Model):
    name = models.CharField(max_length=255)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='regions')
    metadata = models.JSONField(blank=True, null=True)
    boundary = geo_models.MultiPolygonField()

    class Meta:
        constraints = [
            # We enforce name uniqueness across datasets
            models.UniqueConstraint(name='unique-original-region-name', fields=['dataset', 'name'])
        ]


class DerivedRegion(models.Model):
    class VectorOperation(models.TextChoices):
        UNION = 'UNION', 'Union'
        INTERSECTION = 'INTERSECTION', 'Intersection'

    name = models.CharField(max_length=255)
    context = models.ForeignKey(Context, on_delete=models.CASCADE, related_name='derived_regions')
    metadata = models.JSONField(blank=True, null=True)
    boundary = geo_models.MultiPolygonField()

    # Data from the source regions
    original_regions = models.ManyToManyField(OriginalRegion, related_name='derived_regions')
    operation = models.CharField(
        max_length=max(len(choice[0]) for choice in VectorOperation.choices),
        choices=VectorOperation.choices,
    )

    # Since these regions are not associated with Datasets,
    # They need their own reference to a map representation
    map_layer = models.ForeignKey(VectorMapLayer, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            # We enforce name uniqueness across contexts
            models.UniqueConstraint(name='unique-derived-region-name', fields=['context', 'name'])
        ]

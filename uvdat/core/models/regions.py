from django.contrib.gis.db import models as geo_models
from django.db import models

from .context import Context
from .dataset import Dataset
from .map_layers import VectorMapLayer


class SourceRegion(models.Model):
    name = models.CharField(max_length=255)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='regions')
    metadata = models.JSONField(blank=True, null=True)
    boundary = geo_models.MultiPolygonField()

    def is_in_context(self, context_id):
        return self.dataset.is_in_context(context_id)

    class Meta:
        constraints = [
            # We enforce name uniqueness across datasets
            models.UniqueConstraint(name='unique-source-region-name', fields=['dataset', 'name'])
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
    source_regions = models.ManyToManyField(SourceRegion, related_name='derived_regions')
    operation = models.CharField(
        max_length=max(len(choice[0]) for choice in VectorOperation.choices),
        choices=VectorOperation.choices,
    )

    # Since these regions are not associated with Datasets,
    # They need their own reference to a map representation
    map_layer = models.ForeignKey(VectorMapLayer, on_delete=models.PROTECT)

    def is_in_context(self, context_id):
        return self.context.id == int(context_id)

    def get_map_layers(self):
        return [
            {
                'id': self.map_layer.id,
                'index': 0,
                'type': 'vector',
            }
        ]

    class Meta:
        constraints = [
            # We enforce name uniqueness across contexts
            models.UniqueConstraint(name='unique-derived-region-name', fields=['context', 'name'])
        ]

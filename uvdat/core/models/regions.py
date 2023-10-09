from django.contrib.gis.db import models as geo_models
from django.db import models

from .city import City
from .dataset import Dataset


class Region(models.Model):
    name = models.CharField(max_length=255)
    city = models.ForeignKey(City, on_delete=models.CASCADE)
    metadata = models.JSONField(blank=True, null=True)
    boundary = geo_models.MultiPolygonField()

    class Meta:
        abstract = True


class OriginalRegion(Region):
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='regions')

    class Meta:
        constraints = [
            # We enforce name uniqueness across cities
            models.UniqueConstraint(name='unique-original-region-name', fields=['city', 'name'])
        ]


class DerivedRegion(Region):
    class VectorOperation(models.TextChoices):
        UNION = 'UNION', 'Union'
        INTERSECTION = 'INTERSECTION', 'Intersection'

    # Data from the source regions
    original_regions = models.ManyToManyField(OriginalRegion, related_name='derived_regions')
    operation = models.CharField(
        max_length=max(len(choice[0]) for choice in VectorOperation.choices),
        choices=VectorOperation.choices,
    )

    class Meta:
        constraints = [
            # We enforce name uniqueness across cities
            models.UniqueConstraint(name='unique-derived-region-name', fields=['city', 'name'])
        ]

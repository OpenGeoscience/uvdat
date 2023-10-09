from django.db import models
from django.contrib.gis.db import models as geo_models

from .city import City
from .dataset import Dataset


class Region(models.Model):
    name = models.CharField(max_length=255)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='regions')
    dataset = models.ForeignKey(
        Dataset, null=True, on_delete=models.CASCADE, related_name='regions'
    )
    metadata = models.JSONField(blank=True, null=True)
    boundary = geo_models.MultiPolygonField()

    class Meta:
        constraints = [
            # We enforce name uniqueness across cities
            models.UniqueConstraint(name='unique-name-per-city', fields=['city', 'name'])
        ]


class DerivedRegion(Region):
    class VectorOperation(models.TextChoices):
        UNION = 'UNION', 'Union'
        INTERSECTION = 'INTERSECTION', 'Intersection'

    # Data from the source regions
    original_regions = models.ManyToManyField(Region, related_name='derived_regions')
    operation = models.CharField(
        max_length=max(len(choice[0]) for choice in VectorOperation.choices),
        choices=VectorOperation.choices,
    )

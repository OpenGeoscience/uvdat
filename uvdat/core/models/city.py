from django.db import models
from django.contrib.gis.db import models as geo_models


class City(models.Model):
    name = models.CharField(max_length=255, unique=True)
    center = geo_models.PointField()
    default_zoom = models.IntegerField(default=10)

    class Meta:
        verbose_name_plural = 'cities'

    def get_center(self):
        if self.center:
            return [self.center.y, self.center.x]
        else:
            return [0, 0]

    def get_datasets(self):
        # TODO: get datasets
        pass

    def get_regions(self):
        # TODO: get regions
        pass

    def get_simulation_results(self):
        # TODO: get simulation results
        pass

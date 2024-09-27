from django.db import models


class Dataset(models.Model):
    class DatasetType(models.TextChoices):
        VECTOR = 'VECTOR', 'Vector'
        RASTER = 'RASTER', 'Raster'

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    category = models.CharField(max_length=25)
    processing = models.BooleanField(default=False)
    metadata = models.JSONField(blank=True, null=True)
    dataset_type = models.CharField(
        max_length=max(len(choice[0]) for choice in DatasetType.choices),
        choices=DatasetType.choices,
    )

    def is_in_project(self, project_id):
        return self.project_set.filter(id=project_id).exists()

    def readable_by(self, user):
        return True

    def editable_by(self, user):
        return user.is_superuser

    def deletable_by(self, user):
        return user.is_superuser

    def spawn_conversion_task(
        self,
        style_options=None,
        network_options=None,
        region_options=None,
        asynchronous=True,
    ):
        from uvdat.core.tasks.dataset import convert_dataset

        if asynchronous:
            convert_dataset.delay(self.id, style_options, network_options, region_options)
        else:
            convert_dataset(self.id, style_options, network_options, region_options)

    def get_size(self):
        from uvdat.core.models import FileItem

        size = 0
        for file_item in FileItem.objects.filter(dataset=self):
            if file_item.file_size is not None:
                size += file_item.file_size
        return size

    def get_regions(self):
        from uvdat.core.models import SourceRegion

        return SourceRegion.objects.filter(dataset=self)

    def get_map_layers(self):
        """Return a queryset of either RasterMapLayer, or VectorMapLayer."""
        from uvdat.core.models import RasterMapLayer, VectorMapLayer

        if self.dataset_type == self.DatasetType.RASTER:
            return RasterMapLayer.objects.filter(dataset=self)
        if self.dataset_type == self.DatasetType.VECTOR:
            return VectorMapLayer.objects.filter(dataset=self)

        raise NotImplementedError(f'Dataset Type {self.dataset_type}')

from django.db import models


class Dataset(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    category = models.CharField(max_length=25)
    processing = models.BooleanField(default=False)
    metadata = models.JSONField(blank=True, null=True)

    def spawn_conversion_task(
        self,
        layer_options=None,
        network_options=None,
        region_options=None,
        asynchronous=True,
    ):
        from uvdat.core.tasks.dataset import convert_dataset

        if asynchronous:
            from uvdat.core.models.task_result import TaskResult

            result = TaskResult.objects.create(
                name=f'Conversion of Dataset {self.id}',
                analysis_type='conversion',
                inputs=dict(
                    layer_options=layer_options,
                    network_options=network_options,
                    region_options=region_options,
                ),
                status='Initializing task...',
            )
            convert_dataset.delay(
                self.id, layer_options, network_options, region_options, result.id
            )
            return result
        else:
            convert_dataset(self.id, layer_options, network_options, region_options)

    def get_size(self):
        from uvdat.core.models import FileItem

        size = 0
        for file_item in FileItem.objects.filter(dataset=self):
            if file_item.file_size is not None:
                size += file_item.file_size
        return size

    def get_networks(self):
        from uvdat.core.models import Network

        return Network.objects.filter(vector_data__dataset=self)

    def get_regions(self):
        from uvdat.core.models import Region

        return Region.objects.filter(dataset=self)

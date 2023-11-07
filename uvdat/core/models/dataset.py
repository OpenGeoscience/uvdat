from django.db import models


class Dataset(models.Model):
    class DatasetType(models.TextChoices):
        VECTOR = 'VECTOR', 'Vector'
        RASTER = 'RASTER', 'Raster'

    class Classification(models.TextChoices):
        NETWORK = 'Network'
        REGION = 'Region'
        OTHER = 'Other'

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    category = models.CharField(max_length=25)
    processing = models.BooleanField(default=False)
    metadata = models.JSONField(blank=True, null=True)
    dataset_type = models.CharField(
        max_length=max(len(choice[0]) for choice in DatasetType.choices),
        choices=DatasetType.choices,
    )
    classification = models.CharField(
        max_length=16, choices=Classification.choices, default=Classification.OTHER
    )

    def is_in_context(self, context_id):
        from uvdat.core.models import Context

        context = Context.objects.get(id=context_id)
        return context.datasets.filter(id=self.id).exists()

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

    def get_network(self):
        from uvdat.core.models import NetworkEdge, NetworkNode

        network = {
            'nodes': NetworkNode.objects.filter(dataset=self),
            'edges': NetworkEdge.objects.filter(dataset=self),
        }
        if len(network.get('nodes')) == 0 and len(network.get('edges')) == 0:
            return None
        return network

    def get_network_graph(self):
        from uvdat.core.tasks.networks import get_dataset_network_graph

        return get_dataset_network_graph(self)

    def get_network_gcc(self, exclude_nodes):
        from uvdat.core.tasks.networks import get_dataset_network_gcc

        return get_dataset_network_gcc(self, exclude_nodes)

    def get_map_layers(self):
        from uvdat.core.models import RasterMapLayer, VectorMapLayer

        ret = []
        for vector_map_layer in VectorMapLayer.objects.filter(file_item__dataset=self):
            ret.append(
                {
                    'id': vector_map_layer.id,
                    'index': vector_map_layer.index,
                    'type': 'vector',
                }
            )
        for raster_map_layer in RasterMapLayer.objects.filter(file_item__dataset=self):
            ret.append(
                {
                    'id': raster_map_layer.id,
                    'index': raster_map_layer.index,
                    'type': 'raster',
                }
            )
        return ret

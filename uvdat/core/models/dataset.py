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
        """Returns a queryset of either RasterMapLayer, or VectorMapLayer."""
        from uvdat.core.models import RasterMapLayer, VectorMapLayer

        if self.dataset_type == self.DatasetType.RASTER:
            return RasterMapLayer.objects.filter(file_item__dataset=self)
        if self.dataset_type == self.DatasetType.VECTOR:
            return VectorMapLayer.objects.filter(file_item__dataset=self)

        raise NotImplementedError(f"Dataset Type {self.dataset_type}")

    def get_map_layer_tile_extents(self):
        """
        Return the extents of all vector map layers of this dataset.

        Returns `None` if the dataset is not a vector dataset.
        """
        if self.dataset_type != self.DatasetType.VECTOR:
            return None

        from uvdat.core.models import VectorMapLayer, VectorTile

        # Retrieve all layers
        layer_ids = VectorMapLayer.objects.filter(file_item__dataset=self).values_list(
            'id', flat=True
        )

        # Return x/y extents by layer id and z depth
        vals = (
            VectorTile.objects.filter(map_layer_id__in=layer_ids)
            .values('map_layer_id', 'z')
            .annotate(
                min_x=models.Min('x'),
                min_y=models.Min('y'),
                max_x=models.Max('x'),
                max_y=models.Max('y'),
            )
            .order_by('map_layer_id')
        )

        # Deconstruct query into response format
        layers = {}
        for entry in vals:
            map_layer_id = entry.pop('map_layer_id')
            if map_layer_id not in layers:
                layers[map_layer_id] = {}

            layers[map_layer_id][entry.pop('z')] = entry

        return layers

from celery import shared_task

from uvdat.core.models import (
    Dataset,
    FileItem,
    VectorMapLayer,
    RasterMapLayer,
    NetworkEdge,
    NetworkNode,
    SourceRegion,
)

from .map_layers import create_vector_map_layer, create_raster_map_layer
from .networks import create_network
from .regions import create_source_regions


@shared_task
def convert_dataset(
    dataset_id,
    style_options=None,
    network_options=None,
    region_options=None,
):
    dataset = Dataset.objects.get(id=dataset_id)
    dataset.processing = True
    dataset.save()

    if dataset.dataset_type == dataset.DatasetType.RASTER:
        RasterMapLayer.objects.filter(file_item__dataset=dataset).delete()
        for file_to_convert in FileItem.objects.filter(dataset=dataset):
            create_raster_map_layer(
                file_to_convert,
                style_options=style_options,
            )

    elif dataset.dataset_type == dataset.DatasetType.VECTOR:
        VectorMapLayer.objects.filter(file_item__dataset=dataset).delete()
        if network_options:
            NetworkNode.objects.filter(dataset=dataset).delete()
            NetworkEdge.objects.filter(dataset=dataset).delete()
        elif region_options:
            SourceRegion.objects.filter(dataset=dataset).delete()

        for file_to_convert in FileItem.objects.filter(dataset=dataset):
            vector_map_layer = create_vector_map_layer(
                file_to_convert,
                style_options=style_options,
            )
            if network_options:
                create_network(vector_map_layer, network_options)
            elif region_options:
                create_source_regions(vector_map_layer, region_options)

    dataset.processing = False
    dataset.save()
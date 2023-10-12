from celery import shared_task

from uvdat.core.models import (
    Dataset,
    FileItem,
    VectorDataSource,
    RasterDataSource,
    NetworkEdge,
    NetworkNode,
    OriginalRegion,
)

from .data_sources import create_vector_data_source, create_raster_data_source
from .networks import create_network
from .regions import create_original_regions


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
        RasterDataSource.objects.filter(dataset=dataset).delete()
        for file_to_convert in FileItem.objects.filter(dataset=dataset):
            create_raster_data_source(
                file_to_convert,
                style_options=style_options,
            )

    elif dataset.dataset_type == dataset.DatasetType.VECTOR:
        VectorDataSource.objects.filter(dataset=dataset).delete()
        if network_options:
            NetworkNode.objects.filter(dataset=dataset).delete()
            NetworkEdge.objects.filter(dataset=dataset).delete()
        elif region_options:
            OriginalRegion.objects.filter(dataset=dataset).delete()

        for file_to_convert in FileItem.objects.filter(dataset=dataset):
            vector_data_source = create_vector_data_source(
                file_to_convert,
                style_options=style_options,
            )
            if network_options:
                create_network(vector_data_source, network_options)
            elif region_options:
                create_original_regions(vector_data_source, region_options)

    dataset.processing = False
    dataset.save()

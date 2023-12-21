from celery import shared_task
from django_large_image import utilities
import large_image

from uvdat.core.models import (
    Dataset,
    FileItem,
    NetworkEdge,
    NetworkNode,
    RasterMapLayer,
    SourceRegion,
    VectorMapLayer,
)

from .map_layers import create_raster_map_layer, create_vector_map_layer, save_vector_tiles
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

    # Determine network/region classificaton
    network = dataset.classification == Dataset.Classification.NETWORK
    region = dataset.classification == Dataset.Classification.REGION

    if dataset.dataset_type == dataset.DatasetType.RASTER:
        RasterMapLayer.objects.filter(file_item__dataset=dataset).delete()
        for file_to_convert in FileItem.objects.filter(dataset=dataset):
            split = style_options.get('split')
            split_delimiter = style_options.get('split_delimiter')
            if split and split_delimiter:
                # not abstracted; implemented for flood timeseries dataset only
                fp = utilities.field_file_to_local_path(file_to_convert.file)
                can_read = large_image.canRead(fp)
                if not can_read:
                    raise TypeError(f'Cannot read {fp}. Additional large-image sources may need to be installed.')
                img = large_image.open(fp)
                band_metadata = img.getMetadata()['bands']
                netcdf_metadata = {k.split("=")[0]: k.split("=")[1] for k in img.getInternalMetadata()['Metadata']}
                split_values = netcdf_metadata.get(split).split(split_delimiter)
                for index, value in enumerate(split_values):
                    band = band_metadata.get(index + 1)
                    RasterMapLayer.objects.create(
                        file_item=file_to_convert,
                        metadata=dict(
                            name=value
                        ),
                        default_style=dict(
                            **style_options,
                            band=index+1,
                            data_range=[band.get('min', -1), band.get('max', 1)]
                        ),
                        index=index,
                    )
                print(f'\tCreated {len(split_values)} layers for {file_to_convert}.')
            else:
                create_raster_map_layer(
                    file_to_convert,
                    style_options=style_options,
                )

    elif dataset.dataset_type == dataset.DatasetType.VECTOR:
        VectorMapLayer.objects.filter(file_item__dataset=dataset).delete()
        if network:
            NetworkNode.objects.filter(dataset=dataset).delete()
            NetworkEdge.objects.filter(dataset=dataset).delete()
        elif region:
            SourceRegion.objects.filter(dataset=dataset).delete()

        for file_to_convert in FileItem.objects.filter(dataset=dataset):
            vector_map_layer = create_vector_map_layer(
                file_to_convert,
                style_options=style_options,
            )
            if network:
                create_network(vector_map_layer, network_options)
            elif region_options:
                create_source_regions(vector_map_layer, region_options)

            # Create vector tiles after geojson_data may have
            # been altered by create_network or create_source_regions
            save_vector_tiles(vector_map_layer)

    dataset.processing = False
    dataset.save()

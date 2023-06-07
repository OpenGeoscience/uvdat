import shapefile
import tempfile
import rasterio
import zipfile
import geopandas
import json
import numpy
import matplotlib.pyplot as plt
import large_image_converter
from pathlib import Path
from celery import shared_task
from django.contrib.gis.geos import GEOSGeometry, GeometryCollection
from django.core.files.base import ContentFile
from uvdat.core.models import Dataset
from uvdat.core.utils import add_styling


@shared_task
def convert_raw_archive(dataset_id):
    dataset = Dataset.objects.get(id=dataset_id)
    if dataset.raw_data_type == 'cloud_optimized_geotiff':
        convert_cog(dataset_id)
    if dataset.raw_data_type == 'shape_file_archive':
        convert_shape_file_archive(dataset_id)


@shared_task
def convert_cog(dataset_id):
    dataset = Dataset.objects.get(id=dataset_id)
    with tempfile.TemporaryDirectory() as temp_dir:
        raster_path = Path(temp_dir, 'raster.tiff')
        cog_raster_path = Path(temp_dir, 'cog_raster.tiff')

        apply_colormap_to_band = -1
        colormap_name = 'viridis'
        if dataset.style and dataset.style.get('options'):
            options = dataset.style.get('options')
            apply_colormap_to_band = options.get('apply_colormap_to_band', apply_colormap_to_band)
            colormap_name = options.get('colormap', colormap_name)
        colormap = plt.get_cmap(colormap_name)

        with dataset.raw_data_archive.open('rb') as raw_data_archive:
            input_data = rasterio.open(raw_data_archive)
            output_data = rasterio.open(
                raster_path,
                'w',
                driver='GTiff',
                height=input_data.height,
                width=input_data.width,
                count=input_data.count if apply_colormap_to_band == -1 else input_data.count + 2,
                dtype=numpy.uint8,
                crs=input_data.crs,
                transform=input_data.transform,
            )

            output_band_index = 1
            for i in range(1, input_data.count + 1):
                band = input_data.read(i)
                if i == apply_colormap_to_band:
                    # normalize values between 0 and 1
                    band_range = [band.min(), band.max()]
                    normalize = numpy.vectorize(lambda x: (x - band_range[0]) / band_range[1])
                    band = normalize(band)
                    band = colormap(band)
                    for index, channel in enumerate(['r', 'g', 'b']):
                        channel_data = band[:, :, index] * 255
                        output_data.write(channel_data, output_band_index)
                        output_band_index += 1
                else:
                    output_data.write(band, output_band_index)
                    output_band_index += 1

            output_data.close()

            large_image_converter.convert(str(raster_path), str(cog_raster_path))
            with open(cog_raster_path, 'rb') as raster_file:
                dataset.raster_file.save(cog_raster_path, ContentFile(raster_file.read()))


@shared_task
def convert_shape_file_archive(dataset_id):
    dataset = Dataset.objects.get(id=dataset_id)
    features = []
    original_projection = None
    with tempfile.TemporaryDirectory() as temp_dir:
        archive_path = Path(temp_dir, 'archive.zip')
        geodata_path = Path(temp_dir, 'geo.json')

        with open(archive_path, 'wb') as archive_file:
            archive_file.write(dataset.raw_data_archive.open('rb').read())
            with zipfile.ZipFile(archive_path) as zip_archive:
                filenames = zip_archive.namelist()
                for filename in filenames:
                    if filename.endswith(".shp"):
                        sf = shapefile.Reader(f'{archive_path}/{filename}')
                        features.extend(sf.__geo_interface__['features'])
                    if filename.endswith(".prj"):
                        original_projection = zip_archive.open(filename).read().decode()

        features = add_styling(features, dataset.style)
        with open(geodata_path, 'w') as geodata_file:
            json.dump({'type': 'FeatureCollection', 'features': features}, geodata_file)
        geodata = geopandas.read_file(geodata_path)
        geodata = geodata.set_crs(original_projection, allow_override=True)
        geodata = geodata.to_crs(4326)

        geodata.to_file(geodata_path)
        with open(geodata_path, 'rb') as geodata_file:
            dataset.geodata_file.save(geodata_path, ContentFile(geodata_file.read()))

        geometry_only = [
            GEOSGeometry(json.dumps(feature['geometry']))
            for feature in geodata.__geo_interface__['features']
        ]
        dataset.geometries = GeometryCollection(geometry_only)

        print(f'\t Shapefile to GeoJSON conversion complete for {dataset.name}.')
        dataset.save()

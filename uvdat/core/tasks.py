import shapefile
import tempfile
import rasterio
import zipfile
import geopandas
import json
import numpy
import large_image_converter
from pathlib import Path
from celery import shared_task
from geojson2vt import geojson2vt, vt2geojson
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

        transparency_threshold = None
        trim_distribution_percentage = None
        if dataset.style and dataset.style.get('options'):
            options = dataset.style.get('options')
            transparency_threshold = options.get("transparency_threshold", transparency_threshold)
            trim_distribution_percentage = options.get(
                "trim_distribution_percentage", trim_distribution_percentage
            )

        with dataset.raw_data_archive.open('rb') as raw_data_archive:
            input_data = rasterio.open(raw_data_archive)
            output_data = rasterio.open(
                raster_path,
                'w',
                driver='GTiff',
                height=input_data.height,
                width=input_data.width,
                count=1,
                dtype=numpy.float32,
                crs=input_data.crs,
                transform=input_data.transform,
            )
            band = input_data.read(1)

            if trim_distribution_percentage:
                # trim a number of values from both ends of the distribution
                histogram, bin_edges = numpy.histogram(band, bins=1000)
                trim_n = band.size * trim_distribution_percentage
                new_min = None
                new_max = None
                sum_values = 0
                for bin_index, bin_count in enumerate(histogram):
                    bin_edge = bin_edges[bin_index]
                    sum_values += bin_count
                    if new_min is None and sum_values > trim_n:
                        new_min = bin_edge
                    if new_max is None and sum_values > band.size - trim_n:
                        new_max = bin_edge
                if new_min:
                    band[band < new_min] = new_min
                if new_max:
                    band[band > new_max] = new_max

            if transparency_threshold is not None:
                band[band < transparency_threshold] = transparency_threshold

            band_range = [float(band.min()), float(band.max())]
            dataset.style['data_range'] = band_range

            output_data.write(band, 1)
            output_data.close()

            large_image_converter.convert(str(raster_path), str(cog_raster_path))
            with open(cog_raster_path, 'rb') as raster_file:
                dataset.raster_file.save(cog_raster_path, ContentFile(raster_file.read()))

            print(f'\t Raster conversion complete for {dataset.name}.')
            dataset.processing = False
            dataset.save()


@shared_task
def convert_shape_file_archive(dataset_id):
    dataset = Dataset.objects.get(id=dataset_id)
    features = []
    original_projection = None
    with tempfile.TemporaryDirectory() as temp_dir:
        archive_path = Path(temp_dir, 'archive.zip')
        geodata_path = Path(temp_dir, 'geo.json')
        tiled_geo_path = Path(temp_dir, 'tiled_geo.json')

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
        tiled_geo = {}
        with open(geodata_path, 'rb') as geodata_file:
            contents = geodata_file.read()
            dataset.geodata_file.save(geodata_path, ContentFile(contents))

            # convert to tiles and save to vector_tiles_file
            tile_index = geojson2vt.geojson2vt(
                json.loads(contents.decode()),
                {'indexMaxZoom': 12, 'maxZoom': 12, 'indexMaxPoints': 0},
            )
            for coord in tile_index.tile_coords:
                tile = tile_index.get_tile(coord['z'], coord['x'], coord['y'])
                features = tile.get('features')
                if features and len(features) > 0:
                    if not coord['z'] in tiled_geo:
                        tiled_geo[coord['z']] = {}
                    if not coord['x'] in tiled_geo[coord['z']]:
                        tiled_geo[coord['z']][coord['x']] = {}

                    tiled_geo[coord['z']][coord['x']][coord['y']] = vt2geojson.vt2geojson(tile)

        with open(tiled_geo_path, 'w') as tiled_geo_file:
            json.dump(tiled_geo, tiled_geo_file)
        with open(tiled_geo_path, 'rb') as tiled_geo_file:
            dataset.vector_tiles_file.save(
                tiled_geo_path,
                ContentFile(tiled_geo_file.read()),
            )

        print(f'\t Shapefile to GeoJSON conversion complete for {dataset.name}.')
        dataset.processing = False
        dataset.save()

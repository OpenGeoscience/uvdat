import json
import geopandas
import large_image_converter
import numpy
import rasterio
import shapefile
import tempfile
import zipfile

from django.core.files.base import ContentFile
from geojson2vt import geojson2vt, vt2geojson
from webcolors import name_to_hex
from pathlib import Path

from uvdat.core.models import RasterDataSource, VectorDataSource, VectorTile


def add_styling(geojson_data, style_options):
    if not style_options:
        return geojson_data

    outline = style_options.get('outline')
    palette = style_options.get('palette')
    color_property = style_options.get('color_property')
    color_delimiter = style_options.get('color_delimiter', ',')

    features = []
    for index, feature in enumerate(geojson_data.iterfeatures()):
        feature_colors = []
        if color_property:
            color_value = feature['properties'].get(color_property)
            if color_value:
                feature_colors += str(color_value).split(color_delimiter)

        if type(palette) == dict:
            feature_colors = [palette[c] for c in feature_colors if c in palette]
        elif type(palette) == list:
            feature_colors.append(palette[index % len(palette)])

        if outline:
            feature_colors.append(outline)

        feature_colors = [name_to_hex(c) for c in feature_colors]
        feature['properties']['colors'] = ','.join(feature_colors)
        features.append(feature)
    return geopandas.GeoDataFrame.from_features(features)


def create_raster_data_source(file_item, style_options):
    """Saves a RasterDataSource from a FileItem's contents."""

    new_data_source = RasterDataSource.objects.create(
        dataset=file_item.dataset,
        metadata={},
        default_style=style_options,
        index=file_item.index,
    )

    with tempfile.TemporaryDirectory() as temp_dir:
        raw_data_path = Path(temp_dir, 'raw_data.tiff')
        with open(raw_data_path, 'wb') as raw_data:
            with file_item.file.open('rb') as raw_data_archive:
                raw_data.write(raw_data_archive.read())

        transparency_threshold = style_options.get('transparency_threshold')
        trim_distribution_percentage = style_options.get('trim_distribution_percentage')

        raster_path = Path(temp_dir, 'raster.tiff')
        with open(raw_data_path, 'rb') as raw_data:
            input_data = rasterio.open(raw_data)
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
            file_item.dataset.metadata['data_range'] = band_range

            output_data.write(band, 1)
            output_data.close()

            cog_raster_path = Path(temp_dir, 'cog_raster.tiff')
            large_image_converter.convert(str(raster_path), str(cog_raster_path))
            with open(cog_raster_path, 'rb') as cog_raster_file:
                new_data_source.cloud_optimized_geotiff.save(
                    cog_raster_path, ContentFile(cog_raster_file.read())
                )

    return new_data_source


def create_vector_data_source(file_item, style_options):
    """Saves a VectorDataSource from a FileItem's contents."""

    new_data_source = VectorDataSource.objects.create(
        dataset=file_item.dataset,
        metadata={},
        default_style=style_options,
        index=file_item.index,
    )

    if file_item.file_type == 'zip':
        geojson_data = convert_zip_to_geojson(file_item)
    elif file_item.file_type == 'geojson' or file_item.file_type == 'json':
        original_data = json.load(file_item.file.open())
        original_projection = original_data.get('crs', {}).get('properties', {}).get('name')
        geojson_data = geopandas.GeoDataFrame.from_features(original_data.get('features'))
        if original_projection:
            geojson_data = geojson_data.set_crs(original_projection)
            geojson_data = geojson_data.to_crs(4326)

    geojson_data = add_styling(geojson_data, style_options)
    new_data_source.geojson_data = geojson_data.to_json()
    new_data_source.save()

    save_vector_tiles(new_data_source)
    available_tile_coords = new_data_source.get_available_tile_coords()
    print('\t', f'{len(available_tile_coords)} vector tiles created.')
    return new_data_source


def convert_zip_to_geojson(file_item):
    features = []
    original_projection = None
    with tempfile.TemporaryDirectory() as temp_dir:
        archive_path = Path(temp_dir, 'archive.zip')
        with open(archive_path, 'wb') as archive_file:
            archive_file.write(file_item.file.open('rb').read())
            with zipfile.ZipFile(archive_path) as zip_archive:
                filenames = zip_archive.namelist()
                for filename in filenames:
                    if filename.endswith('.shp'):
                        sf = shapefile.Reader(f'{archive_path}/{filename}')
                        features.extend(sf.__geo_interface__['features'])
                    if filename.endswith('.prj'):
                        original_projection = zip_archive.open(filename).read().decode()
        geodata = geopandas.GeoDataFrame.from_features(features)
        geodata = geodata.set_crs(original_projection, allow_override=True)
        geodata = geodata.to_crs(4326)
        return geodata


def save_vector_tiles(vector_data_source):
    tile_index = geojson2vt.geojson2vt(
        json.loads(vector_data_source.geojson_data),
        {'indexMaxZoom': 12, 'maxZoom': 12, 'indexMaxPoints': 0},
    )
    for coord in tile_index.tile_coords:
        tile = tile_index.get_tile(coord['z'], coord['x'], coord['y'])
        features = tile.get('features')
        if features and len(features) > 0:
            VectorTile.objects.create(
                data_source=vector_data_source,
                geojson_data=vt2geojson.vt2geojson(tile),
                x=coord['x'],
                y=coord['y'],
                z=coord['z'],
            )

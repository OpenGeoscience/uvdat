import json
from pathlib import Path
import tempfile
import zipfile
import shapely

from celery import shared_task
from django.core.files.base import ContentFile
from django.contrib.gis.geos import Point
from geojson2vt import geojson2vt, vt2geojson
import geopandas
import large_image_converter
import numpy
import rasterio
import shapefile

from uvdat.core.models import Dataset, NetworkNode
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
            transparency_threshold = options.get('transparency_threshold', transparency_threshold)
            trim_distribution_percentage = options.get(
                'trim_distribution_percentage', trim_distribution_percentage
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
                    if filename.endswith('.shp'):
                        sf = shapefile.Reader(f'{archive_path}/{filename}')
                        features.extend(sf.__geo_interface__['features'])
                    if filename.endswith('.prj'):
                        original_projection = zip_archive.open(filename).read().decode()

        features = add_styling(features, dataset.style)
        with open(geodata_path, 'w') as geodata_file:
            json.dump({'type': 'FeatureCollection', 'features': features}, geodata_file)
        geodata = geopandas.read_file(geodata_path)
        geodata = geodata.set_crs(original_projection, allow_override=True)

        geodata = geodata.to_crs(4326)
        if dataset.network:
            save_network_nodes(dataset, geodata)

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


def save_network_nodes(dataset, geodata):
    connection_column = None
    connection_column_delimiter = None
    node_id_column = None
    if dataset.metadata:
        connection_column = dataset.metadata.get('connection_column')
        connection_column_delimiter = dataset.metadata.get('connection_column_delimiter')
        node_id_column = dataset.metadata.get('node_id_column')
    if connection_column is None or connection_column not in geodata.columns:
        raise ValueError(
            f'This dataset does not specify a valid \
                "connection_column" in its options. Column options are {geodata.columns}.'
        )
    if connection_column_delimiter is None:
        raise ValueError(
            'This dataset does not specify a "connection_column_delimiter" in its options.'
        )
    if node_id_column is None or node_id_column not in geodata.columns:
        raise ValueError(
            f'This dataset does not specify a valid \
                "node_id_column" in its options. Column options are {geodata.columns}.'
        )

    geodata = geodata.copy()
    edge_set = geodata[geodata.geom_type != 'Point']
    node_set = geodata[geodata.geom_type == 'Point']

    adjacencies = {}
    total_adjacencies = 0
    unique_routes = node_set[connection_column].drop_duplicates()
    unique_routes = unique_routes[~unique_routes.str.contains(connection_column_delimiter)]
    for unique_route in unique_routes:
        nodes = node_set[node_set[connection_column].str.contains(unique_route)]
        edges = edge_set[edge_set[connection_column].str.contains(unique_route)]

        # create one route line from all edges in this group
        route = edges.unary_union
        if route.geom_type == 'MultiLineString':
            route = shapely.ops.linemerge(route)
        route = shapely.extract_unique_points(route.segmentize(10))
        route_points = geopandas.GeoDataFrame(geometry=list(route.geoms)).set_crs(node_set.crs)

        # convert both nodes and route to a projected crs
        # for better accuracy of the sjoin_nearest function to follow
        nodes = nodes.to_crs(3857)
        route_points = route_points.to_crs(3857)

        # along the points of the route, find the nodes that are nearest (in order of the route points)
        route_points_nearest_nodes = route_points.sjoin_nearest(nodes).sort_index()
        route_nodes = list(
            route_points_nearest_nodes.drop_duplicates(subset=[node_id_column])[node_id_column]
        )

        # print(unique_route, route_nodes)

        # record adjacencies from the ordered route nodes list
        for i in range(len(route_nodes) - 1):
            current_node_id = route_nodes[i]
            adjacent_node_id = route_nodes[i + 1]

            if current_node_id not in adjacencies:
                adjacencies[current_node_id] = []
            if adjacent_node_id not in adjacencies:
                adjacencies[adjacent_node_id] = []

            if adjacent_node_id not in adjacencies[current_node_id]:
                adjacencies[current_node_id].append(adjacent_node_id)
                total_adjacencies += 1
            if current_node_id not in adjacencies[adjacent_node_id]:
                adjacencies[adjacent_node_id].append(current_node_id)

    # print('total connections=', total_adjacencies)

    # Create all NetworkNode objects first, then populate adjacencies after.
    dataset.network_nodes.all().delete()
    node_set = node_set.drop_duplicates(subset=[node_id_column])
    for i, node in node_set.iterrows():
        properties = node.drop(['geometry', 'colors', node_id_column])
        properties = properties.replace(numpy.nan, 'None')
        location = Point(x=node.geometry.x, y=node.geometry.y)
        NetworkNode(
            name=node[node_id_column],
            dataset=dataset,
            location=location,
            properties=dict(properties),
        ).save()
    for i, node in node_set.iterrows():
        adjacent_node_ids = adjacencies.get(node[node_id_column])
        if not adjacent_node_ids:
            continue
        node_object = NetworkNode.objects.get(name=node[node_id_column])
        node_object.adjacent_nodes.set(NetworkNode.objects.filter(name__in=adjacent_node_ids))
        node_object.save()

    # network_to_geojson(dataset)


def network_to_geojson(dataset):
    # create a geojson representation for testing
    write_geojson = True
    if write_geojson:
        import geojson

        point_features = []
        edge_features = {}
        for node in NetworkNode.objects.filter(dataset=dataset):
            point_features.append(
                geojson.Feature(
                    geometry=geojson.Point(node.location),
                    properties=dict(node.properties, name=node.name),
                )
            )
            for adj in node.adjacent_nodes.all():
                connection_key = '/'.join(sorted([node.name, adj.name]))
                if connection_key not in edge_features:
                    edge_features[connection_key] = geojson.Feature(
                        geometry=geojson.LineString(
                            (
                                (node.location.x, node.location.y),
                                (adj.location.x, adj.location.y),
                            )
                        )
                    )

        feature_collection = geojson.FeatureCollection([*point_features, *edge_features.values()])
        with open('temp.geojson', 'w') as f:
            geojson.dump(feature_collection, f)

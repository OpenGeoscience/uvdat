from datetime import datetime
import os
from pathlib import Path
import random
import tempfile
import zipfile

from celery import shared_task
from django.core.files.base import ContentFile
from django_large_image import tilesource, utilities
import large_image
import shapely

from uvdat.core.tasks.networks import NODE_RECOVERY_MODES, get_network_graph, sort_graph_centrality


def get_network_node_elevations(network_nodes, elevation_data):
    with tempfile.TemporaryDirectory() as tmp:
        raster_path = Path(tmp, 'raster')
        with open(raster_path, 'wb') as raster_file:
            raster_file.write(elevation_data.cloud_optimized_geotiff.read())
        source = large_image.open(raster_path)
        data, data_format = source.getRegion(format='numpy')
        data = data[:, :, 0]
        metadata = tilesource.get_metadata(source)
        source_bounds = metadata.get('bounds')

        elevations = {}
        for network_node in network_nodes:
            # same logic as client-side tooltip
            location = network_node.location
            x_proportion = (location[0] - source_bounds.get('xmin')) / (
                source_bounds.get('xmax') - source_bounds.get('xmin')
            )
            y_proportion = (location[1] - source_bounds.get('ymin')) / (
                source_bounds.get('ymax') - source_bounds.get('ymin')
            )
            x_index = int(x_proportion * len(data[0]))
            y_index = int(y_proportion * len(data))
            elevations[network_node.id] = data[y_index, x_index]
        return elevations


@shared_task
def flood_scenario_1(simulation_result_id, network, elevation_data, flood_area):
    from uvdat.core.models import Network, RasterMapLayer, SimulationResult, VectorMapLayer

    result = SimulationResult.objects.get(id=simulation_result_id)
    try:
        network = Network.objects.get(id=network)
        elevation_data = RasterMapLayer.objects.get(id=elevation_data)
        flood_area = VectorMapLayer.objects.get(id=flood_area)
    except Exception:
        result.error_message = 'Object not found.'
        result.save()
        return

    if (
        network.nodes.count() < 1
        or elevation_data.dataset.category != 'elevation'
        or flood_area.dataset.category != 'flood'
    ):
        result.error_message = 'Invalid dataset selected.'
        result.save()
        return

    node_failures = []
    network_nodes = network.nodes.all()
    flood_geodata = flood_area.read_geojson_data()
    flood_areas = [
        shapely.geometry.shape(feature['geometry']) for feature in flood_geodata['features']
    ]
    for network_node in network_nodes:
        node_point = shapely.geometry.Point(*network_node.location)
        if any(flood_area.contains(node_point) for flood_area in flood_areas):
            node_failures.append(network_node)

    node_elevations = get_network_node_elevations(network_nodes, elevation_data)
    node_failures.sort(key=lambda n: node_elevations[n.id])

    result.output_data = {'node_failures': [n.id for n in node_failures]}
    result.save()


@shared_task
def recovery_scenario(simulation_result_id, node_failure_simulation_result, recovery_mode):
    from uvdat.core.models import Network, SimulationResult

    result = SimulationResult.objects.get(id=simulation_result_id)
    try:
        node_failure_simulation_result = SimulationResult.objects.get(
            id=node_failure_simulation_result
        )
    except SimulationResult.DoesNotExist:
        result.error_message = 'Node failure simulation result not found.'
        result.save()
        return
    if recovery_mode not in NODE_RECOVERY_MODES:
        result.error_message = f'Invalid recovery mode {recovery_mode}.'
        result.save()
        return

    node_failures = node_failure_simulation_result.output_data['node_failures']
    node_recoveries = node_failures.copy()
    if recovery_mode == 'random':
        random.shuffle(node_recoveries)
    else:
        network_id = node_failure_simulation_result.input_args['network']
        try:
            network = Network.objects.get(id=network_id)
        except Network.DoesNotExist:
            result.error_message = 'Network not found.'
            result.save()
            return
        graph = get_network_graph(network)
        nodes_sorted, edge_list = sort_graph_centrality(graph, recovery_mode)
        node_recoveries.sort(key=lambda n: nodes_sorted.index(n))

    result.output_data = {
        'node_failures': node_failures,
        'node_recoveries': node_recoveries,
    }
    result.save()


@shared_task
def segment_curbs(simulation_result_id, imagery_layer):
    from tile2net import Raster

    from uvdat.core.models import Dataset, FileItem, RasterMapLayer, SimulationResult

    result = SimulationResult.objects.get(id=simulation_result_id)
    try:
        imagery_layer = RasterMapLayer.objects.get(id=imagery_layer)
    except Exception:
        result.error_message = 'Object not found.'
        result.save()
        return

    # use django-large-image to open file;
    # uses slippy map coords instead of pixel coords to comply with tile2net
    imagery_path = utilities.field_file_to_local_path(imagery_layer.cloud_optimized_geotiff)
    source = tilesource.get_tilesource_from_path(imagery_path, projection='EPSG:3857')
    metadata = source.getMetadata()
    zoom = metadata['levels'] - 1
    bounds = metadata.get('sourceBounds')
    bbox = [bounds['ymin'], bounds['xmin'], bounds['ymax'], bounds['xmax']]

    with tempfile.TemporaryDirectory() as tmp:
        xyz_folder = Path(tmp, 'xyz')
        xyz_folder.mkdir(parents=True, exist_ok=True)
        output_folder = Path(tmp, 'output')
        output_folder.mkdir(parents=True, exist_ok=True)
        raster = Raster(
            location=bbox,
            name='area',
            input_dir=f'{str(xyz_folder)}/x_y.png',
            output_dir=output_folder,
            zoom=zoom,
        )
        for tile_row in raster.tiles:
            for tile_spec in tile_row:
                x, y = tile_spec.xtile, tile_spec.ytile
                tile_path = xyz_folder / f'{x}_{y}.png'
                tile = source.getTile(x, y, zoom, pilImageAllowed=True)
                tile.save(tile_path)

        try:
            stitch_step = 4
            raster.generate(stitch_step)
            # inference step requires NVIDIA driver and increased memory limit
            raster.inference()

            dataset_ids = []
            for result_set in ['polygons', 'network']:
                result_folder = next(output_folder.glob(f'area/{result_set}'))
                zip_path = output_folder / f'{result_set}.zip'
                if result_folder.exists():
                    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
                        for result_file_path in result_folder.glob('**/*'):
                            if result_file_path.is_file():
                                z.write(str(result_file_path))
                if zip_path.exists():
                    dataset_name = f'Generated {result_set} for {imagery_layer.dataset.name}'
                    existing_count = Dataset.objects.filter(name__contains=dataset_name).count()
                    if existing_count:
                        dataset_name += f' ({existing_count + 1})'
                    dataset = Dataset.objects.create(
                        name=dataset_name,
                        description='Segmentation generated by tile2net from orthoimagery',
                        category='segmentation',
                        dataset_type=Dataset.DatasetType.VECTOR,
                        metadata={'creation_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')},
                    )
                    result.project.datasets.add(dataset)
                    file_item = FileItem.objects.create(
                        name=zip_path.name,
                        dataset=dataset,
                        file_type='zip',
                        file_size=os.path.getsize(zip_path),
                    )
                    with zip_path.open('rb') as f:
                        file_item.file.save(zip_path, ContentFile(f.read()))
                    dataset.spawn_conversion_task(asynchronous=False)
                    dataset_ids.append(dataset.id)
            result.output_data = {'dataset_ids': dataset_ids}
        except Exception as e:
            result.error_message = str(e)
    result.save()

import json
import osmnx

from celery import shared_task
from django.contrib.gis.geos import LineString, Point
from django.core.files.base import ContentFile

from uvdat.core.models import Context, Dataset, FileItem, NetworkEdge, NetworkNode, VectorMapLayer
from uvdat.core.tasks.map_layers import save_vector_features
from uvdat.core.tasks.networks import geojson_from_network


def get_or_create_road_dataset(context, location):
    dataset, created = Dataset.objects.get_or_create(
        name=f'{location} Road Network',
        description='Roads and intersections retrieved from OpenStreetMap via OSMnx',
        dataset_type=Dataset.DatasetType.VECTOR,
        category='transportation',
    )
    if created:
        context.datasets.add(dataset)

    print('Clearing previous results...')
    FileItem.objects.filter(dataset=dataset).delete()
    NetworkNode.objects.filter(dataset=dataset).delete()
    NetworkEdge.objects.filter(dataset=dataset).delete()
    return dataset


def metadata_for_row(row):
    return {
        k: v
        for k, v in row.to_dict().items()
        if k not in ['osmid', 'geometry', 'ref'] and str(v) != 'nan'
    }


@shared_task
def load_roads(context_id, location):
    context = Context.objects.get(id=context_id)
    dataset = get_or_create_road_dataset(context, location)

    print(f'Fetching road data for {location}...')
    roads = osmnx.graph_from_place(location, network_type='drive')
    road_nodes, road_edges = osmnx.graph_to_gdfs(roads)

    print('Traversing data and saving to database...')
    for _, edge_data in road_edges.iterrows():
        edge_geom = edge_data['geometry'].coords
        start = edge_geom[0]
        end = edge_geom[-1]
        edge_name = edge_data['name']
        if str(edge_name) == 'nan' or len(str(edge_name)) < 2:
            # If name is invalid, write new name string
            edge_name = 'Unnamed Road at {:0.4f}/{:0.4f}'.format(
                *edge_geom[int(len(edge_geom) / 2)]
            )

        start_node_data = road_nodes.loc[
            (road_nodes['x'] == start[0]) & (road_nodes['y'] == start[1])
        ].iloc[0]
        end_node_data = road_nodes.loc[
            (road_nodes['x'] == end[0]) & (road_nodes['y'] == end[1])
        ].iloc[0]

        start_node, created = NetworkNode.objects.get_or_create(
            dataset=dataset,
            name='{:0.5f}/{:0.5f}'.format(*start),
            location=Point(*start),
        )
        start_node.metadata = metadata_for_row(start_node_data)
        start_node.save()
        end_node, created = NetworkNode.objects.get_or_create(
            dataset=dataset,
            name='{:0.5f}/{:0.5f}'.format(*end),
            location=Point(*end),
        )
        end_node.metadata = metadata_for_row(end_node_data)
        end_node.save()
        edge, created = NetworkEdge.objects.get_or_create(
            dataset=dataset,
            name=edge_name,
            directed=edge_data['oneway'],
            from_node=start_node,
            to_node=end_node,
            line_geometry=LineString(*[Point(*p) for p in edge_geom]),
        )
        edge.metadata = metadata_for_row(edge_data)
        edge.save()

    geojson = geojson_from_network(dataset)
    file_item = FileItem.objects.create(
        name=f'{location} Roads', dataset=dataset, file_type='geojson'
    )
    file_item.file.save('roads.geojson', ContentFile(json.dumps(geojson).encode()))
    vector_map_layer = VectorMapLayer.objects.create(
        file_item=file_item, metadata={'network': True}
    )
    vector_map_layer.write_geojson_data(geojson)
    save_vector_features(vector_map_layer)
    print('Done.')

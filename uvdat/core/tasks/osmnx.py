from celery import shared_task
from django.contrib.gis.geos import LineString, Point
import osmnx

from uvdat.core.models import (
    Dataset,
    Layer,
    LayerFrame,
    Network,
    NetworkEdge,
    NetworkNode,
    Project,
    VectorData,
)
from uvdat.core.tasks.data import create_vector_features
from uvdat.core.tasks.networks import geojson_from_network


def get_or_create_road_dataset(project, location):
    dataset, created = Dataset.objects.get_or_create(
        name=f'{location} Road Network',
        description='Roads and intersections retrieved from OpenStreetMap via OSMnx',
        category='transportation',
    )
    if created:
        project.datasets.add(dataset)

    print('Clearing previous results...')
    Network.objects.filter(vector_data__dataset=dataset).delete()
    VectorData.objects.filter(dataset=dataset).delete()
    Layer.objects.filter(dataset=dataset).delete()
    return dataset


def metadata_for_row(row):
    return {
        k: v
        for k, v in row.to_dict().items()
        if k not in ['osmid', 'geometry', 'ref'] and str(v) != 'nan'
    }


@shared_task
def load_roads(project_id, location):
    project = Project.objects.get(id=project_id)
    dataset = get_or_create_road_dataset(project, location)
    vector_data = VectorData.objects.create(
        name=f'{location} Road Vector Data',
        dataset=dataset,
    )
    layer = Layer.objects.create(
        name=f'{location} Roads',
        dataset=dataset,
    )
    LayerFrame.objects.create(name='Frame 0', layer=layer, vector=vector_data)
    network = Network.objects.create(
        name=f'{location} Road Network',
        category='roads',
        vector_data=vector_data,
        metadata={'source': 'Fetched with OSMnx.'},
    )

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
            network=network,
            name='{:0.5f}/{:0.5f}'.format(*start),
            location=Point(*start),
        )
        start_node.metadata = metadata_for_row(start_node_data)
        start_node.save()
        end_node, created = NetworkNode.objects.get_or_create(
            network=network,
            name='{:0.5f}/{:0.5f}'.format(*end),
            location=Point(*end),
        )
        end_node.metadata = metadata_for_row(end_node_data)
        end_node.save()
        edge, created = NetworkEdge.objects.get_or_create(
            network=network,
            name=edge_name,
            directed=edge_data['oneway'],
            from_node=start_node,
            to_node=end_node,
            line_geometry=LineString(*[Point(*p) for p in edge_geom]),
        )
        edge.metadata = metadata_for_row(edge_data)
        edge.save()

    vector_data.write_geojson_data(geojson_from_network(dataset))
    create_vector_features(vector_data)
    vector_data.get_summary()
    print('Done.')

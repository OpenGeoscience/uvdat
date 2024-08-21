import json

from django.contrib.gis.geos import LineString, Point
import geopandas
import networkx as nx
import numpy
import shapely

from uvdat.core.models import Network, NetworkEdge, NetworkNode, VectorFeature, VectorMapLayer

NODE_RECOVERY_MODES = [
    'random',
    'betweenness',
    'degree',
    'information',
    'eigenvector',
    'load',
    'closeness',
    'second order',
]


def create_network(vector_map_layer, network_options):
    # Overwrite previous results
    dataset = vector_map_layer.dataset
    Network.objects.filter(dataset=dataset).delete()
    network = Network.objects.create(
        dataset=dataset, category=dataset.category, metadata={'source': 'Parsed from GeoJSON.'}
    )

    connection_column = network_options.get('connection_column')
    connection_column_delimiter = network_options.get('connection_column_delimiter')
    node_id_column = network_options.get('node_id_column')

    source_data = vector_map_layer.read_geojson_data()
    geodata = geopandas.GeoDataFrame.from_features(source_data.get('features')).set_crs(4326)
    geodata[connection_column].fillna('', inplace=True)
    edge_set = geodata[geodata.geom_type != 'Point']
    node_set = geodata[geodata.geom_type == 'Point']

    unique_routes = node_set[connection_column].drop_duplicates()
    unique_routes = unique_routes[~unique_routes.str.contains(connection_column_delimiter)]
    for unique_route in unique_routes:
        nodes = node_set[node_set[connection_column].str.contains(unique_route, regex=False)]
        edges = edge_set[edge_set[connection_column].str.contains(unique_route, regex=False)]

        # create one route line from all edges in this group
        if len(edges) < 1:
            continue
        route = edges.unary_union
        if route.geom_type == 'MultiLineString':
            route = shapely.ops.linemerge(route)
        route = shapely.extract_unique_points(route.segmentize(10))
        route_points = geopandas.GeoDataFrame(geometry=list(route.geoms)).set_crs(node_set.crs)

        # convert both nodes and route to a projected crs
        # for better accuracy of the sjoin_nearest function to follow
        nodes_reprojected = nodes.copy().to_crs(3857)
        route_points_reprojected = route_points.copy().to_crs(3857)

        # along the points of the route, find the nodes that are nearest
        # (in order of the route points)
        route_points_nearest_nodes = route_points_reprojected.sjoin_nearest(
            nodes_reprojected, distance_col='distance'
        )

        # find cutoff points where one edge geometry stops and another begins
        cutoff_points = {}
        for nearest_node, point_group in route_points_nearest_nodes.groupby(node_id_column):
            cutoff_point = point_group.sort_values(by=['distance']).iloc[0]
            cutoff_points[nearest_node] = cutoff_point['geometry']

        # use ordered node names to create NetworkNode objects
        # and cutoff points to create NetworkEdge objects
        route_nodes = route_points_nearest_nodes.drop_duplicates(
            subset=[node_id_column]
        ).reset_index()
        for i, current_node in route_nodes.iterrows():
            current_node_name = current_node[node_id_column]
            # refer back to node_set for coords with original projection
            current_node_coordinates = node_set.loc[
                node_set[node_id_column] == current_node_name
            ].iloc[0]['geometry']

            try:
                from_node_obj = NetworkNode.objects.get(
                    network=network,
                    name=current_node_name,
                )
            except NetworkNode.DoesNotExist:
                from_node_obj = NetworkNode.objects.create(
                    network=network,
                    name=current_node_name,
                    location=Point(
                        current_node_coordinates.x,
                        current_node_coordinates.y,
                    ),
                    metadata={
                        k: v
                        for k, v in current_node.to_dict().items()
                        if k not in ['index', 'geometry', 'index_right', 'distance']
                        and str(v).lower() != 'nan'
                    },
                )

            if i < len(route_nodes) - 1:
                next_node = route_nodes.iloc[i + 1]
                next_node_name = next_node[node_id_column]
                # refer back to node_set for coords with original projection
                next_node_coordinates = node_set.loc[
                    node_set[node_id_column] == next_node_name
                ].iloc[0]['geometry']

                try:
                    to_node_obj = NetworkNode.objects.get(
                        network=network,
                        name=next_node_name,
                    )
                except NetworkNode.DoesNotExist:
                    to_node_obj = NetworkNode.objects.create(
                        network=network,
                        name=next_node_name,
                        location=Point(
                            next_node_coordinates.x,
                            next_node_coordinates.y,
                        ),
                        metadata={
                            k: v
                            for k, v in next_node.to_dict().items()
                            if k not in ['index', 'geometry', 'index_right', 'distance']
                            and str(v).lower() != 'nan'
                        },
                    )

                route_points_start_index = route_points_reprojected.index[
                    route_points_reprojected['geometry'] == cutoff_points[current_node_name]
                ][0]
                route_points_end_index = route_points_reprojected.index[
                    route_points_reprojected['geometry'] == cutoff_points[next_node_name]
                ][0]

                edge_points = route_points[  # use original projection
                    route_points_start_index : route_points_end_index + 1  # +1 to include end
                ]
                edge_line_geometry = LineString(*[Point(p.x, p.y) for p in edge_points['geometry']])

                try:
                    NetworkEdge.objects.get(
                        network=network,
                        name=f'{current_node_name} - {next_node_name}',
                    )
                except NetworkEdge.DoesNotExist:
                    metadata = json.loads(
                        json.dumps(
                            edge_set.loc[edge_set[connection_column] == unique_route]
                            .loc[:, edge_set.columns != 'geometry']
                            .iloc[0]
                            .fillna('')
                            .to_dict()
                        )
                    )
                    NetworkEdge.objects.create(
                        network=network,
                        name=f'{current_node_name} - {next_node_name}',
                        from_node=from_node_obj,
                        to_node=to_node_obj,
                        line_geometry=edge_line_geometry,
                        metadata=metadata,
                    )
    # rewrite vector_map_layer geojson_data with updated features
    vector_map_layer.write_geojson_data(geojson_from_network(vector_map_layer.dataset))
    vector_map_layer.metadata['network'] = True
    vector_map_layer.save()


def geojson_from_network(dataset):
    total_nodes = 0
    total_edges = 0
    new_feature_set = []
    for n in NetworkNode.objects.filter(network__dataset=dataset):
        node_as_feature = {
            'id': n.id,
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': n.location.coords,
            },
            'properties': dict(node_id=n.id, **n.metadata),
        }
        new_feature_set.append(node_as_feature)
        total_nodes += 1

    for e in NetworkEdge.objects.filter(network__dataset=dataset):
        edge_as_feature = {
            'id': e.id,
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': e.line_geometry.coords,
            },
            'properties': dict(
                edge_id=e.id,
                from_node_id=e.from_node.id,
                to_node_id=e.to_node.id,
                **e.metadata,
            ),
        }
        new_feature_set.append(edge_as_feature)
        total_edges += 1

    new_geodata = geopandas.GeoDataFrame.from_features(new_feature_set)
    print('\t', f'GeoJSON feature set created for {total_nodes} nodes and {total_edges} edges.')
    return new_geodata.to_json()


def create_vector_features_from_network(network):
    map_layer, _ = VectorMapLayer.objects.get_or_create(dataset=network.dataset, index=0)
    VectorFeature.objects.bulk_create(
        [
            VectorFeature(
                map_layer=map_layer,
                geometry=node.location,
                properties=dict(node_id=node.id, **node.metadata),
            )
            for node in network.nodes.all()
        ]
    )
    VectorFeature.objects.bulk_create(
        [
            VectorFeature(
                map_layer=map_layer,
                geometry=edge.line_geometry,
                properties=dict(
                    edge_id=edge.id,
                    from_node_id=edge.from_node.id,
                    to_node_id=edge.to_node.id,
                    **edge.metadata,
                ),
            )
            for edge in network.edges.all()
        ]
    )


def get_network_graph(network):
    from uvdat.core.models import NetworkEdge, NetworkNode

    network = {
        'nodes': NetworkNode.objects.filter(network=network),
        'edges': NetworkEdge.objects.filter(network=network),
    }
    if len(network.get('nodes')) == 0 and len(network.get('edges')) == 0:
        return None

    # Construct adj list
    edge_list: dict[int, list[int]] = {}
    for e in network.get('edges'):
        if e.from_node.id not in edge_list:
            edge_list[e.from_node.id] = []
        edge_list[e.from_node.id].append(e.to_node.id)
    for edge_id in edge_list.keys():
        edge_list[edge_id].sort()
    graph_representation = nx.from_dict_of_lists(edge_list)
    return graph_representation


# Authored by Jack Watson
# Takes in a second argument, measure, which is a string specifying the centrality
# measure to calculate.
def sort_graph_centrality(g, measure):
    if measure == 'betweenness':
        cent = nx.betweenness_centrality(g)  # get betweenness centrality
    elif measure == 'degree':
        cent = nx.degree_centrality(g)
    elif measure == 'information':
        cent = nx.current_flow_closeness_centrality(g)
    elif measure == 'eigenvector':
        cent = nx.eigenvector_centrality(g, 10000)
    elif measure == 'load':
        cent = nx.load_centrality(g)
    elif measure == 'closeness':
        cent = nx.closeness_centrality(g)
    elif measure == 'second order':
        cent = nx.second_order_centrality(g)
    cent_list = list(cent.items())  # convert to np array
    cent_arr = numpy.array(cent_list)
    cent_idx = numpy.argsort(cent_arr, 0)  # sort array of tuples by betweenness
    # cent_sorted = cent_arr[cent_idx[:, 1]]

    node_list = list(g.nodes())
    nodes_sorted = [node_list[i] for i in cent_idx[:, 1]]
    edge_list = list(g.edges())

    # Currently sorted from lowest to highest betweenness; let's reverse that
    nodes_sorted.reverse()

    return nodes_sorted, edge_list

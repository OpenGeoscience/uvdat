import geopandas
import networkx as nx
import numpy
import shapely

from django.contrib.gis.geos import Point, LineString

from uvdat.core.models import NetworkNode, NetworkEdge

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
    connection_column = network_options.get('connection_column')
    connection_column_delimiter = network_options.get('connection_column_delimiter')
    node_id_column = network_options.get('node_id_column')

    source_data = vector_map_layer.get_geojson_data()
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
        nodes = nodes.to_crs(3857)
        route_points = route_points.to_crs(3857)

        # along the points of the route, find the nodes that are nearest (in order of the route points)
        route_points_nearest_nodes = route_points.sjoin_nearest(nodes, distance_col='distance')

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

            try:
                from_node_obj = NetworkNode.objects.get(
                    dataset=vector_map_layer.file_item.dataset,
                    name=current_node_name,
                )
            except NetworkNode.DoesNotExist:
                from_node_obj = NetworkNode.objects.create(
                    dataset=vector_map_layer.file_item.dataset,
                    name=current_node_name,
                    location=Point(
                        current_node['geometry'].x,
                        current_node['geometry'].y,
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

                try:
                    to_node_obj = NetworkNode.objects.get(
                        dataset=vector_map_layer.file_item.dataset,
                        name=next_node_name,
                    )
                except NetworkNode.DoesNotExist:
                    to_node_obj = NetworkNode.objects.create(
                        dataset=vector_map_layer.file_item.dataset,
                        name=next_node_name,
                        location=Point(
                            next_node['geometry'].x,
                            next_node['geometry'].y,
                        ),
                        metadata={
                            k: v
                            for k, v in next_node.to_dict().items()
                            if k not in ['index', 'geometry', 'index_right', 'distance']
                            and str(v).lower() != 'nan'
                        },
                    )

                route_points_start_index = route_points.index[
                    route_points['geometry'] == cutoff_points[current_node_name]
                ][0]
                route_points_end_index = route_points.index[
                    route_points['geometry'] == cutoff_points[next_node_name]
                ][0]

                edge_points = route_points[
                    route_points_start_index : route_points_end_index + 1  # +1 to include end
                ]['geometry']
                edge_line_geometry = LineString(*[Point(p.x, p.y) for p in edge_points])

                try:
                    NetworkEdge.objects.get(
                        dataset=vector_map_layer.file_item.dataset,
                        name=f'{current_node_name} - {next_node_name}',
                    )
                except NetworkEdge.DoesNotExist:
                    NetworkEdge.objects.create(
                        dataset=vector_map_layer.file_item.dataset,
                        name=f'{current_node_name} - {next_node_name}',
                        from_node=from_node_obj,
                        to_node=to_node_obj,
                        line_geometry=edge_line_geometry,
                        metadata={},
                    )

    total_nodes = 0
    total_edges = 0
    new_feature_set = []
    # rewrite vector_map_layer geojson_data with updated features
    for n in NetworkNode.objects.filter(dataset=vector_map_layer.file_item.dataset):
        node_as_feature = {
            'id': i,
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': n.location.coords,
            },
            'properties': dict(node_id=n.id, **n.metadata),
        }
        new_feature_set.append(node_as_feature)
        total_nodes += 1

    for e in NetworkEdge.objects.filter(dataset=vector_map_layer.file_item.dataset):
        edge_as_feature = {
            'id': i,
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': e.line_geometry.coords,
            },
            'properties': dict(edge_id=e.id, **e.metadata),
        }
        new_feature_set.append(edge_as_feature)
        total_edges += 1

    new_geodata = geopandas.GeoDataFrame.from_features(new_feature_set)
    vector_map_layer.save_geojson_data(new_geodata)
    vector_map_layer.save()
    print('\t', f'{total_nodes} nodes and {total_edges} edges created.')


def construct_edge_list(dataset):
    network_nodes = dataset.network_nodes.values_list('id', flat=True)
    edges = NetworkNode.adjacent_nodes.through.objects.filter(
        from_networknode_id__in=network_nodes, to_networknode_id__in=network_nodes
    ).values_list('from_networknode_id', 'to_networknode_id')

    # Construct adj list
    edge_list: dict[int, list[int]] = {}
    for start, end in edges:
        if start not in edge_list:
            edge_list[start] = []

        edge_list[start].append(end)

    # Ensure that the type of all keys is an integer
    assert all(isinstance(x, int) for x in edge_list.keys())

    # Sort all node id lists
    for start_node in edge_list.keys():
        edge_list[start_node].sort()

    return edge_list


def network_gcc(edges: dict[int, list[int]], exclude_nodes: list[int]) -> list[int]:
    # Create graph, remove nodes, get GCC
    G = nx.from_dict_of_lists(edges)
    G.remove_nodes_from(exclude_nodes)
    gcc = max(nx.connected_components(G), key=len)

    # Return GCC's list of nodes
    return list(gcc)


# Authored by Jack Watson
# Takes in a second argument, measure, which is a string specifying the centrality
# measure to calculate.
def sort_graph_centrality(G, measure):
    if measure == 'betweenness':
        cent = nx.betweenness_centrality(G)  # get betweenness centrality
    elif measure == 'degree':
        cent = nx.degree_centrality(G)
    elif measure == 'information':
        cent = nx.current_flow_closeness_centrality(G)
    elif measure == 'eigenvector':
        cent = nx.eigenvector_centrality(G, 10000)
    elif measure == 'load':
        cent = nx.load_centrality(G)
    elif measure == 'closeness':
        cent = nx.closeness_centrality(G)
    elif measure == 'second order':
        cent = nx.second_order_centrality(G)
    cent_list = list(cent.items())  # convert to np array
    cent_arr = numpy.array(cent_list)
    cent_idx = numpy.argsort(cent_arr, 0)  # sort array of tuples by betweenness
    # cent_sorted = cent_arr[cent_idx[:, 1]]

    node_list = list(G.nodes())
    nodes_sorted = [node_list[i] for i in cent_idx[:, 1]]
    edge_list = list(G.edges())

    # Currently sorted from lowest to highest betweenness; let's reverse that
    nodes_sorted.reverse()

    return nodes_sorted, edge_list

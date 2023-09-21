from pathlib import Path
import tempfile

from django.contrib.gis.geos import Point
import geopandas
import networkx as nx
import numpy
import shapely

from uvdat.core.models import NetworkNode


NODE_RECOVERY_MODES = [
    'random',
    'betweenness',
    'degree',
    # requires scipy
    # 'information',
    'eigenvector',
    'load',
    'closeness',
    'second order',
]


def save_network_nodes(dataset):
    with tempfile.TemporaryDirectory() as temp_dir:
        geodata_path = Path(temp_dir, 'geo.json')
        with open(geodata_path, 'wb') as geodata_file:
            geodata_file.write(dataset.geodata_file.open('rb').read())
        geodata = geopandas.read_file(geodata_path)

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
        geodata[connection_column].fillna('', inplace=True)
        edge_set = geodata[geodata.geom_type != 'Point']
        node_set = geodata[geodata.geom_type == 'Point']

        adjacencies = {}
        total_adjacencies = 0
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


def construct_edge_list(dataset):
    edge_list = {}
    visited_nodes = []

    for node in dataset.network_nodes.all():
        adjacencies = [
            adj_node.id
            for adj_node in node.adjacent_nodes.all()
            if adj_node.id not in visited_nodes
        ]
        if len(adjacencies) > 0:
            edge_list[node.id] = sorted(adjacencies)
        visited_nodes.append(node.id)

    return edge_list


def network_gcc(edges: dict[str, list[int]], exclude_nodes: list[int]) -> list[int]:
    # Convert input keys to integer
    int_edges = {int(k): v for k, v in edges.items()}

    # Create graph, remove nodes, get GCC
    G = nx.from_dict_of_lists(int_edges)
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

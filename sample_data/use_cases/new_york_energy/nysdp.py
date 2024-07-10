import json
import geopandas
import numpy
import pandas
import requests
import shapely

from django.contrib.gis.geos import GEOSGeometry, Point, LineString
from uvdat.core.models import Dataset, Network, NetworkNode, NetworkEdge, VectorMapLayer, VectorFeature


NYDSP_URL = 'https://systemdataportal.nationalgrid.com/arcgis/rest/services/NYSDP'
RECORDS_PER_PAGE = 100
SERVICE_SUFFIX = 'MapServer'
FORMAT_SUFFIX = 'f=pjson'
QUERY_CONTENT = f'where=1%3D1&returnGeometry=true&outFields=*&resultRecordCount={RECORDS_PER_PAGE}&f=geojson'


def fetch_vector_features(service_name=None):
    feature_sets = {}
    if service_name is None:
        return feature_sets
    service_url = f'{NYDSP_URL}/{service_name}/{SERVICE_SUFFIX}'
    service_info = requests.get(f'{service_url}?{FORMAT_SUFFIX}').json()
    for layer in service_info.get('layers', []):
        feature_set = []
        layer_id = layer.get('id')
        if layer_id is not None:
            feature_page = None
            result_offset = 0
            while feature_page is None or len(feature_page) == RECORDS_PER_PAGE:
                query_response = requests.get(
                    f"{service_url}/{layer_id}/query?resultOffset={result_offset}&{QUERY_CONTENT}"
                ).json()
                feature_page = query_response.get('features', [])
                feature_set += feature_page
                result_offset += RECORDS_PER_PAGE
        if len(feature_set):
            feature_sets[layer_id] = feature_set
    return feature_sets


def create_vector_features(dataset, service_name=None):
    VectorMapLayer.objects.filter(dataset=dataset).delete()

    feature_sets = fetch_vector_features(service_name=service_name)
    vector_features = []
    for index, feature_set in feature_sets.items():
        map_layer = VectorMapLayer.objects.create(dataset=dataset, index=index)
        for feature in feature_set:
            vector_features.append(
                VectorFeature(
                    map_layer=map_layer,
                    geometry=GEOSGeometry(json.dumps(feature['geometry'])),
                    properties=feature['properties'],
                )
            )
    VectorFeature.objects.bulk_create(vector_features)


def vector_features_from_network(network):
    VectorMapLayer.objects.filter(dataset=network.dataset).delete()
    map_layer = VectorMapLayer.objects.create(dataset=network.dataset)
    VectorFeature.objects.bulk_create([
        VectorFeature(
            map_layer=map_layer,
            geometry=node.location,
            properties=node.metadata or {},
        )
        for node in network.nodes.all()
    ])
    VectorFeature.objects.bulk_create([
        VectorFeature(
            map_layer=map_layer,
            geometry=edge.line_geometry,
            properties=edge.metadata or {},
        )
        for edge in network.edges.all()
    ])


def create_consolidated_network(dataset):
    # VectorMapLayer.objects.filter(dataset=dataset).delete()
    # map_layer = VectorMapLayer.objects.create(dataset=dataset, index=0)
    # include_services = [
    #     "Substations",
    #     "DistAssetsOverview",
    #     "Electrification_Data",
    #     "EV_Load_Serving_Capacity",
    #     "Hosting_Capacity_Data",
    #     "LSRV",
    #     "NY_SubT_SDP"
    # ]

    # features = []
    # for service_name in include_services:
    #     try:
    #         d = Dataset.objects.get(name=f'National Grid {service_name}')
    #         print('\t', f'Using saved vector features for {service_name}...')
    #         features += [
    #             dict(
    #                 type='Feature',
    #                 geometry=json.loads(feature.geometry.json),
    #                 properties=feature.properties
    #             )
    #             for feature in VectorFeature.objects.filter(map_layer__dataset=d)
    #         ]
    #     except Dataset.DoesNotExist:
    #         print('\t', f'Querying {service_name}...')
    #         feature_sets = fetch_vector_features(service_name=service_name)
    #         for layer_id, feature_set in feature_sets.items():
    #             features += feature_set
    # print('\t', len(features), 'features found. Combining like geometries...')
    # print('features found:', len(features))

    # Use geopandas to merge properties of duplicate features
    # gdf = geopandas.GeoDataFrame.from_features(features)
    # gdf["geometry"] = gdf.normalize()

    # grouped = gdf.groupby(gdf['geometry'].to_wkt()).first()
    # print('\t', len(grouped), 'consolidated features found. Saving to database...')

    # TODO: color by properties

    # geojson = json.loads(grouped.to_json())
    # VectorFeature.objects.bulk_create([
    #     VectorFeature(
    #         map_layer=map_layer,
    #         geometry=GEOSGeometry(json.dumps(feature['geometry'])),
    #         properties=feature['properties'],
    #     )
    #     for feature in geojson.get('features')
    # ], batch_size=10000)

    from django.contrib.gis.geos import Polygon


    test_dataset, created = Dataset.objects.get_or_create(
        name="Test Network",
        category="energy",
        dataset_type="VECTOR"
    )
    Network.objects.filter(dataset=test_dataset).delete()
    network = Network.objects.create(dataset=test_dataset)

    test_bbox = dict(xmin=-74, ymin=42.8, xmax=-73.9, ymax=42.9)
    test_area = Polygon.from_bbox(
        [test_bbox['xmin'], test_bbox['ymin'], test_bbox['xmax'], test_bbox['ymax']]
    )
    features = [
        dict(
            type='Feature',
            geometry=json.loads(feature.geometry.json),
            properties=feature.properties
        )
        for feature in VectorFeature.objects.filter(
            map_layer__dataset=dataset,
            geometry__coveredby=test_area,
        )
    ]
    show_columns = [
        'geometry',
    ]
    pandas.set_option('display.max_columns', None)
    print('test features:', len(features))
    gdf = geopandas.GeoDataFrame.from_features(features)
    gdf["geometry"] = gdf.normalize()
    spatial_index = gdf.sindex

    # construct adjacencies list
    adjacencies = {}
    for feat_index, feature in gdf.iterrows():
        adjacencies[feat_index] = {}
        geom = feature['geometry']
        if geom.geom_type == 'MultiLineString':
            # attempt to merge contiguous portions
            geom = shapely.ops.linemerge(geom)
        geom_list = [geom]
        if geom.geom_type == 'MultiLineString':
            # if still multi, contains non-contiguous portions
            geom_list = geom.geoms

        for geom_index, geom in enumerate(geom_list):
            adjacencies[feat_index][geom_index] = {}
            # first and last points (endpoints of current geom)
            # assumes no intersections will occur in the middle of a line
            for coord_index, coord_name in [(0, 'start'), (-1, 'end')]:
                coord = shapely.geometry.Point(geom.coords[coord_index])
                nearest_indexes, distances = spatial_index.nearest(coord, max_distance=10, return_distance=True)
                geom_inds, tree_inds = nearest_indexes
                # exclude self from nearest results
                tree_inds = [int(i) for i in tree_inds if i != feat_index]
                node = None
                if len(tree_inds) != 1:
                    node = NetworkNode.objects.create(
                        name=f'{feat_index}_{geom_index}_{coord_name}',
                        network=network,
                        location=Point(*geom.coords[coord_index])
                    )
                adjacencies[feat_index][geom_index][coord_name] = dict(
                    node=node,
                    adjs=tree_inds,
                )

    visited = []
    def follow_adjacencies(feat_index, current_line=None, current_from_node=None):
        if feat_index not in visited:
            visited.append(feat_index)
            feat = gdf.iloc[feat_index]
            for geom_index, geom_record in adjacencies[feat_index].items():
                start_record = geom_record.get('start', {})
                start_node = start_record.get('node')
                start_adjs = start_record.get('adjs')

                end_record = geom_record.get('end', {})
                end_node = end_record.get('node')
                end_adjs = end_record.get('adjs')
                coords = []
                if feat['geometry'].geom_type == 'MultiLineString':
                    for geom in feat['geometry'].geoms:
                        coords += geom.coords
                else:
                    coords = feat['geometry'].coords

                if start_node and end_node:
                    # print('edge', start_node, end_node, 'len', len(coords))
                    NetworkEdge.objects.create(
                        name='edge',
                        network=network,
                        from_node=start_node,
                        to_node=end_node,
                        metadata={},  # TODO: figure out capturing metadata
                        line_geometry=LineString(*[
                            Point(*p) for p in coords
                        ])
                    )

                if current_line is None:
                    current_line = list(coords)
                else:
                    current_line += list(coords)

                follow_start_results = None
                follow_end_results = None
                if len(start_adjs) > 0:
                    for adj in start_adjs:
                        follow_start_results = follow_adjacencies(
                            adj, current_line=current_line, current_from_node=current_from_node or end_node
                        )
                if len(end_adjs) > 0:
                    for adj in end_adjs:
                        follow_end_results = follow_adjacencies(
                            adj, current_line=current_line, current_from_node=current_from_node or start_node
                        )

                start_line, start_from_node, end_line, end_from_node = None, None, None, None
                if follow_start_results:
                    start_line, start_from_node = follow_start_results
                if follow_end_results:
                    end_line, end_from_node = follow_end_results
                if current_from_node is None:
                    if start_line is not None and end_line is not None:
                        print(feat_index, 'combine lines', len(start_line), '+', len(end_lines), 'between', start_from_node, end_from_node)
                    if start_line is not None:
                        print(feat_index, 'start line!', start_from_node, end_from_node, current_from_node, start_node, end_node)
                    if end_line is not None:
                        print(feat_index, 'end line!', start_from_node, end_from_node, current_from_node, start_node, end_node)

            return current_line, current_from_node

    for feat_index in list(adjacencies.keys())[:5]:
        follow_adjacencies(feat_index)
    print('total nodes', NetworkNode.objects.filter(network=network).count())
    print('total edges', NetworkEdge.objects.filter(network=network).count())

    vector_features_from_network(network)

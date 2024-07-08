import json
import geopandas
import requests

from django.contrib.gis.geos import GEOSGeometry
from uvdat.core.models import Dataset, VectorMapLayer, VectorFeature


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


def create_consolidated_network(dataset):
    VectorMapLayer.objects.filter(dataset=dataset).delete()
    map_layer = VectorMapLayer.objects.create(dataset=dataset, index=0)
    include_services = [
        "Substations",
        "DistAssetsOverview",
        "Electrification_Data",
        "EV_Load_Serving_Capacity",
        "Hosting_Capacity_Data",
        "LSRV",
        "NY_SubT_SDP"
    ]

    features = []
    for service_name in include_services:
        try:
            dataset = Dataset.objects.get(name=f'National Grid {service_name}')
            print('\t', f'Using saved vector features for {service_name}...')
            features += [
                dict(
                    type='Feature',
                    geometry=json.loads(feature.geometry.json),
                    properties=feature.properties
                )
                for feature in VectorFeature.objects.filter(map_layer__dataset=dataset)
            ]
        except Dataset.DoesNotExist:
            print('\t', f'Querying {service_name}...')
            feature_sets = fetch_vector_features(service_name=service_name)
            for layer_id, feature_set in feature_sets.items():
                features += feature_set
    print('\t', len(features), 'features found. Combining like geometries...')

    # Use geopandas to merge properties of duplicate features
    gdf = geopandas.GeoDataFrame.from_features(features)
    gdf["geometry"] = gdf.normalize()

    grouped = gdf.groupby(gdf['geometry'].to_wkt()).first()
    intersects = grouped.sjoin(grouped, how='left', predicate='intersects')
    print('\t', len(grouped), 'consolidated features found. Saving to database...')

    geojson = json.loads(grouped.to_json())
    VectorFeature.objects.bulk_create([
        VectorFeature(
            map_layer=map_layer,
            geometry=GEOSGeometry(json.dumps(feature['geometry'])),
            properties=feature['properties'],
        )
        for feature in geojson.get('features')
    ])

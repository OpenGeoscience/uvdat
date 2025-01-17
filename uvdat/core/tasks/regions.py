import secrets

from django.contrib.gis.geos import GEOSGeometry
import geopandas

from uvdat.core.models import SourceRegion


def create_source_regions(vector_map_layer, region_options):
    name_property = region_options.get('name_property')
    geodata = vector_map_layer.read_geojson_data()

    region_count = 0
    new_feature_set = []
    for feature in geodata['features']:
        properties = feature['properties']
        geometry = feature['geometry']

        # Ensure a name field
        name = secrets.token_hex(10)
        if name_property and name_property in properties:
            name = properties[name_property]

        # Convert Polygon to MultiPolygon if necessary
        if geometry['type'] == 'Polygon':
            geometry['type'] = 'MultiPolygon'
            geometry['coordinates'] = [geometry['coordinates']]

        # Create region with properties and MultiPolygon
        region = SourceRegion(
            name=name,
            boundary=GEOSGeometry(str(geometry)),
            metadata=properties,
            dataset=vector_map_layer.dataset,
        )
        region.save()
        region_count += 1

        properties['region_id'] = region.id
        properties['region_name'] = region.name
        properties['dataset_id'] = region.dataset.id
        new_feature_set.append(
            {
                'id': region.id,
                'type': 'Feature',
                'geometry': geometry,
                'properties': properties,
            }
        )

    # Save updated features to layer
    new_geodata = geopandas.GeoDataFrame.from_features(new_feature_set).set_crs(3857)
    new_geodata.to_crs(4326)
    vector_map_layer.write_geojson_data(new_geodata.to_json())
    vector_map_layer.save()
    print('\t', f'{region_count} regions created.')

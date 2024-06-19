import json
import secrets
from typing import List

from django.contrib.gis.db.models.aggregates import Union
from django.contrib.gis.geos import GEOSGeometry
from django.db import transaction
import geopandas

from uvdat.core.models import Context, DerivedRegion, SourceRegion, VectorMapLayer
from uvdat.core.tasks.map_layers import save_vector_features


class DerivedRegionCreationError(Exception):
    pass


def create_derived_region(name: str, context: Context, region_ids: List[int], operation: str):
    # Ensure at least two regions provided
    source_regions = SourceRegion.objects.filter(pk__in=region_ids)
    if source_regions.count() < 2:
        raise DerivedRegionCreationError('Derived Regions must consist of multiple regions')

    # Ensure all regions are from one context
    if any(not sr.is_in_context(context.id) for sr in source_regions):
        raise DerivedRegionCreationError(
            f'Source Regions must exist in the same context with id {context.id}.'
        )

    # Only handle union operations for now
    if operation == DerivedRegion.VectorOperation.INTERSECTION:
        raise DerivedRegionCreationError('Intersection Operation not yet supported')

    # Simply include all multipolygons from all source regions
    # Convert Polygon to MultiPolygon if necessary
    geojson = json.loads(source_regions.aggregate(polys=Union('boundary'))['polys'].geojson)
    if geojson['type'] == 'Polygon':
        geojson['type'] = 'MultiPolygon'
        geojson['coordinates'] = [geojson['coordinates']]

    # Form proper Geometry object
    new_boundary = GEOSGeometry(json.dumps((geojson)))

    # Check for duplicate derived regions
    existing = list(
        DerivedRegion.objects.filter(
            context=context, boundary=GEOSGeometry(new_boundary)
        ).values_list('id', flat=True)
    )
    if existing:
        raise DerivedRegionCreationError(
            f'Derived Regions with identical boundary already exist: {existing}'
        )

    # Save and return
    with transaction.atomic():
        new_map_layer = VectorMapLayer.objects.create(
            metadata={},
            default_style={},
            index=0,
        )
        new_map_layer.write_geojson_data(geojson)
        new_map_layer.save()
        save_vector_features(new_map_layer)

        derived_region = DerivedRegion.objects.create(
            name=name,
            context=context,
            metadata={},
            boundary=new_boundary,
            operation=operation,
            map_layer=new_map_layer,
        )
        derived_region.source_regions.set(source_regions)

    return derived_region


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

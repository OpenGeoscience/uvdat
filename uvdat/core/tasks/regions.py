import json
import secrets
from typing import List

from django.contrib.gis.db.models.aggregates import Union
from django.contrib.gis.geos import GEOSGeometry
from django.db import transaction

from uvdat.core.models import DerivedRegion, OriginalRegion


class DerivedRegionCreationException(Exception):
    pass


def create_derived_region(name: str, context_id: int, region_ids: List[int], operation: str):
    # Ensure at least two regions provided
    source_regions = OriginalRegion.objects.filter(pk__in=region_ids)
    if source_regions.count() < 2:
        raise DerivedRegionCreationException("Derived Regions must consist of multiple regions")

    # Ensure all regions are from one context
    source_contexts = list((source_regions.values_list('context', flat=True).distinct()))
    if len(source_contexts) > 1:
        raise DerivedRegionCreationException(
            f"Multiple contexts included in source regions: {source_contexts}"
        )

    # Only handle union operations for now
    if operation == DerivedRegion.VectorOperation.INTERSECTION:
        raise DerivedRegionCreationException("Intersection Operation not yet supported")

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
            context=context_id, boundary=GEOSGeometry(new_boundary)
        ).values_list('id', flat=True)
    )
    if existing:
        raise DerivedRegionCreationException(
            f"Derived Regions with identical boundary already exist: {existing}"
        )

    # Save and return
    with transaction.atomic():
        derived_region = DerivedRegion.objects.create(
            name=name,
            context=context_id,
            properties={},
            boundary=new_boundary,
            source_operation=operation,
        )
        derived_region.source_regions.set(source_regions)

    return derived_region


def create_original_regions(vector_map_layer, region_options):
    name_property = region_options.get('name_property')
    geodata = json.loads(vector_map_layer.geojson_data)

    region_count = 0
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
        region = OriginalRegion(
            name=name,
            boundary=GEOSGeometry(str(geometry)),
            metadata=properties,
            dataset=vector_map_layer.file_item.dataset,
        )
        region.save()
        region_count += 1

    print('\t', f"{region_count} regions created.")

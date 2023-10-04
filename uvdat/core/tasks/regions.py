import json
import secrets
from typing import List

from django.contrib.gis.db.models.aggregates import Union
from django.contrib.gis.geos import GEOSGeometry
from django.db import transaction

from uvdat.core.models import DerivedRegion, Region


class DerivedRegionCreationException(Exception):
    pass


def create_derived_region(name: str, city_id: int, region_ids: List[int], operation: str):
    # Ensure at least two regions provided
    source_regions = Region.objects.filter(pk__in=region_ids)
    if source_regions.count() < 2:
        raise DerivedRegionCreationException("Derived Regions must consist of multiple regions")

    # Ensure all regions are from one city
    source_cities = list((source_regions.values_list('city', flat=True).distinct()))
    if len(source_cities) > 1:
        raise DerivedRegionCreationException(
            f"Multiple cities included in source regions: {source_cities}"
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
        DerivedRegion.objects.filter(city=city_id, boundary=GEOSGeometry(new_boundary)).values_list(
            'id', flat=True
        )
    )
    if existing:
        raise DerivedRegionCreationException(
            f"Derived Regions with identical boundary already exist: {existing}"
        )

    # Save and return
    with transaction.atomic():
        derived_region = DerivedRegion.objects.create(
            name=name,
            city=city_id,
            properties={},
            boundary=new_boundary,
            source_operation=operation,
        )
        derived_region.source_regions.set(source_regions)

    return derived_region


def save_regions(dataset):
    dataset.regions.all().delete()
    property_map = dataset.style.get('property_map')
    name_property = property_map.get('name') if property_map else None

    geodata = json.loads(dataset.geodata_file.read().decode())
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
        region = Region(
            name=name,
            boundary=GEOSGeometry(str(geometry)),
            properties=properties,
            dataset=dataset,
            city=dataset.city,
        )
        region.save()

    print(f"Saved regions for {dataset.name}")

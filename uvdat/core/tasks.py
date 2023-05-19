import shapefile
import tempfile
import zipfile
import geopandas
import json
from pathlib import Path
from celery import shared_task
from django.contrib.gis.geos import GEOSGeometry, GeometryCollection
from django.core.files.base import ContentFile
from uvdat.core.models import Dataset


@shared_task
def convert_raw_archive(dataset_id):
    dataset = Dataset.objects.get(id=dataset_id)
    if dataset.raw_data_type == 'shape_file_archive':
        convert_shape_file_archive(dataset_id)


@shared_task
def convert_shape_file_archive(dataset_id):
    dataset = Dataset.objects.get(id=dataset_id)
    features = []
    original_projection = None
    with tempfile.TemporaryDirectory() as temp_dir:
        archive_path = Path(temp_dir, 'archive.zip')
        with open(archive_path, 'wb') as archive_file:
            archive_file.write(dataset.raw_data_archive.open('rb').read())
            with zipfile.ZipFile(archive_path) as zip_archive:
                filenames = zip_archive.namelist()
                for filename in filenames:
                    if filename.endswith(".shp"):
                        sf = shapefile.Reader(f'{archive_path}/{filename}')
                        features.extend(sf.__geo_interface__['features'])
                    if filename.endswith(".prj"):
                        original_projection = zip_archive.open(filename).read().decode()

        geojson_path = Path(temp_dir, 'geo.json')
        with open(geojson_path, 'w') as geojson_file:
            json.dump({'type': 'FeatureCollection', 'features': features}, geojson_file)
        geodata = geopandas.read_file(geojson_path)
        geodata = geodata.set_crs(original_projection, allow_override=True)
        geodata = geodata.to_crs(4326)

        geodata_path = Path(temp_dir, 'result.json')
        geodata.to_file(geodata_path)
        with open(geodata_path, 'rb') as geodata_file:
            dataset.geodata_file.save(geodata_path, ContentFile(geodata_file.read()))

        geometry_only = [
            GEOSGeometry(json.dumps(feature['geometry']))
            for feature in geodata.__geo_interface__['features']
        ]
        dataset.geometries = GeometryCollection(geometry_only)

        print(f'\t Shapefile to GeoJSON conversion complete for {dataset.name}.')
        dataset.save()

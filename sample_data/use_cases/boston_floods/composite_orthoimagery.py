import datetime
from osgeo import gdal, osr, ogr
from pathlib import Path
import large_image
import large_image_source_zarr
import large_image_converter


start = datetime.datetime.now()
folder = Path('data/uvdat/orthoimagery/boston')

sink_output_path = folder / 'composite.tiff'
gdal_output_path = folder / 'geospatial_composite.tiff'


print('Evaluating images.')
sources = []
proj = None
for file_path in folder.glob('**/*'):
    if file_path.name.endswith('.jp2'):
        src = large_image.open(file_path)
        metadata = src.getMetadata()
        bounds = metadata.get('sourceBounds')
        if proj is None:
            proj = bounds.get('srs')
        elif bounds.get('srs') != proj:
            raise Exception(f'Encountered different projections: "{proj}" and "{bounds.get("srs")}"')
        sources.append(dict(
            path=file_path,
            xmin=int(bounds['xmin']),
            xmax=int(bounds['xmax']),
            ymin=int(bounds['ymin']),
            ymax=int(bounds['ymax']),
            width=metadata['sizeX'],
            height=metadata['sizeY'],
            iterator=src.tileIterator(format='numpy')
        ))

print('Compositing images.')
abs_xmin = min(s.get('xmin') for s in sources)
abs_ymin = min(s.get('ymin') for s in sources)
abs_xmax = max(s.get('xmax') for s in sources)
abs_ymax = max(s.get('ymax') for s in sources)
sink = large_image_source_zarr.new()
for s in sources:
    pixel_factor = (s.get('xmax') - s.get('xmin')) / s.get('width')
    x_offset = int((s.get('xmin') - abs_xmin) / pixel_factor)
    y_offset = int((-s.get('ymax') + abs_ymax) / pixel_factor)  # y coords are flipped
    for tile in s.get('iterator'):
        t, x, y, = tile['tile'], tile['x'], tile['y']
        t = t[..., :3]  # exclude alpha channel
        sink.addTile(
            t, x=x_offset + x, y=y_offset + y
        )
sink_metadata = sink.getMetadata()
sink.write(sink_output_path)

print('Adding georeferencing.')
gdal.UseExceptions()
src_srs = osr.SpatialReference()
src_srs.ImportFromProj4(proj)
dst_srs = osr.SpatialReference()
dst_srs.ImportFromEPSG(4326)
transform = osr.CoordinateTransformation(src_srs, dst_srs)

gcps = []
for px, py, cx, cy in [
    (0, 0, abs_xmin, abs_ymax),
    (sink_metadata.get('sizeX'), sink_metadata.get('sizeY'), abs_xmax, abs_ymin),
]:
    point = ogr.Geometry(ogr.wkbPoint)
    point.AddPoint(cx, cy)
    point.Transform(transform)
    gcps.append((
        px, py, point.GetX(), point.GetY()
    ))

ds = gdal.Open(str(sink_output_path))
georefd = gdal.Translate(
    str(gdal_output_path),
    ds,
    options=gdal.TranslateOptions(
        outputSRS='EPSG:4326',
        GCPs=[gdal.GCP(lat, lon, 0, px, py) for (px, py, lon, lat) in gcps],
    )
)

print(f'Completed in {datetime.datetime.now() - start} seconds')

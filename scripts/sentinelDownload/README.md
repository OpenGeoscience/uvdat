# Script Description

This Python script downloads and clips Sentinel-2 imagery from the public AWS Earth Search using the STAC API.  
It fetches visual (RGB) Cloud-Optimized GeoTIFFs (COGs), extracts a user-defined square window around a given latitude and longitude, and saves the results locally with accompanying JSON ingest file for easy importing into UVDAT.

```bash
uv run --script sentinel2Download.py {arguments}
```

## Use Cases

- **Satellite Imagery Clipping**  
  Quickly extract a small area (e.g., 10 km × 10 km) of Sentinel-2 data around a point of interest.
  
- **Change Detection and Time Series Analysis**  
  Download multiple cloud-filtered images over a date range for sequential comparison.

- **Data Preprocessing for ML/AI**  
  Clip, clean, and organize imagery before feeding it into machine learning pipelines.


## Inputs

The script accepts command-line options via `click`:

- `--lat` *(float, required)* - Latitude of the point of interest.  
- `--lon` *(float, required)* - Longitude of the point of interest.  
- `--start-date` *(str, default `2025-01-01`)* - Start date in `YYYY-MM-DD` format.  
- `--end-date` *(str, default = today)* - End date in `YYYY-MM-DD` format.  
- `--max-results` *(int, default `5`)* - Maximum number of images to download.  
- `--output-dir` *(path, default `sequentialTestRasters`)* - Directory to save clipped files and JSON file.  
- `--cloud-cover` *(float, default `30.0`)* - Maximum allowed cloud cover percentage of files found.  
- `--size-km` *(float, default `10.0`)* - Size of square window (in kilometers) to clip around the point.

---

## Outputs

- **GeoTIFF files** - Clipped Sentinel-2 visual images (RGB).  
- **`sample.json`** - JSON metadata describing datasets, layers, and frames, useful for ingestion into UVDAT.  


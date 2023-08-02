import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector";
import VectorTileLayer from "ol/layer/VectorTile.js";
import XYZSource from "ol/source/XYZ.js";
import VectorSource from "ol/source/Vector";
import VectorTileSource from "ol/source/VectorTile.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { Fill, Stroke, Circle, Style } from "ol/style.js";
import { Feature } from "ol";
import { LineString, Point } from "ol/geom";
import { fromLonLat } from "ol/proj";

import { baseURL } from "@/api/auth";
import { map, currentDataset, rasterTooltip } from "@/store";
import axios from "axios";

export const rasterColormaps = [
  "terrain",
  "plasma",
  "viridis",
  "magma",
  "cividis",
  "rainbow",
  "jet",
  "spring",
  "summer",
  "autumn",
  "winter",
  "coolwarm",
  "cool",
  "hot",
  "seismic",
  "twilight",
  "tab20",
  "hsv",
  "gray",
];

function createStyle(args) {
  let colors = ["#00000022"];
  if (args.colors) {
    colors = args.colors.split(",");
  }
  if (!args.type) {
    return new Style();
  }
  return colors.map((colorHex, index) => {
    const styleSpec = {
      zIndex: colors.length - index,
    };
    if (args.type.includes("Point")) {
      styleSpec.image = new Circle({
        radius: 5 + 2 * index,
        fill: new Fill({
          color: colorHex,
        }),
      });
    } else if (args.type.includes("Line")) {
      styleSpec.stroke = new Stroke({
        color: colorHex,
        width: 3 + 2 * index,
      });
    } else if (args.type.includes("Polygon")) {
      styleSpec.fill = new Fill({
        color: colorHex.length > 7 ? colorHex : colorHex + "bb",
      });
    }
    return new Style(styleSpec);
  });
}

export function addDatasetLayerToMap(dataset, zIndex) {
  if (dataset.processing) {
    return;
  } else if (dataset.raster_file) {
    const tileParams = {
      projection: "EPSG:3857",
      band: 1,
      palette: dataset.style?.colormap || "terrain",
    };
    if (
      dataset.style?.colormap_range !== undefined &&
      dataset.style?.colormap_range.length === 2
    ) {
      tileParams.min = dataset.style.colormap_range[0];
      tileParams.max = dataset.style.colormap_range[1];
    }
    if (dataset.style?.options?.transparency_threshold !== undefined) {
      tileParams.nodata = dataset.style.options.transparency_threshold;
    }
    const tileParamString = Object.keys(tileParams)
      .map((key) => key + "=" + tileParams[key])
      .join("&");

    map.value.addLayer(
      new TileLayer({
        properties: {
          datasetId: dataset.id,
        },
        source: new XYZSource({
          url: `${baseURL}datasets/${dataset.id}/tiles/{z}/{x}/{y}.png/?${tileParamString}`,
        }),
        opacity: dataset.style?.opacity || 1,
        zIndex,
      })
    );
  } else if (dataset.geodata_file) {
    map.value.addLayer(
      new VectorTileLayer({
        properties: {
          datasetId: dataset.id,
        },
        source: new VectorTileSource({
          format: new GeoJSON(),
          url: `${baseURL}datasets/${dataset.id}/vector-tiles/{z}/{x}/{y}/`,
        }),
        style: function (feature) {
          return createStyle({
            type: feature.getGeometry().getType(),
            colors: feature.get("colors"),
          });
        },
        opacity: dataset.style?.opacity || 1,
        zIndex,
      })
    );
  }
}

export function addNetworkLayerToMap(dataset, nodes) {
  const source = new VectorSource();
  const features = [];
  const visitedNodes = [];
  nodes.forEach((node) => {
    features.push(
      new Feature(
        Object.assign(node.properties, {
          name: node.name,
          geometry: new Point(fromLonLat(node.location.toReversed())),
        })
      )
    );
    node.adjacent_nodes.forEach((adjId) => {
      if (!visitedNodes.includes(adjId)) {
        const adjNode = nodes.find((n) => n.id === adjId);
        features.push(
          new Feature({
            geometry: new LineString([
              fromLonLat(node.location.toReversed()),
              fromLonLat(adjNode.location.toReversed()),
            ]),
          })
        );
      }
    });
    visitedNodes.push(node.id);
  });
  source.addFeatures(features);

  const fill = new Fill({
    color: "#ffffffff",
  });
  const stroke = new Stroke({
    color: "#000000ff",
    width: 3,
  });
  const style = new Style({
    image: new Circle({
      fill: fill,
      stroke: stroke,
      radius: 7,
    }),
    fill: fill,
    stroke: stroke,
  });
  const layer = new VectorLayer({
    properties: {
      datasetId: dataset.id,
      network: true,
    },
    source,
    style,
  });
  map.value.addLayer(layer);
}

export function displayFeatureTooltip(evt, tooltip, overlay) {
  if (rasterTooltip.value) return;
  var pixel = evt.pixel;
  var feature = map.value.forEachFeatureAtPixel(pixel, function (feature) {
    return feature;
  });
  tooltip.value.style.display = feature ? "" : "none";
  if (feature) {
    const properties = Object.fromEntries(
      Object.entries(feature.values_).filter(([k, v]) => k && v)
    );
    ["colors", "geometry", "type"].forEach((prop) => delete properties[prop]);
    const prettyString = JSON.stringify(properties)
      .replaceAll('"', "")
      .replaceAll(",", "\n")
      .replaceAll("{", "")
      .replaceAll("}", "");
    tooltip.value.innerHTML = prettyString;
    // make sure the tooltip isn't cut off
    const mapCenter = map.value.get("view").get("center");
    const viewPortSize = map.value.get("view").viewportSize_;
    const tooltipSize = [tooltip.value.clientWidth, tooltip.value.clientHeight];
    const tooltipPosition = evt.coordinate.map((v, i) => {
      const mapEdge = mapCenter[i] + viewPortSize[i];
      if (v + tooltipSize[i] > mapEdge) {
        return mapEdge - (tooltipSize[i] * 3) / 2;
      }
      return v;
    });
    overlay.setPosition(tooltipPosition);
  }
}

var rasterTooltipDataCache = {};

export function displayRasterTooltip(evt, tooltip, overlay) {
  if (!currentDataset.value) return;
  var pixel = evt.pixel;
  var data = undefined;
  if (rasterTooltip.value && rasterTooltipDataCache[rasterTooltip.value]) {
    data = rasterTooltipDataCache[rasterTooltip.value];
    console.log("pixel=", pixel, "data=", data);
  } else {
    var dataFile = currentDataset.value.raster_file;
    if (dataFile) {
      axios
        .get(dataFile, {
          responseType: "blob",
        })
        .then(async (response) => {
          rasterTooltipDataCache[rasterTooltip.value] = response.data;
        });
    }
  }
}

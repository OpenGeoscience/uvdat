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
import { getNetworkGCC, getRasterData } from "@/api/rest";
import {
  map,
  currentDataset,
  rasterTooltip,
  networkVis,
  deactivatedNodes,
  currentNetworkGCC,
} from "@/store";

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

var rasterTooltipDataCache = {};

export function cacheRasterData(datasetId) {
  console.log("fetching data...");
  if (!rasterTooltipDataCache[datasetId]) {
    rasterTooltipDataCache[datasetId] = {};
    getRasterData(datasetId).then((data) => {
      rasterTooltipDataCache[datasetId] = data;
    });
  }
}

function createStyle(args) {
  let colors = ["#00000022"];
  if (args.colors) {
    colors = args.colors.split(",");
  }
  if (!args.type) {
    return new Style();
  }
  if (args.type.includes("Polygon")) {
    let stroke = undefined;
    if (colors.length > 1) {
      stroke = new Stroke({
        color: colors[1],
        width: 5,
      });
    }
    return new Style({
      fill: new Fill({
        color: colors[0].length > 7 ? colors[0] : colors[0] + "bb",
      }),
      stroke,
    });
  } else {
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
      }
      return new Style(styleSpec);
    });
  }
}

export function addDatasetLayerToMap(dataset, zIndex) {
  if (dataset.processing) {
    return;
  }

  // Add raster data
  if (dataset.raster_file) {
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
          dataset,
        },
        source: new XYZSource({
          url: `${baseURL}datasets/${dataset.id}/tiles/{z}/{x}/{y}.png/?${tileParamString}`,
        }),
        opacity: dataset.style?.opacity || 1,
        zIndex,
      })
    );
    cacheRasterData(dataset.id);
    return;
  }

  // Add GeoJSON data
  if (dataset.geodata_file) {
    // Default to vector tile layer
    let layer = new VectorTileLayer({
      source: new VectorTileSource({
        format: new GeoJSON(),
        url: `${baseURL}datasets/${dataset.id}/vector-tiles/{z}/{x}/{y}/`,
      }),
      properties: {
        datasetId: dataset.id,
        dataset,
      },
      style: (feature) =>
        createStyle({
          type: feature.getGeometry().getType(),
          colors: feature.get("colors"),
        }),
      opacity: dataset.style?.opacity || 1,
      zIndex,
    });

    // Use VectorLayer if dataset category is "region"
    if (dataset.category === "region") {
      layer = new VectorLayer({
        properties: {
          datasetId: dataset.id,
          dataset,
        },
        zIndex,
        style: (feature) =>
          createStyle({
            type: feature.getGeometry().getType(),
            colors: feature.get("properties").colors,
          }),
        source: new VectorSource({
          format: new GeoJSON(),
          url: `${baseURL}datasets/${dataset.id}/regions`,
        }),
      });
    }

    // Add to map
    map.value.addLayer(layer);
  }
}

function getNetworkFeatureStyle(alpha = "ff", highlight = false) {
  const fill = new Fill({
    color: `#ffffff${alpha}`,
  });
  const stroke = new Stroke({
    color: `#000000${alpha}`,
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
  if (highlight) {
    const highlightStroke = new Stroke({
      color: "yellow",
      width: 8,
    });
    return [
      new Style({
        zIndex: 0,
        stroke: highlightStroke,
        image: new Circle({
          stroke: highlightStroke,
          radius: 8,
        }),
      }),
      style,
    ];
  }
  return style;
}

export function updateNetworkStyle() {
  map.value
    .getLayers()
    .getArray()
    .forEach((layer) => {
      const layerIsNetwork = layer.getProperties().network;
      if (layerIsNetwork) {
        const source = layer.getSource();
        source.getFeatures().forEach((feature) => {
          let featureDeactivated = false;
          let featureHighlighted = false;
          const featureProperties = feature.values_;
          if (
            featureProperties.node &&
            featureProperties.id &&
            deactivatedNodes.value.includes(featureProperties.id)
          ) {
            featureDeactivated = true;
          } else if (
            featureProperties.edge &&
            featureProperties.connects &&
            featureProperties.connects.some((nId) =>
              deactivatedNodes.value.includes(nId)
            )
          ) {
            featureDeactivated = true;
          }

          if (currentNetworkGCC.value) {
            if (
              featureProperties.node &&
              featureProperties.id &&
              currentNetworkGCC.value.includes(featureProperties.id)
            ) {
              featureHighlighted = true;
            } else if (
              featureProperties.edge &&
              featureProperties.connects &&
              featureProperties.connects.some((nId) =>
                currentNetworkGCC.value.includes(nId)
              )
            ) {
              featureHighlighted = true;
            }
          }

          if (featureDeactivated) {
            feature.setStyle(getNetworkFeatureStyle("44"));
          } else if (featureHighlighted) {
            feature.setStyle(getNetworkFeatureStyle("ff", true));
          } else {
            feature.setStyle(null); // will default to layer style
          }
        });
      }
    });
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
          id: node.id,
          node: true,
          geometry: new Point(fromLonLat(node.location.toReversed())),
        })
      )
    );
    node.adjacent_nodes.forEach((adjId) => {
      if (!visitedNodes.includes(adjId)) {
        const adjNode = nodes.find((n) => n.id === adjId);
        features.push(
          new Feature({
            connects: [node.id, adjId],
            edge: true,
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

  const layer = new VectorLayer({
    properties: {
      datasetId: dataset.id,
      dataset,
      network: true,
    },
    zIndex: 99,
    style: getNetworkFeatureStyle(),
    source,
  });
  map.value.addLayer(layer);
}

function renderRegionTooltip(tooltipDiv, feature) {
  tooltipDiv.innerHTML = `
    ID: ${feature.get("pk")}<br>
    Name: ${feature.get("name")}<br>
  `;

  // Create button
  const cropButton = document.createElement("BUTTON");
  cropButton.classList = "v-btn v-btn--variant-outlined pa-2";
  cropButton.appendChild(document.createTextNode("Zoom to Region"));
  cropButton.onclick = () => {
    // Set map zoom to match bounding box of region
    map.value.getView().fit(feature.getGeometry(), {
      size: map.value.getSize(),
      duration: 300,
    });
  };

  // Add button to tooltip
  tooltipDiv.appendChild(cropButton);
}

function renderNetworkTooltip(tooltipDiv, feature) {
  // Add data
  const properties = Object.fromEntries(
    Object.entries(feature.values_).filter(([k, v]) => k && v)
  );
  ["colors", "geometry", "type", "id", "node", "edge"].forEach(
    (prop) => delete properties[prop]
  );
  let prettyString = JSON.stringify(properties)
    .replaceAll('"', "")
    .replaceAll("{", "")
    .replaceAll("}", "")
    .replaceAll(",", "<br>");
  prettyString += "<br>";
  tooltipDiv.innerHTML = prettyString;

  // Add activation button
  const nodeId = feature.get("id");
  const deactivateButton = document.createElement("button");
  if (deactivatedNodes.value.includes(nodeId)) {
    deactivateButton.innerHTML = "Reactivate Node";
  } else {
    deactivateButton.innerHTML = "Deactivate Node";
  }
  deactivateButton.onclick = function () {
    toggleNodeActive(nodeId, deactivateButton);
  };
  deactivateButton.classList = "v-btn v-btn--variant-outlined pa-2";
  tooltipDiv.appendChild(deactivateButton);
}

export function displayFeatureTooltip(evt, tooltip, overlay) {
  if (rasterTooltip.value) return;

  // Clear tooltip values in event of no feature clicked
  tooltip.value.innerHTML = "";
  tooltip.value.style.display = "";

  // Check if any features are clicked, exit if not
  let res = map.value.forEachFeatureAtPixel(evt.pixel, (feature, layer) => [
    feature,
    layer,
  ]);
  if (!res) {
    tooltip.value.style.display = "none";
    return;
  }

  // Get feature and layer, exit if dataset isn't provided through the layer
  const [feature, layer] = res;
  const dataset = layer.get("dataset");
  if (!dataset) {
    return;
  }

  // Create div in which tooltip contents will live
  const tooltipDiv = document.createElement("div");

  // Handle region dataset
  if (dataset.category === "region") {
    renderRegionTooltip(tooltipDiv, feature);
    // Handle network dataset
  } else if (networkVis.value && dataset.network) {
    renderNetworkTooltip(tooltipDiv, feature);
  } else {
    // No defined behavior, quit and render nothing
    return;
  }

  // Set tooltip contents and position
  tooltip.value.appendChild(tooltipDiv);
  overlay.setPosition(evt.coordinate);
}

export function displayRasterTooltip(evt, tooltip, overlay) {
  if (rasterTooltip.value) {
    if (rasterTooltipDataCache[rasterTooltip.value]) {
      const { data, sourceBounds } =
        rasterTooltipDataCache[rasterTooltip.value];
      if (data && data.length > 0) {
        let xProportion =
          (evt.coordinate[0] - sourceBounds.xmin) /
          (sourceBounds.xmax - sourceBounds.xmin);
        let yProportion =
          (evt.coordinate[1] - sourceBounds.ymin) /
          (sourceBounds.ymax - sourceBounds.ymin);
        yProportion = 1 - yProportion;
        if (
          xProportion < 0 ||
          yProportion < 0 ||
          xProportion > 1 ||
          yProportion > 1
        ) {
          tooltip.value.style.display = "none";
        } else {
          const xIndex = Math.round(xProportion * data[0].length);
          const yIndex = Math.round(yProportion * data.length);
          const value = data[yIndex][xIndex];
          tooltip.value.innerHTML = `~ ${Math.round(value)} m`;
          tooltip.value.style.display = "";
        }
      } else {
        tooltip.value.innerHTML = "waiting for data...";
        tooltip.value.style.display = "";
      }
      overlay.setPosition(evt.coordinate);
    } else {
      cacheRasterData(rasterTooltip.value);
    }
  }
}

export function toggleNodeActive(nodeId, button = null) {
  if (deactivatedNodes.value.includes(nodeId)) {
    deactivatedNodes.value = deactivatedNodes.value.filter((n) => n !== nodeId);
    if (button) button.innerHTML = "Deactivate Node";
  } else {
    deactivatedNodes.value.push(nodeId);
    if (button) button.innerHTML = "Activate Node";
  }

  currentNetworkGCC.value = undefined;
  getNetworkGCC(currentDataset.value.id, deactivatedNodes.value).then((gcc) => {
    currentNetworkGCC.value = gcc;
    updateNetworkStyle();
  });
  updateNetworkStyle();
}

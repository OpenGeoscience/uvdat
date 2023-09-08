import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector";
import VectorTileLayer from "ol/layer/VectorTile.js";
import XYZSource from "ol/source/XYZ.js";
import VectorSource from "ol/source/Vector";
import VectorTileSource from "ol/source/VectorTile.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { Fill, Stroke, Circle, Style } from "ol/style.js";

import { baseURL } from "@/api/auth";
import { getNetworkGCC, getCityCharts, getRasterData } from "@/api/rest";
import {
  map,
  showMapBaseLayer,
  currentCity,
  selectedDatasetIds,
  rasterTooltip,
  availableCharts,
  activeChart,
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

export function updateVisibleLayers() {
  const layerState = {
    shown: [],
    hidden: [],
  };
  const allLayers = map.value?.getLayers()?.getArray();
  if (allLayers) {
    allLayers.forEach((layer) => {
      const layerDatasetId = layer.getProperties().datasetId;
      let layerEnabled = selectedDatasetIds.value.includes(layerDatasetId);

      if (!layerDatasetId) {
        // map base layer does not have dataset id
        layerEnabled = showMapBaseLayer.value;
      }

      if (layerEnabled) {
        layer.setVisible(true);
        layerState.shown.push(layer);
        const layerIndex = selectedDatasetIds.value.findIndex(
          (id) => id === layerDatasetId
        );
        layer.setZIndex(
          layerDatasetId ? selectedDatasetIds.value.length - layerIndex : 0
        );
      } else {
        layer.setVisible(false);
        layerState.hidden.push(layer);
      }
    });
  }
  return layerState;
}

export function cacheRasterData(datasetId) {
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
  let layer = undefined;

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

    layer = new TileLayer({
      properties: {
        datasetId: dataset.id,
        dataset,
      },
      source: new XYZSource({
        url: `${baseURL}datasets/${dataset.id}/tiles/{z}/{x}/{y}.png/?${tileParamString}`,
      }),
      opacity: dataset.style?.opacity || 1,
      zIndex,
    });
    cacheRasterData(dataset.id);
  }

  // Use tiled GeoJSON if it exists
  else if (dataset.vector_tiles_file) {
    layer = new VectorTileLayer({
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

  // Default to vector layer
  else {
    let dataURL = dataset.geodata_file;
    if (dataset.category === "region") {
      dataURL = `${baseURL}datasets/${dataset.id}/regions`;
    }
    layer = new VectorLayer({
      properties: {
        datasetId: dataset.id,
        dataset,
      },
      zIndex,
      style: (feature) =>
        createStyle({
          type: feature.getGeometry().getType(),
          colors: feature.getProperties().colors,
        }),
      source: new VectorSource({
        format: new GeoJSON(),
        url: dataURL,
      }),
    });
  }

  // Add to map
  map.value.addLayer(layer);
}

export function updateNetworkStyle(dataset) {
  map.value
    .getLayers()
    .getArray()
    .forEach((layer) => {
      const layerDatasetId = layer.getProperties().datasetId;
      if (layerDatasetId === dataset.id) {
        const source = layer.getSource();
        const styleFunction = layer.getStyle();
        source.getFeatures().forEach((feature) => {
          let featureStyles = styleFunction(feature);
          const featureProperties = feature.values_;
          if (
            featureProperties.id &&
            dataset.deactivatedNodes.includes(featureProperties.id)
          ) {
            // Make node black (deactivated)
            featureStyles = featureStyles.map((style) => {
              style.getImage().getFill().setColor("black");
              return style;
            });
          } else if (dataset.gcc) {
            if (featureProperties.id) {
              if (dataset.gcc.includes(parseInt(featureProperties.id))) {
                // node in gcc, highlight yellow
                featureStyles.push(
                  new Style({
                    image: new Circle({
                      radius: 10,
                      fill: new Fill({
                        color: "yellow",
                      }),
                    }),
                  })
                );
              } else {
                // node not in gcc, make translucent
                featureStyles = featureStyles.map((style) => {
                  let color = style.getImage().getFill().getColor();
                  color += "66";
                  style.getImage().getFill().setColor(color);
                  return style;
                });
              }
            }
          }

          // TODO: handle styling for edges
          feature.setStyle(featureStyles);
        });
      }
    });
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

function renderNetworkTooltip(tooltipDiv, feature, dataset) {
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
  if (dataset.deactivatedNodes?.includes(nodeId)) {
    deactivateButton.innerHTML = "Reactivate Node";
  } else {
    deactivateButton.innerHTML = "Deactivate Node";
  }
  deactivateButton.onclick = function () {
    toggleNodeActive(nodeId, dataset, deactivateButton);
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
  } else if (dataset.network) {
    renderNetworkTooltip(tooltipDiv, feature, dataset);
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

export function toggleNodeActive(nodeId, dataset, button = null) {
  if (currentCity.value) {
    currentCity.value.datasets = currentCity.value.datasets.map((d) => {
      if (d.id === dataset.id && d.network) {
        if (!d.deactivatedNodes) {
          d.deactivatedNodes = [];
        }
        if (d.deactivatedNodes.includes(nodeId)) {
          d.deactivatedNodes = d.deactivatedNodes.filter((n) => n !== nodeId);
          if (button) button.innerHTML = "Deactivate Node";
        } else {
          d.deactivatedNodes.push(nodeId);
          if (button) button.innerHTML = "Activate Node";
        }
        d.gcc = undefined;
        getNetworkGCC(d.id, d.deactivatedNodes).then((gcc) => {
          d.gcc = gcc;
          updateNetworkStyle(d);

          // update chart
          getCityCharts(currentCity.value.id).then((charts) => {
            availableCharts.value = charts;
            if (activeChart.value) {
              activeChart.value = charts.find(
                (c) => c.id === activeChart.value.id
              );
            }
          });
        });
        updateNetworkStyle(d);
        if (!button) {
          // make tooltip disappear
          map.value.dispatchEvent({
            type: "click",
            pixel: [1, 1],
          });
        }
      }
      return d;
    });
  }
}

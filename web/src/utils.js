import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector";
import VectorTileLayer from "ol/layer/VectorTile.js";
import XYZSource from "ol/source/XYZ.js";
import VectorSource from "ol/source/Vector";
import VectorTileSource from "ol/source/VectorTile.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { Fill, Stroke, Circle, Style } from "ol/style.js";
import { Feature } from "ol";
import { getUid } from "ol/util";
import { LineString, Point } from "ol/geom";
import { fromLonLat } from "ol/proj";

import { baseURL } from "@/api/auth";
import { getNetworkGCC, getCityCharts, getRasterData } from "@/api/rest";
import {
  map,
  showMapBaseLayer,
  currentCity,
  rasterTooltip,
  networkVis,
  deactivatedNodes,
  currentNetworkGCC,
  availableCharts,
  activeChart,
  activeMapLayerIds,
  selectedDataSourceIds,
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

/** Returns if a layer should be enabled based on showMapBaseLayer, activeMapLayerIds, and networkVis */
function getLayerEnabled(layer) {
  // Check if layer is map base layer
  if (layer.getProperties().baseLayer) {
    return showMapBaseLayer.value;
  }

  // Check if layer is enabled
  const layerId = getUid(layer);
  let layerEnabled = activeMapLayerIds.value.includes(layerId);
  // TODO: Remove datasetId
  if (networkVis.value) {
    const layerDatasetId = layer.getProperties().datasetId;
    if (layerDatasetId === networkVis.value.id) {
      layerEnabled = layerEnabled && layer.getProperties().network;
    }
  }

  return layerEnabled;
}

/**
 * Shows/hides layers based on the getLayerEnabled function.
 *
 * Note: This only modifies layer visibility. It does not actually enable or disable any map layers directly.
 * */
export function updateVisibleLayers() {
  const layerState = {
    shown: [],
    hidden: [],
  };
  const allLayers = map.value?.getLayers()?.getArray();
  if (!allLayers) {
    return layerState;
  }

  allLayers.forEach((layer) => {
    const layerEnabled = getLayerEnabled(layer);
    if (!layerEnabled) {
      layer.setVisible(false);
      layerState.hidden.push(layer);
      return;
    }

    // Set layer visible and z-index
    layer.setVisible(true);
    layerState.shown.push(layer);
    const layerId = getUid(layer);
    const layerIndex = activeMapLayerIds.value.findIndex(
      (id) => id === layerId
    );
    layer.setZIndex(
      layerIndex > -1 ? activeMapLayerIds.value.length - layerIndex : 0
    );
  });

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

export function addDerivedRegionLayerToMap(region) {
  const layer = new VectorLayer({
    style: (feature) =>
      createStyle({
        type: feature.getGeometry().getType(),
      }),
    source: new VectorSource({
      format: new GeoJSON(),
      url: `${baseURL}derived_regions/${region.id}/boundary/`,
    }),
  });

  // Add to map
  map.value.addLayer(layer);
  return layer;
}

export function addDatasetLayerToMap(dataset, zIndex) {
  if (dataset.processing) {
    return;
  }
  let layer;

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
      source: new XYZSource({
        url: `${baseURL}datasets/${dataset.id}/tiles/{z}/{x}/{y}.png/?${tileParamString}`,
      }),
      opacity: dataset.style?.opacity || 1,
      zIndex,
    });

    cacheRasterData(dataset.id);
  } else if (dataset.geodata_file) {
    // Use VectorLayer if dataset category is "region"
    if (dataset.category === "region") {
      layer = new VectorLayer({
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
    } else {
      // Use vector tiles
      layer = new VectorTileLayer({
        source: new VectorTileSource({
          format: new GeoJSON(),
          url: `${baseURL}datasets/${dataset.id}/vector-tiles/{z}/{x}/{y}/`,
        }),
        style: (feature) =>
          createStyle({
            type: feature.getGeometry().getType(),
            colors: feature.get("colors"),
          }),
        opacity: dataset.style?.opacity || 1,
        zIndex,
      });
    }
  }

  // Add to map
  map.value.addLayer(layer);
  return layer;
}

export function addDataSourceLayerToMap(dataSource) {
  let layer;
  if (dataSource.dataset) {
    layer = addDatasetLayerToMap(
      dataSource.dataset,
      selectedDataSourceIds.size - 1
    );
  } else if (dataSource.derivedRegion) {
    layer = addDerivedRegionLayerToMap(dataSource.derivedRegion);
  }

  // Add this to link layers to data sources
  layer.setProperties({ dataSourceId: dataSource.getUid() });
  return layer;
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

// TODO: Roll into addDatasetLayerToMap
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
      network: true,
    },
    zIndex: 99,
    style: getNetworkFeatureStyle(),
    source,
  });
  map.value.addLayer(layer);
  return layer;
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

export function deactivatedNodesUpdated() {
  currentNetworkGCC.value = undefined;
  getNetworkGCC(networkVis.value.id, deactivatedNodes.value).then((gcc) => {
    currentNetworkGCC.value = gcc;
    updateNetworkStyle();

    // update chart
    getCityCharts(currentCity.value.id).then((charts) => {
      availableCharts.value = charts;
      if (activeChart.value) {
        activeChart.value = charts.find((c) => c.id === activeChart.value.id);
      }
    });
  });
}

export function toggleNodeActive(nodeId, button = null) {
  if (deactivatedNodes.value.includes(nodeId)) {
    deactivatedNodes.value = deactivatedNodes.value.filter((n) => n !== nodeId);
    if (button) button.innerHTML = "Deactivate Node";
  } else {
    deactivatedNodes.value.push(nodeId);
    if (button) button.innerHTML = "Activate Node";
  }
  deactivatedNodesUpdated();
}

import { Fill, Stroke, Circle, Style } from "ol/style.js";

import { getNetworkGCC, getContextCharts, getRasterData } from "@/api/rest";
import {
  currentContext,
  rasterTooltip,
  networkVis,
  deactivatedNodes,
  currentNetworkGCC,
  availableCharts,
  currentChart,
} from "@/store";
import { getMap } from "./storeFunctions.ts";

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
  if (!rasterTooltipDataCache[datasetId]) {
    rasterTooltipDataCache[datasetId] = {};
    getRasterData(datasetId).then((data) => {
      rasterTooltipDataCache[datasetId] = data;
    });
  }
}

export function createStyle(args) {
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

export function getNetworkFeatureStyle(alpha = "ff", highlight = false) {
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
  getMap()
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
    getContextCharts(currentContext.value.id).then((charts) => {
      availableCharts.value = charts;
      if (currentChart.value) {
        currentChart.value = charts.find((c) => c.id === currentChart.value.id);
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

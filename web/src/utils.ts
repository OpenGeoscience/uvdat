import { Fill, Stroke, Circle, Style } from "ol/style.js";
import { Overlay } from "ol";
import ImageStyle from "ol/style/Image.js";

import {
  getContextCharts,
  getDatasetNetwork,
  getNetworkGCC,
  getRasterData,
} from "@/api/rest";
import {
  rasterTooltip,
  currentContext,
  deactivatedNodes,
  currentNetworkGCC,
  availableCharts,
  currentChart,
  currentNetworkDataset,
  currentNetworkMapLayer,
  availableDatasets,
} from "@/store";
import {
  Dataset,
  DerivedRegion,
  RasterData,
  VectorMapLayer,
  RasterMapLayer,
} from "./types.js";
import { Ref } from "vue";
import { isMapLayerVisible, styleVectorOpenLayer } from "./layers";

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

const rasterTooltipDataCache: Record<number, RasterData | undefined> = {};

export function cacheRasterData(layerId: number) {
  if (!rasterTooltipDataCache[layerId]) {
    rasterTooltipDataCache[layerId] = undefined;
    getRasterData(layerId).then((data) => {
      rasterTooltipDataCache[layerId] = data;
    });
  }
}

export function displayRasterTooltip(
  evt: { coordinate: number[] },
  tooltip: Ref<HTMLElement>,
  overlay: Overlay
) {
  if (rasterTooltip.value) {
    const cached = rasterTooltipDataCache[rasterTooltip.value];
    if (cached) {
      const { data, sourceBounds } = cached;
      if (data && data.length > 0) {
        const xProportion =
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
    }
  }
}

export function randomColor() {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
      .slice(0, 6)
  );
}

export function createStyle(args: {
  colors: string | undefined;
  type: string | undefined;
}) {
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
      const styleSpec: {
        zIndex: number;
        image?: ImageStyle;
        stroke?: Stroke;
      } = {
        zIndex: colors.length - index,
      };
      if (args.type?.includes("Point")) {
        styleSpec.image = new Circle({
          radius: 5 + 2 * index,
          fill: new Fill({
            color: colorHex,
          }),
        });
      } else if (args.type?.includes("Line")) {
        styleSpec.stroke = new Stroke({
          color: colorHex,
          width: 3 + 2 * index,
        });
      }
      return new Style(styleSpec);
    });
  }
}

export function deactivatedNodesUpdated() {
  if (currentContext.value && currentNetworkDataset.value) {
    currentNetworkGCC.value = undefined;
    getNetworkGCC(
      currentNetworkDataset.value.id,
      currentContext.value.id,
      deactivatedNodes.value
    ).then((gcc) => {
      if (!currentContext.value) return;
      currentNetworkGCC.value = gcc;
      if (currentNetworkMapLayer.value) {
        styleVectorOpenLayer(currentNetworkMapLayer.value, {
          showGCC: true,
          translucency: "55",
        });
      }

      // update chart
      getContextCharts(currentContext.value.id).then((charts) => {
        availableCharts.value = charts;
        if (currentChart.value) {
          currentChart.value = charts.find(
            (c) => c.id === currentChart.value?.id
          );
        }
      });
    });
  }
}

export function toggleNodeActive(
  nodeId: number,
  dataset: Dataset | DerivedRegion | undefined,
  mapLayer: VectorMapLayer | RasterMapLayer | undefined
) {
  if (!dataset || !mapLayer || !isMapLayerVisible(mapLayer)) return;
  if (!dataset.network) {
    getDatasetNetwork(dataset.id).then((data) => {
      availableDatasets.value = availableDatasets.value.map((d) => {
        if (d.id === dataset.id) {
          return Object.assign(d, { network: data });
        } else return d;
      });
      currentNetworkDataset.value = availableDatasets.value.find(
        (d) => d.id === dataset.id
      );
    });
  }
  currentNetworkDataset.value = dataset as Dataset;
  currentNetworkMapLayer.value = mapLayer as VectorMapLayer;
  if (deactivatedNodes.value.includes(nodeId)) {
    deactivatedNodes.value = deactivatedNodes.value.filter((v) => v !== nodeId);
  } else {
    deactivatedNodes.value = [...deactivatedNodes.value, nodeId];
  }
  deactivatedNodesUpdated();
}

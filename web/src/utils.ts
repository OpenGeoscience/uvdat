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
  rasterTooltipEnabled,
  currentContext,
  deactivatedNodes,
  currentNetworkGCC,
  availableCharts,
  currentChart,
  currentNetworkDataset,
  currentNetworkDatasetLayer,
  availableDatasets,
  rasterTooltipValue,
  showMapTooltip,
} from "@/store";
import { Dataset, DerivedRegion, RasterData, RasterDatasetLayer, VectorDatasetLayer } from "./types";
import { Ref } from "vue";
import { createRasterLayerPolygonMask, findExistingMapLayers, findExistingMapLayersWithId, isDatasetLayerVisible, styleVectorOpenLayer } from "./layers";
import { MapLayerMouseEvent, Popup } from "maplibre-gl";
import { getMap, getTooltip } from "./storeFunctions";

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

export const rasterTooltipDataCache: Record<number, RasterData | undefined> = {};

export async function cacheRasterData(layer: RasterDatasetLayer) {
  if (rasterTooltipDataCache[layer.id] !== undefined) {
    return;
  }

  const data = await getRasterData(layer.id);
  rasterTooltipDataCache[layer.id] = data;

  // This will allow the raster tooltip to display data
  createRasterLayerPolygonMask(layer)
}

export function valueAtCursor(evt: MapLayerMouseEvent, datasetLayerId: number): number | undefined {
  const cached = rasterTooltipDataCache[datasetLayerId];
  if (!cached) {
    return;
  }

  const { data, sourceBounds } = cached;
  if (!(data && data.length > 0)) {
    return;
  }

  // Check if out of bounds in longitude (X)
  if (evt.lngLat.lng < sourceBounds.xmin || evt.lngLat.lng > sourceBounds.xmax) {
    return;
  }

  // Check if out of bounds in latitude (Y)
  if (evt.lngLat.lat < sourceBounds.ymin || evt.lngLat.lat > sourceBounds.ymax) {
    return;
  }

  // Convert lat/lng to array indices
  const xProportion = (evt.lngLat.lng - sourceBounds.xmin) / (sourceBounds.xmax - sourceBounds.xmin);
  const yProportion = 1 - (
    (evt.lngLat.lat - sourceBounds.ymin) / (sourceBounds.ymax - sourceBounds.ymin)
  );

  // Use floor, as otherwise rounding up can reach out of bounds
  const xIndex = Math.floor(xProportion * data[0].length);
  const yIndex = Math.floor(yProportion * data.length);

  return data[yIndex][xIndex];
}


export function setRasterTooltipValue(evt: MapLayerMouseEvent, datasetLayerId: number) {
  // If the toggle to show the tooltip is disabled, we show nothing.
  if (!rasterTooltipEnabled.value) {
    return;
  }

  // Start with empty data
  rasterTooltipValue.value = undefined;

  // Convert lat/lng to data array index
  const value = valueAtCursor(evt, datasetLayerId);
  if (value === undefined) {
    return;
  }

  // Add to map and enable, since we have data to display
  rasterTooltipValue.value = {
    pos: evt.lngLat,
    text: `~ ${Math.round(value)} m`,
  };
  showMapTooltip.value = true;
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
      if (currentNetworkDatasetLayer.value) {
        styleVectorOpenLayer(currentNetworkDatasetLayer.value, {
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

export function fetchDatasetNetwork(dataset: Dataset) {
  getDatasetNetwork(dataset.id).then((data) => {
    availableDatasets.value = availableDatasets.value?.map((d) => {
      if (d.id === dataset.id) {
        return Object.assign(d, { network: data });
      } else return d;
    });
    currentNetworkDataset.value = availableDatasets.value?.find(
      (d) => d.id === dataset.id
    );
  });
}

export function toggleNodeActive(
  nodeId: number,
  dataset: Dataset | DerivedRegion | undefined,
  datasetLayer: VectorDatasetLayer | undefined
) {
  if (!dataset || !datasetLayer || !isDatasetLayerVisible(datasetLayer)) return;
  dataset = dataset as Dataset;
  if (!dataset.network) fetchDatasetNetwork(dataset);
  currentNetworkDataset.value = dataset as Dataset;
  currentNetworkDatasetLayer.value = datasetLayer as VectorDatasetLayer;
  if (deactivatedNodes.value.includes(nodeId)) {
    deactivatedNodes.value = deactivatedNodes.value.filter((v) => v !== nodeId);
  } else {
    deactivatedNodes.value = [...deactivatedNodes.value, nodeId];
  }
  deactivatedNodesUpdated();
}

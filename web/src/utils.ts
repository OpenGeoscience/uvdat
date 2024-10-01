import {
  getDatasetNetwork,
  getNetworkGCC,
  getProjectCharts,
  getRasterData,
} from "@/api/rest";
import {
  rasterTooltipEnabled,
  currentProject,
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
import {
  Dataset,
  RasterData,
  RasterDatasetLayer,
  VectorDatasetLayer,
} from "./types";
import {
  createRasterLayerPolygonMask,
  isDatasetLayerVisible,
  styleNetworkVectorTileLayer,
} from "./layers";
import { MapLayerMouseEvent } from "maplibre-gl";

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

export const rasterTooltipDataCache: Record<number, RasterData | undefined> =
  {};

export async function cacheRasterData(layer: RasterDatasetLayer) {
  if (rasterTooltipDataCache[layer.id] !== undefined) {
    return;
  }

  const data = await getRasterData(layer.id);
  rasterTooltipDataCache[layer.id] = data;

  // This will allow the raster tooltip to display data
  createRasterLayerPolygonMask(layer);
}

export function valueAtCursor(
  evt: MapLayerMouseEvent,
  datasetLayerId: number
): number | undefined {
  const cached = rasterTooltipDataCache[datasetLayerId];
  if (!cached) {
    return;
  }

  const { data, sourceBounds } = cached;
  if (!(data && data.length > 0)) {
    return;
  }

  // Check if out of bounds in longitude (X)
  if (
    evt.lngLat.lng < sourceBounds.xmin ||
    evt.lngLat.lng > sourceBounds.xmax
  ) {
    return;
  }

  // Check if out of bounds in latitude (Y)
  if (
    evt.lngLat.lat < sourceBounds.ymin ||
    evt.lngLat.lat > sourceBounds.ymax
  ) {
    return;
  }

  // Convert lat/lng to array indices
  const xProportion =
    (evt.lngLat.lng - sourceBounds.xmin) /
    (sourceBounds.xmax - sourceBounds.xmin);
  const yProportion =
    1 -
    (evt.lngLat.lat - sourceBounds.ymin) /
      (sourceBounds.ymax - sourceBounds.ymin);

  // Use floor, as otherwise rounding up can reach out of bounds
  const xIndex = Math.floor(xProportion * data[0].length);
  const yIndex = Math.floor(yProportion * data.length);

  return data[yIndex][xIndex];
}

export function setRasterTooltipValue(
  evt: MapLayerMouseEvent,
  datasetLayerId: number
) {
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

export function deactivatedNodesUpdated() {
  if (!(currentProject.value && currentNetworkDataset.value)) {
    return;
  }

  currentNetworkGCC.value = undefined;
  getNetworkGCC(
    currentNetworkDataset.value.id,
    currentProject.value.id,
    deactivatedNodes.value
  ).then((gcc) => {
    if (!currentProject.value) {
      return;
    }
    currentNetworkGCC.value = gcc;

    if (currentNetworkDatasetLayer.value) {
      styleNetworkVectorTileLayer(currentNetworkDatasetLayer.value);
    }

    // update chart
    getProjectCharts(currentProject.value.id).then((charts) => {
      availableCharts.value = charts;
      if (currentChart.value) {
        currentChart.value = charts.find(
          (c) => c.id === currentChart.value?.id
        );
      }
    });
  });
}

export function fetchDatasetNetwork(dataset: Dataset) {
  getDatasetNetwork(dataset.id).then((data) => {
    // TODO: Handle datasets with multiple networks
    const network = data[0];

    // Assign this network data to its dataset
    // Do this by mapping to ensure the change is propogated
    availableDatasets.value = availableDatasets.value?.map((d) => {
      if (d.id === dataset.id) {
        d.network = network;
      }

      return d;
    });

    // Set the dataset currently performing network operations on
    currentNetworkDataset.value = availableDatasets.value?.find(
      (d) => d.id === dataset.id
    );
  });
}

export function toggleNodeActive(
  nodeId: number,
  dataset: Dataset,
  datasetLayer: VectorDatasetLayer
) {
  if (!dataset || !datasetLayer || !isDatasetLayerVisible(datasetLayer)) {
    return;
  }

  if (!dataset.network) {
    fetchDatasetNetwork(dataset);
  }

  currentNetworkDataset.value = dataset as Dataset;
  currentNetworkDatasetLayer.value = datasetLayer as VectorDatasetLayer;
  if (deactivatedNodes.value.includes(nodeId)) {
    deactivatedNodes.value = deactivatedNodes.value.filter((v) => v !== nodeId);
  } else {
    deactivatedNodes.value = [...deactivatedNodes.value, nodeId];
  }
  deactivatedNodesUpdated();
}

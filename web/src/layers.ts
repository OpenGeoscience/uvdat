import {
  currentMapDataSource,
  activeMapLayerIds,
  map,
  selectedDataSourceIds,
} from "@/store";
import { updateVisibleLayers, addDataSourceLayerToMap } from "./utils";
import { Layer } from "ol/layer";
import { getUid } from "ol/util";
import type { MapDataSource } from "./data";

export function getMapLayerById(layerId: string): Layer | undefined {
  return map.value
    .getLayers()
    .getArray()
    .find((layer: Layer) => getUid(layer) === layerId);
}

export function getMapLayerFromDataSource(
  source: MapDataSource
): Layer | undefined {
  return map.value
    .getLayers()
    .getArray()
    .find((layer: Layer) => layer.get("dataSourceId") === source.getUid());
}

export function addDataSourceToMap(dataSource: MapDataSource) {
  // Add dataset id to selected datasets
  selectedDataSourceIds.add(dataSource.getUid());

  // Check if layer with this dataset already exists
  const existingLayer = getMapLayerFromDataSource(dataSource);

  // Get either existing layer or create a new one
  const layer = existingLayer || addDataSourceLayerToMap(dataSource);
  if (layer === undefined) {
    throw new Error("No layer returned when adding data source to map");
  }

  // Put new dataset at front of list, so it shows up above any existing layers
  activeMapLayerIds.value = [getUid(layer), ...activeMapLayerIds.value];

  // Re-order layers
  updateVisibleLayers();
}

export function hideDataSourceFromMap(dataSource: MapDataSource) {
  const dataSourceId = dataSource.getUid();
  // Remove dataset id from selected datasets
  selectedDataSourceIds.delete(dataSourceId);

  // Filter out dataset layer from active map layers
  const layer = getMapLayerFromDataSource(dataSource);
  if (layer === undefined) {
    throw new Error(`Couldn't find layer for data source ${dataSourceId}`);
  }
  activeMapLayerIds.value = activeMapLayerIds.value.filter(
    (layerId) => layerId !== getUid(layer)
  );

  // Re-order layers
  updateVisibleLayers();

  // If current data source was the de-selected dataset, un-set it
  if (currentMapDataSource.value?.getUid() === dataSourceId) {
    currentMapDataSource.value = undefined;
  }
}

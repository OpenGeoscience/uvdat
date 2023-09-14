import {
  currentDataset,
  selectedDatasetIds,
  selectedDerivedRegionIds,
  activeMapLayerIds,
  map,
} from "@/store";
import {
  addDatasetLayerToMap,
  addDerivedRegionLayerToMap,
  updateVisibleLayers,
} from "./utils";
import { Dataset, DerivedRegion } from "./types";
import { Layer } from "ol/layer";
import { getUid } from "ol/util";

///////////
// Datasets
///////////

function getDatasetLayer(datasetId: number): Layer | undefined {
  return map.value
    .getLayers()
    .getArray()
    .find((layer: Layer) => layer.get("datasetId") === datasetId);
}

export function addDatasetToMap(dataset: Dataset) {
  // Append to front of dataset Ids
  selectedDatasetIds.value = [dataset.id, ...selectedDatasetIds.value];

  // Check if layer with this dataset already exists
  const existingLayer = getDatasetLayer(dataset.id);

  // Get either existing layer or create a new one
  const layer =
    existingLayer ||
    addDatasetLayerToMap(dataset, selectedDatasetIds.value.length - 1);

  if (layer === undefined) {
    throw new Error("No layer returned when adding dataset layer to map");
  }

  // Put new dataset at front of list, so it shows up above any existing layers
  activeMapLayerIds.value = [getUid(layer), ...activeMapLayerIds.value];

  // Re-order layers
  updateVisibleLayers();
}

export function hideDatasetFromMap(dataset: Dataset) {
  // Filter out dataset from selectedDatasets
  selectedDatasetIds.value = selectedDatasetIds.value.filter(
    (id) => id !== dataset.id
  );

  // Filter out dataset layer from active map layers
  const layer = getDatasetLayer(dataset.id);
  if (layer === undefined) {
    throw new Error(`Couldn't find layer for dataset ${dataset.id}`);
  }
  activeMapLayerIds.value = activeMapLayerIds.value.filter(
    (layerId) => layerId !== getUid(layer)
  );

  // Re-order layers
  updateVisibleLayers();

  // If currentDataset was the de-selected dataset, un-set it
  if (currentDataset.value?.id === dataset.id) {
    currentDataset.value = undefined;
  }
}

//////////////////
// Derived Regions
//////////////////

function getDerivedRegionLayer(derivedRegionId: number): Layer | undefined {
  return map.value
    .getLayers()
    .getArray()
    .find((layer: Layer) => layer.get("derivedRegionId") === derivedRegionId);
}

export function addDerivedRegionToMap(derivedRegion: DerivedRegion) {
  // Append to front of dataset Ids
  selectedDerivedRegionIds.value = [
    derivedRegion.id,
    ...selectedDerivedRegionIds.value,
  ];

  // Check if layer with this dataset already exists
  const existingLayer = getDerivedRegionLayer(derivedRegion.id);

  // Get either existing layer or create a new one
  const layer = existingLayer || addDerivedRegionLayerToMap(derivedRegion);
  if (layer === undefined) {
    throw new Error(
      "No layer returned when adding derived region layer to map"
    );
  }

  // Put new dataset at front of list, so it shows up above any existing layers
  activeMapLayerIds.value = [getUid(layer), ...activeMapLayerIds.value];

  // Re-order layers
  updateVisibleLayers();
}

export function hideDerivedRegionFromMap(derivedRegion: DerivedRegion) {
  // Filter out region from selected
  selectedDerivedRegionIds.value = selectedDerivedRegionIds.value.filter(
    (id) => id !== derivedRegion.id
  );

  // Filter out region layer from active map layers
  const layer = getDerivedRegionLayer(derivedRegion.id);
  if (layer === undefined) {
    throw new Error(
      `Couldn't find layer for derived region ${derivedRegion.id}`
    );
  }
  activeMapLayerIds.value = activeMapLayerIds.value.filter(
    (layerId) => layerId !== getUid(layer)
  );

  // Re-order layers
  updateVisibleLayers();
}

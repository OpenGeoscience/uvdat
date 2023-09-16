import { Dataset, DerivedRegion } from "@/types";
import { currentMapDataSource, activeMapLayerIds } from "@/store";
import { getUid } from "ol/util";
import {
  addDataSourceLayerToMap,
  getMapLayerFromDataSource,
  updateVisibleLayers,
} from "@/layers";

interface MapDataSourceArgs {
  dataset?: Dataset;
  derivedRegion?: DerivedRegion;
}

const UnexpectedMapDataSourceError = new Error(
  "Unexpected map data source type"
);

/** Return an ID that is unique across data source types */
export function getDatasetUid(id: number) {
  return `dataset-${id}`;
}

/** Return an ID that is unique across data source types */
export function getDerivedRegionUid(id: number) {
  return `dr-${id}`;
}

// A unified representation of any data source (datasets, derived regions, etc.)
export class MapDataSource {
  dataset?: Dataset;
  derivedRegion?: DerivedRegion;

  constructor(args: MapDataSourceArgs) {
    this.dataset = args.dataset;
    this.derivedRegion = args.derivedRegion;
  }

  get uid() {
    if (this.dataset) {
      return getDatasetUid(this.dataset.id);
    }
    if (this.derivedRegion) {
      return getDerivedRegionUid(this.derivedRegion.id);
    }

    throw UnexpectedMapDataSourceError;
  }

  get name() {
    const name = this.dataset?.name || this.derivedRegion?.name;
    if (name === undefined) {
      throw UnexpectedMapDataSourceError;
    }

    return name;
  }
}

export function addDataSourceToMap(dataSource: MapDataSource) {
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
  const dataSourceId = dataSource.uid;

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
  if (currentMapDataSource.value?.uid === dataSourceId) {
    currentMapDataSource.value = undefined;
  }
}

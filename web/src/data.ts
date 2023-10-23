import { Dataset, DerivedRegion } from "@/types";
import { currentMapLayer, activeMapLayerIds } from "@/store";
import { getUid } from "ol/util";
import { addLayerToMap, getMapLayer, updateVisibleMapLayers } from "@/layers";

export interface MapLayerArgs {
  dataset?: Dataset;
  derivedRegion?: DerivedRegion;
}

const UnexpectedMapLayerError = new Error("Unexpected map layer type");

/** Return an ID that is unique across data source types */
// export function getDatasetUid(id: number) {
//   return `dataset-${id}`;
// }

/** Return an ID that is unique across data source types */
// export function getDerivedRegionUid(id: number) {
//   return `dr-${id}`;
// }

// A unified representation of any data source (datasets, derived regions, etc.)
export class MapLayer {
  dataset?: Dataset;
  derivedRegion?: DerivedRegion;

  constructor(args: MapLayerArgs) {
    this.dataset = args.dataset;
    this.derivedRegion = args.derivedRegion;
  }

  get uid() {
    // if (this.dataset) {
    //   return getDatasetUid(this.dataset.id);
    // }
    // if (this.derivedRegion) {
    //   return getDerivedRegionUid(this.derivedRegion.id);
    // }
    return "TODO";

    throw UnexpectedMapLayerError;
  }

  get name() {
    const name = this.dataset?.name || this.derivedRegion?.name;
    if (name === undefined) {
      throw UnexpectedMapLayerError;
    }

    return name;
  }
}

export function addMapLayerToMap(mapLayer: MapLayer) {
  // Check if layer with this dataset already exists
  const existingLayer = getMapLayer(mapLayer);

  // Get either existing layer or create a new one
  const layer = existingLayer || addLayerToMap(mapLayer);
  if (layer === undefined) {
    throw new Error("No layer returned when adding data source to map");
  }

  // Put new dataset at front of list, so it shows up above any existing layers
  activeMapLayerIds.value = [getUid(layer), ...activeMapLayerIds.value];

  // Re-order layers
  updateVisibleMapLayers();
}

export function hideMapLayerFromMap(mapLayer: MapLayer) {
  const mapLayerId = mapLayer.uid;

  // Filter out dataset layer from active map layers
  const layer = getMapLayer(mapLayer);
  if (layer === undefined) {
    throw new Error(`Couldn't find layer for data source ${mapLayerId}`);
  }
  activeMapLayerIds.value = activeMapLayerIds.value.filter(
    (layerId) => layerId !== getUid(layer)
  );

  // Re-order layers
  updateVisibleMapLayers();

  // If current data source was the de-selected dataset, un-set it
  if (currentMapLayer.value?.uid === mapLayerId) {
    currentMapLayer.value = undefined;
  }
}

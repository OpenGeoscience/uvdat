import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import * as olProj from "ol/proj";

import { watch } from "vue";
import { availableContexts, currentContext } from "./store";
import { getContextDatasets, getContexts, getDataset } from "@/api/rest";

import {
  map,
  showMapTooltip,
  selectedSourceRegions,
  regionGroupingActive,
  regionGroupingType,
  rasterTooltip,
  currentMapLayer,
  polls,
} from "./store";
import { Dataset } from "./types";

export function getMap() {
  if (map.value === undefined) {
    throw new Error("Map not yet initialized!");
  }
  return map.value;
}

export function loadContexts() {
  getContexts().then((data) => {
    availableContexts.value = data;
    if (data.length) {
      currentContext.value = data[0];
    }
    if (currentContext.value?.datasets) {
      currentContext.value?.datasets.forEach((d) => {
        if (d.processing) {
          pollForProcessingDataset(d.id);
        }
      });
    }
    clearMap();
    loadDatasets();
  });
}

export function loadDatasets() {
  if (!currentContext.value) return;
  getContextDatasets(currentContext.value.id).then((data: Dataset[]) => {
    if (!currentContext.value) return;
    currentContext.value.datasets = data;
  });
}

export function clearMap() {
  if (!currentContext.value) {
    return;
  }
  getMap().setView(
    new View({
      center: olProj.fromLonLat(currentContext.value.default_map_center),
      zoom: currentContext.value.default_map_zoom,
    })
  );
  getMap().setLayers([
    new TileLayer({
      source: new OSM(),
      properties: {
        baseLayer: true,
      },
    }),
  ]);
}

export function cancelRegionGrouping() {
  selectedSourceRegions.value = [];
  regionGroupingActive.value = false;
  regionGroupingType.value = null;

  showMapTooltip.value = false;
}

export function pollForProcessingDataset(datasetId: number) {
  // fetch dataset every 10 seconds until it is not in a processing state
  polls.value[datasetId] = setInterval(() => {
    const currentVersion = currentContext.value?.datasets.find(
      (d) => d.id === datasetId
    );
    if (currentContext.value && currentVersion?.processing) {
      getDataset(datasetId).then((newVersion) => {
        if (currentContext.value && !newVersion.processing) {
          currentContext.value.datasets = currentContext.value.datasets.map(
            (d) => (d.id === datasetId ? newVersion : d)
          );
        }
      });
    } else {
      clearInterval(polls.value[datasetId]);
      delete polls.value[datasetId];
    }
  }, 10000);
}

watch(currentContext, clearMap);
watch(currentMapLayer, () => {
  rasterTooltip.value = undefined;
});

import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import * as olProj from "ol/proj";
import { watch } from "vue";

import {
  availableContexts,
  currentContext,
  availableDatasets,
  map,
  showMapTooltip,
  selectedSourceRegions,
  regionGroupingActive,
  regionGroupingType,
  rasterTooltip,
  currentMapLayer,
  polls,
  availableCharts,
  currentChart,
  availableSimulationTypes,
  currentSimulationType,
  availableDerivedRegions,
} from "./store";
import { Dataset } from "./types";
import {
  getContextDatasets,
  getContexts,
  getDataset,
  getContextCharts,
  getContextSimulationTypes,
  getContextDerivedRegions,
} from "@/api/rest";

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
    loadCharts();
    loadSimulationTypes();
    loadDerivedRegions();
  });
}

export function loadDatasets() {
  if (!currentContext.value) return;
  getContextDatasets(currentContext.value.id).then((data: Dataset[]) => {
    availableDatasets.value = data;
  });
}

export function loadCharts() {
  if (!currentContext.value) return;
  currentChart.value = undefined;
  getContextCharts(currentContext.value.id).then((charts) => {
    availableCharts.value = charts;
  });
}

export function loadSimulationTypes() {
  if (!currentContext.value) return;
  currentSimulationType.value = undefined;
  getContextSimulationTypes(currentContext.value.id).then((sims) => {
    availableSimulationTypes.value = sims;
  });
}

export function loadDerivedRegions() {
  if (!currentContext.value) return;
  getContextDerivedRegions(currentContext.value.id).then((ders) => {
    availableDerivedRegions.value = ders;
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

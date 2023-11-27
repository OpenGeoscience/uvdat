import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import * as olProj from "ol/proj";
import { watch } from "vue";

import {
  availableContexts,
  currentContext,
  availableDatasets,
  selectedDatasets,
  currentDataset,
  map,
  showMapTooltip,
  selectedMapLayers,
  clickedMapLayer,
  clickedFeature,
  showMapBaseLayer,
  selectedSourceRegions,
  regionGroupingActive,
  regionGroupingType,
  rasterTooltip,
  polls,
  availableCharts,
  currentChart,
  availableSimulationTypes,
  currentSimulationType,
  availableDerivedRegions,
  selectedDerivedRegions,
  currentNetworkDataset,
  currentNetworkMapLayer,
  currentNetworkGCC,
  deactivatedNodes,
  loading,
  currentError,
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

export function clearState() {
  availableDatasets.value = undefined;
  selectedDatasets.value = [];
  currentDataset.value = undefined;
  selectedMapLayers.value = [];
  clickedMapLayer.value = undefined;
  showMapBaseLayer.value = true;
  clickedFeature.value = undefined;
  rasterTooltip.value = undefined;
  availableCharts.value = undefined;
  currentChart.value = undefined;
  availableSimulationTypes.value = undefined;
  currentSimulationType.value = undefined;
  availableDerivedRegions.value = undefined;
  selectedSourceRegions.value = [];
  selectedDerivedRegions.value = [];
  regionGroupingActive.value = false;
  regionGroupingType.value = undefined;
  currentNetworkDataset.value = undefined;
  currentNetworkMapLayer.value = undefined;
  deactivatedNodes.value = [];
  currentNetworkGCC.value = undefined;
  loading.value = false;
  currentError.value = undefined;
  polls.value = {};
}

export function getMap() {
  if (map.value === undefined) {
    throw new Error("Map not yet initialized!");
  }
  return map.value;
}

export function loadContexts() {
  clearState();
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

export function loadDatasets() {
  if (!currentContext.value) return;
  availableDatasets.value = undefined;
  getContextDatasets(currentContext.value.id).then((data: Dataset[]) => {
    availableDatasets.value = data;
  });
}

export function loadCharts() {
  if (!currentContext.value) return;
  availableCharts.value = undefined;
  currentChart.value = undefined;
  getContextCharts(currentContext.value.id).then((charts) => {
    availableCharts.value = charts;
  });
}

export function loadSimulationTypes() {
  if (!currentContext.value) return;
  availableSimulationTypes.value = undefined;
  currentSimulationType.value = undefined;
  getContextSimulationTypes(currentContext.value.id).then((sims) => {
    availableSimulationTypes.value = sims;
  });
}

export async function loadDerivedRegions() {
  if (!currentContext.value) {
    return;
  }

  availableDerivedRegions.value = await getContextDerivedRegions(
    currentContext.value.id
  );
}

export function cancelRegionGrouping() {
  selectedSourceRegions.value = [];
  regionGroupingActive.value = false;
  regionGroupingType.value = undefined;

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

watch(currentContext, () => {
  clearState();
  clearMap();
  loadDatasets();
  loadCharts();
  loadSimulationTypes();
  loadDerivedRegions();
});
watch(currentDataset, () => {
  rasterTooltip.value = undefined;
});

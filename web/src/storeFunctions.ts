import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import * as olProj from "ol/proj";
import { watch } from "vue";

import {
  availableProjects,
  currentProject,
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
  currentError,
} from "./store";
import { Dataset } from "./types";
import {
  getProjectDatasets,
  getProjects,
  getDataset,
  getProjectCharts,
  getProjectSimulationTypes,
  getProjectDerivedRegions,
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
  currentError.value = undefined;
  polls.value = {};
}

export function getMap() {
  if (map.value === undefined) {
    throw new Error("Map not yet initialized!");
  }
  return map.value;
}

export function loadProjects() {
  clearState();
  getProjects().then((data) => {
    availableProjects.value = data;
  });
}

export function clearMap() {
  let center = [0, 30];
  let zoom = 1;
  if (currentProject.value) {
    center = currentProject.value.default_map_center;
    zoom = currentProject.value.default_map_zoom;
  }
  getMap().setView(
    new View({
      center: olProj.fromLonLat(center),
      zoom,
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
  if (!currentProject.value) return;
  availableDatasets.value = undefined;
  getProjectDatasets(currentProject.value.id).then((data: Dataset[]) => {
    availableDatasets.value = data;
  });
}

export function loadCharts() {
  if (!currentProject.value) return;
  availableCharts.value = undefined;
  currentChart.value = undefined;
  getProjectCharts(currentProject.value.id).then((charts) => {
    availableCharts.value = charts;
  });
}

export function loadSimulationTypes() {
  if (!currentProject.value) return;
  availableSimulationTypes.value = undefined;
  currentSimulationType.value = undefined;
  getProjectSimulationTypes(currentProject.value.id).then((sims) => {
    availableSimulationTypes.value = sims;
  });
}

export async function loadDerivedRegions() {
  if (!currentProject.value) {
    return;
  }

  availableDerivedRegions.value = await getProjectDerivedRegions(
    currentProject.value.id
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
    const currentVersion = currentProject.value?.datasets.find(
      (d) => d.id === datasetId
    );
    if (currentProject.value && currentVersion?.processing) {
      getDataset(datasetId).then((newVersion) => {
        if (currentProject.value && !newVersion.processing) {
          currentProject.value.datasets = currentProject.value.datasets.map(
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

watch(currentProject, () => {
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

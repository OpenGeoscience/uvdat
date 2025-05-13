import { watch } from "vue";

import {
  availableProjects,
  currentProject,
  availableDatasets,
  selectedSourceRegions,
  polls,
  availableCharts,
  currentChart,
  availableNetworks,
  availableAnalysisTypes,
  currentAnalysisType,
  currentError,
  draggingPanel,
  draggingFrom,
  dragModes,
  loadingDatasets,
  loadingAnalysisTypes,
  loadingCharts,
  loadingProjects,
  loadingNetworks,
  currentNetwork,
} from "./store";

import { useMapStore } from '@/store/map';

import {
  getProjects,
  getDataset,
  getProjectCharts,
  getProjectAnalysisTypes,
  getProjectDatasets,
  getDatasetLayers,
  getProjectNetworks,
} from "@/api/rest";
import { Dataset } from "./types";
import { resetPanels } from "./panelFunctions";

export function clearState() {
  clearProjectState();
  resetPanels();
  useMapStore().showMapBaseLayer = true;
  currentError.value = undefined;
  polls.value = {};
  draggingPanel.value = undefined;
  draggingFrom.value = undefined;
  dragModes.value = [];
}

export function clearProjectState() {
  availableDatasets.value = undefined;
  useMapStore().selectedLayers = [];
  useMapStore().selectedLayerStyles = {};
  useMapStore().clickedFeature = undefined;
  availableCharts.value = undefined;
  currentChart.value = undefined;
  availableNetworks.value = [];
  availableAnalysisTypes.value = undefined;
  currentAnalysisType.value = undefined;
  selectedSourceRegions.value = [];
}

export function loadProjects() {
  clearState();
  getProjects().then((data) => {
    availableProjects.value = data;
    loadingProjects.value = false;
  });
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
  clearProjectState();
  useMapStore().setMapCenter(currentProject.value);
  useMapStore().clearMapLayers();
  if (currentProject.value) {
    loadingDatasets.value = true;
    loadingCharts.value = true;
    loadingAnalysisTypes.value = true;
    loadingNetworks.value = true;
    getProjectDatasets(currentProject.value.id).then(async (datasets) => {
      availableDatasets.value = await Promise.all(datasets.map(async (dataset: Dataset) => {
        dataset.layers = await getDatasetLayers(dataset.id);
        return dataset;
      }));
      loadingDatasets.value = false;
    });
    getProjectCharts(currentProject.value.id).then((charts) => {
      availableCharts.value = charts;
      currentChart.value = undefined;
      loadingCharts.value = false;
    });
    getProjectNetworks(currentProject.value.id).then((networks) => {
      availableNetworks.value = networks;
      currentNetwork.value = undefined;
      loadingNetworks.value = false;
    })
    getProjectAnalysisTypes(currentProject.value.id).then((types) => {
      availableAnalysisTypes.value = types;
      currentAnalysisType.value = undefined;
      loadingAnalysisTypes.value = false;
    })
  }
});

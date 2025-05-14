import { watch } from "vue";

import {
  availableProjects,
  currentProject,
  availableDatasets,
  polls,
  loadingDatasets,
  loadingProjects,
} from "./store";

import { useMapStore } from '@/store/map';
import { useLayerStore } from "./store/layer";
import { useNetworkStore } from "@/store/network";
import { useAppStore } from "@/store/app";
import { usePanelStore } from "@/store/panel";
import { useAnalysisStore } from "@/store/analysis";

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

export function clearState() {
  clearProjectState();
  useMapStore().showMapBaseLayer = true;
  useAppStore().currentError = undefined;
  polls.value = {};
  
  const panelStore = usePanelStore();
  panelStore.resetPanels();
  panelStore.draggingPanel = undefined;
  panelStore.draggingFrom = undefined;
  panelStore.dragModes = [];
}

export function clearProjectState() {
  availableDatasets.value = undefined;
  useLayerStore().selectedLayers = [];
  useLayerStore().selectedLayerStyles = {};
  useMapStore().clickedFeature = undefined;
  useNetworkStore().availableNetworks = [];

  const analysisStore = useAnalysisStore(); 
  analysisStore.availableCharts = undefined;
  analysisStore.currentChart = undefined;
  analysisStore.availableAnalysisTypes = undefined;
  analysisStore.currentAnalysisType = undefined;
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
  const networkStore = useNetworkStore();
  const analysisStore = useAnalysisStore(); 
  clearProjectState();
  useMapStore().setMapCenter(currentProject.value);
  useMapStore().clearMapLayers();
  if (currentProject.value) {
    loadingDatasets.value = true;
    analysisStore.loadingCharts = true;
    analysisStore.loadingAnalysisTypes = true;
    networkStore.loadingNetworks = true;
    getProjectDatasets(currentProject.value.id).then(async (datasets) => {
      availableDatasets.value = await Promise.all(datasets.map(async (dataset: Dataset) => {
        dataset.layers = await getDatasetLayers(dataset.id);
        return dataset;
      }));
      loadingDatasets.value = false;
    });
    getProjectCharts(currentProject.value.id).then((charts) => {
      analysisStore.availableCharts = charts;
      analysisStore.currentChart = undefined;
      analysisStore.loadingCharts = false;
    });
    getProjectNetworks(currentProject.value.id).then((networks) => {
      networkStore.availableNetworks = networks;
      networkStore.currentNetwork = undefined;
      networkStore.loadingNetworks = false;
    })
    getProjectAnalysisTypes(currentProject.value.id).then((types) => {
      analysisStore.availableAnalysisTypes = types;
      analysisStore.currentAnalysisType = undefined;
      analysisStore.loadingAnalysisTypes = false;
    })
  }
});

import { watch } from "vue";

import {
  availableProjects,
  currentProject,
  availableDatasets,
  map,
  selectedLayers,
  clickedFeature,
  showMapBaseLayer,
  selectedSourceRegions,
  polls,
  availableCharts,
  currentChart,
  availableNetworks,
  availableSimulationTypes,
  currentSimulationType,
  currentError,
  tooltipOverlay,
  panelArrangement,
  draggingPanel,
  draggingFrom,
  dragModes,
  loadingDatasets,
  loadingSimulationTypes,
  loadingCharts,
  selectedLayerStyles,
} from "./store";
import {
  getProjects,
  getDataset,
  getProjectCharts,
  getProjectSimulationTypes,
  getProjectDatasets,
  getDatasetLayers,
} from "@/api/rest";
import { clearMapLayers, updateBaseLayer, updateLayersShown } from "./layers";
import { Dataset, Project } from "./types";

export function clearState() {
  clearProjectState();
  showMapBaseLayer.value = true;
  currentError.value = undefined;
  polls.value = {};
  panelArrangement.value = [
    { id: "datasets", label: "Datasets", visible: true, closeable: false },
    {
      id: "layers",
      label: "Selected Layers",
      visible: true,
      closeable: false,
    },
    {
      id: "legend",
      label: "Legend",
      visible: true,
      closeable: true,
      right: true,
    },
    {
      id: "charts",
      label: "Charts",
      visible: true,
      closeable: true,
      right: true,
    },
    {
      id: "analytics",
      label: "Analytics",
      visible: true,
      closeable: true,
      right: true,
    },
  ];
  draggingPanel.value = undefined;
  draggingFrom.value = undefined;
  dragModes.value = [];
}

export function clearProjectState() {
  availableDatasets.value = undefined;
  selectedLayers.value = [];
  selectedLayerStyles.value = {};
  clickedFeature.value = undefined;
  availableCharts.value = undefined;
  currentChart.value = undefined;
  availableNetworks.value = [];
  availableSimulationTypes.value = undefined;
  currentSimulationType.value = undefined;
  selectedSourceRegions.value = [];
}

export function getMap() {
  if (map.value === undefined) {
    throw new Error("Map not yet initialized!");
  }
  return map.value;
}

export function getTooltip() {
  if (tooltipOverlay.value === undefined) {
    throw new Error("Tooltip not yet initialized!");
  }
  return tooltipOverlay.value;
}

export function loadProjects() {
  clearState();
  getProjects().then((data) => {
    availableProjects.value = data;
  });
}

export function setMapCenter(
  project: Project | undefined = undefined,
  jump = false
) {
  let center: [number, number] = [0, 30];
  let zoom = 1;
  if (project) {
    center = project.default_map_center;
    zoom = project.default_map_zoom;
  }

  const map = getMap();
  if (jump) {
    map.jumpTo({ center, zoom });
  } else {
    map.flyTo({ center, zoom, duration: 2000 });
  }
}

export function getCurrentMapPosition() {
  const map = getMap();
  const { lat, lng } = map.getCenter();
  return {
    center: [lng, lat],
    zoom: map.getZoom(),
  };
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
  setMapCenter(currentProject.value);
  clearMapLayers();
  if (currentProject.value) {
    loadingDatasets.value = true;
    loadingCharts.value = true;
    loadingSimulationTypes.value = true;
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
    getProjectSimulationTypes(currentProject.value.id).then((types) => {
      availableSimulationTypes.value = types;
      currentSimulationType.value = undefined;
      loadingSimulationTypes.value = false;
    })
  }
});

watch(selectedLayers, updateLayersShown)

watch(showMapBaseLayer, updateBaseLayer);

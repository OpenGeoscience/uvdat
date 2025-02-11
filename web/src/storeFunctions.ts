import { watch } from "vue";

import {
  availableProjects,
  currentProject,
  availableDatasets,
  map,
  selectedLayers,
  clickedLayer,
  clickedFeature,
  showMapBaseLayer,
  selectedSourceRegions,
  polls,
  availableCharts,
  currentChart,
  availableSimulationTypes,
  currentSimulationType,
  currentNetworkDataset,
  currentNetworkDatasetLayer,
  currentNetworkGCC,
  deactivatedNodes,
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
import { getProjects, getDataset, getProjectCharts, getProjectSimulationTypes, getProjectDatasets, getDatasetLayers } from "@/api/rest";
import { clearMapLayers, updateBaseLayer, updateLayersShown } from "./layers";
import { Dataset, FloatingPanelConfig, Project } from "./types";

export function clearState() {
  availableDatasets.value = undefined;
  selectedLayers.value = [];
  selectedLayerStyles.value = {};
  clickedLayer.value = undefined;
  showMapBaseLayer.value = true;
  clickedFeature.value = undefined;
  availableCharts.value = undefined;
  currentChart.value = undefined;
  availableSimulationTypes.value = undefined;
  currentSimulationType.value = undefined;
  selectedSourceRegions.value = [];
  currentNetworkDataset.value = undefined;
  currentNetworkDatasetLayer.value = undefined;
  deactivatedNodes.value = [];
  currentNetworkGCC.value = undefined;
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

export function startDrag(
  event: MouseEvent,
  panel: FloatingPanelConfig | undefined,
  modes: ("position" | "width" | "height")[]
) {
  if (panel) {
    draggingPanel.value = panel.id;
  }
  draggingFrom.value = {
    x: event.clientX,
    y: event.clientY,
  };
  dragModes.value = modes;
}

export function dragPanel(event: MouseEvent) {
  let offsetX = -5;
  const offsetY = 30;
  const snapToleranceX = 200;
  const snapToleranceY = 300;
  const minHeight = 100;
  const minWidth = 150;

  const panel = panelArrangement.value.find(
    (p) => p.id === draggingPanel.value
  );
  if (!panel) return undefined;

  if (panel.right) offsetX += document.body.clientWidth - 390;
  const position = {
    x: event.clientX - offsetX - (panel.element?.clientWidth || 0),
    y: event.clientY - offsetY,
  };
  if (dragModes.value?.includes("position")) {
    if (
      panel.initialPosition &&
      Math.abs(position.x - panel.initialPosition.x) < snapToleranceX &&
      Math.abs(position.y - panel.initialPosition.y) < snapToleranceY
    ) {
      // snap to sidebar
      panel.position = undefined;
    } else {
      if (!panel.initialPosition) {
        // convert to floating
        panel.width = 300;
        panel.height = 200;
        panel.initialPosition = position;
      } else if (
        panel.width && position.x + panel.width < document.body.clientWidth &&
        panel.height && position.y + panel.height < document.body.clientHeight
      ) {
        panel.position = position;
      }
    }
  }
  if (draggingFrom.value) {
    const from: { x: number; y: number } = { ...draggingFrom.value };
    if (dragModes.value?.includes("height") && draggingFrom.value) {
      if(!panel.height) {
        panel.height = panel.element?.clientHeight
      }
      if (panel.height) {
        const heightDelta = event.clientY - draggingFrom.value.y;
        if (panel.height + heightDelta > minHeight) {
          panel.height = panel.height + heightDelta;
          from.y = event.clientY;
        }
      }
    }
    if (
      dragModes.value?.includes("width") &&
      draggingFrom.value &&
      panel.width
    ) {
      const widthDelta = event.clientX - draggingFrom.value.x;
      if (panel.width + widthDelta > minWidth) {
        panel.width = panel.width + widthDelta;
        from.x = event.clientX;
      }
    }
    draggingFrom.value = from;
  }
}

export function stopDrag() {
  draggingPanel.value = undefined;
  draggingFrom.value = undefined;
  dragModes.value = [];
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

/**
 * If a network analysis is going on, reset it to its starting state.
 */
export function clearCurrentNetwork() {
  const datasetLayer = currentNetworkDatasetLayer.value;

  currentNetworkDataset.value = undefined;
  currentNetworkDatasetLayer.value = undefined;
  deactivatedNodes.value = [];
  currentNetworkGCC.value = undefined;

  // if (datasetLayer !== undefined) {
  //   styleNetworkVectorTileLayer(datasetLayer);
  // }
}

watch(currentProject, () => {
  clearState();
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

export function clearClickedFeatureData() {
  clickedFeature.value = undefined;
  clickedLayer.value = undefined;
}

watch(selectedLayers, updateLayersShown)

watch(showMapBaseLayer, updateBaseLayer);
/* eslint-enable @typescript-eslint/ban-ts-comment */

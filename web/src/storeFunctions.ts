import { watch } from "vue";

import {
  availableProjects,
  currentProject,
  availableDatasets,
  selectedDatasets,
  currentDataset,
  map,
  showMapTooltip,
  selectedDatasetLayers,
  clickedDatasetLayer,
  clickedFeature,
  showMapBaseLayer,
  selectedSourceRegions,
  rasterTooltipEnabled,
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
  clickedFeatureCandidates,
  panelArrangement,
  draggingPanel,
  draggingFrom,
  dragModes,
} from "./store";
import { getProjects, getDataset } from "@/api/rest";
import {
  clearMapLayers,
  datasetLayerFromMapLayerID,
  styleNetworkVectorTileLayer,
  updateBaseLayer,
} from "./layers";
import { FloatingPanelConfig, Project } from "./types";

export function clearState() {
  availableDatasets.value = undefined;
  selectedDatasets.value = [];
  currentDataset.value = undefined;
  selectedDatasetLayers.value = [];
  clickedDatasetLayer.value = undefined;
  showMapBaseLayer.value = true;
  clickedFeature.value = undefined;
  rasterTooltipEnabled.value = false;
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
  let offsetX = 40;
  const offsetY = 40;
  const snapToleranceX = 300;
  const snapToleranceY = 100;
  const minHeight = 100;
  const minWidth = 150;

  const panel = panelArrangement.value.find(
    (p) => p.id === draggingPanel.value
  );
  if (!panel) return undefined;

  if (panel.right) offsetX += document.body.clientWidth - 350;
  const position = {
    x: event.clientX - offsetX,
    y: event.clientY - offsetY,
  };
  if (dragModes.value?.includes("position")) {
    if (!panel.initialPosition) {
      panel.initialPosition = position;
    }
    if (panel.initialPosition) {
      if (
        Math.abs(position.x - panel.initialPosition.x) < snapToleranceX &&
        Math.abs(position.y - panel.initialPosition.y) < snapToleranceY
      ) {
        // snap to sidebar
        panel.position = undefined;
        panel.width = undefined;
        panel.height = undefined;
      } else {
        // convert to floating
        panel.position = position;
        panel.width = 250;
        panel.height = 150;
      }
    }
  }
  if (draggingFrom.value) {
    const from: { x: number; y: number } = { ...draggingFrom.value };
    if (dragModes.value?.includes("height") && draggingFrom.value) {
      if (!panel.height && panel.dockedHeight) {
        panel.height = panel.dockedHeight;
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

  if (datasetLayer !== undefined) {
    styleNetworkVectorTileLayer(datasetLayer);
  }
}

watch(currentProject, () => {
  clearState();
  setMapCenter(currentProject.value);
  clearMapLayers();
});
watch(currentDataset, () => {
  rasterTooltipEnabled.value = false;
});

export function clearClickedFeatureData() {
  clickedFeature.value = undefined;
  showMapTooltip.value = false;
  clickedDatasetLayer.value = undefined;
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// See all of the clicked features, and display the one that's at the highest layer
watch(clickedFeatureCandidates, (features) => {
  if (!features.length) {
    return;
  }

  const map = getMap();
  const layerIds = map.getLayersOrder();

  // TypeScript complains about this type being too complex for some reason.
  // @ts-ignore
  const featureLayerIDs = new Set(features.map((f) => f.feature.layer.id));

  // Find the highest layer that was clicked
  // TypeScript complains about this type being too complex for some reason.
  // @ts-ignore
  const selectedLayerID = layerIds.toReversed().find((id) => {
    return featureLayerIDs.has(id);
  });
  const selectedFeature = features.find(
    (f) => f.feature.layer.id === selectedLayerID
  );

  // If none found, just reset values
  if (selectedLayerID === undefined || selectedFeature === undefined) {
    clearClickedFeatureData();
    return;
  }

  // Set new values
  // TypeScript complains about this type being too complex for some reason.
  // @ts-ignore
  clickedFeature.value = selectedFeature;
  showMapTooltip.value = true;
  clickedDatasetLayer.value = datasetLayerFromMapLayerID(
    selectedFeature.feature.layer.id
  );

  // We've selected the feature we want to show, so clear this array, as otherwise things will continue to be appended to it.
  clickedFeatureCandidates.splice(0, clickedFeatureCandidates.length);
});

watch(showMapBaseLayer, updateBaseLayer);
/* eslint-enable @typescript-eslint/ban-ts-comment */

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
  regionGroupingActive,
  regionGroupingType,
  rasterTooltipEnabled,
  polls,
  availableCharts,
  currentChart,
  availableSimulationTypes,
  currentSimulationType,
  availableDerivedRegions,
  selectedDerivedRegions,
  currentNetworkDataset,
  currentNetworkDatasetLayer,
  currentNetworkGCC,
  deactivatedNodes,
  currentError,
  tooltipOverlay,
  clickedFeatureCandidates,
} from "./store";
import { getProjects, getDataset, getProjectDerivedRegions } from "@/api/rest";
import {
  clearMapLayers,
  datasetLayerFromMapLayerID,
  styleNetworkVectorTileLayer,
  updateBaseLayer,
} from "./layers";
import { Project } from "./types";

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
  availableDerivedRegions.value = undefined;
  selectedSourceRegions.value = [];
  selectedDerivedRegions.value = [];
  regionGroupingActive.value = false;
  regionGroupingType.value = undefined;
  currentNetworkDataset.value = undefined;
  currentNetworkDatasetLayer.value = undefined;
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

export function setMapCenter(project: Project | undefined) {
  let center: [number, number] = [0, 30];
  let zoom = 1;
  if (project) {
    center = project.default_map_center;
    zoom = project.default_map_zoom;
  }
  const map = getMap();
  map.jumpTo({ center, zoom });
}

export function getCurrentMapPosition() {
  const map = getMap();
  let center = [0, 0];
  let zoom = map.getZoom();
  const centerLngLat = map.getCenter();
  if (centerLngLat) center = [centerLngLat.lng, centerLngLat.lat];
  if (zoom) zoom = Math.floor(zoom);
  else zoom = 1;
  return { center, zoom };
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

import { watch } from "vue";

import {
  availableContexts,
  currentContext,
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
  loading,
  currentError,
  tooltipOverlay,
  clickedFeatureCandidates,
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
import {
  datasetLayerFromMapLayerID,
  styleNetworkVectorTileLayer,
} from "./layers";

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

export function getTooltip() {
  if (tooltipOverlay.value === undefined) {
    throw new Error("Tooltip not yet initialized!");
  }
  return tooltipOverlay.value;
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
  const map = getMap();
  map.setCenter(currentContext.value.default_map_center);
  map.setZoom(currentContext.value.default_map_zoom);
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

watch(currentContext, () => {
  clearState();
  clearMap();
  loadDatasets();
  loadCharts();
  loadSimulationTypes();
  loadDerivedRegions();
});
watch(currentDataset, () => {
  rasterTooltipEnabled.value = false;
});

export function clearClickedFeatureData() {
  clickedFeature.value = undefined;
  showMapTooltip.value = false;
  clickedDatasetLayer.value = undefined;
}

// See all of the clicked features, and display the one that's at the highest layer
watch(clickedFeatureCandidates, (features) => {
  if (!features.length) {
    return;
  }

  const map = getMap();
  const layerIds = map.getLayersOrder();
  const featureLayerIDs = new Set(features.map((f) => f.feature.layer.id));

  // Find the highest layer that was clicked
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  clickedFeature.value = selectedFeature;
  showMapTooltip.value = true;
  clickedDatasetLayer.value = datasetLayerFromMapLayerID(
    selectedFeature.feature.layer.id
  );

  // We've selected the feature we want to show, so clear this array, as otherwise things will continue to be appended to it.
  clickedFeatureCandidates.splice(0, clickedFeatureCandidates.length);
});

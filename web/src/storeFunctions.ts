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
  availableAnalysisTypes,
  currentAnalysisType,
  currentError,
  tooltipOverlay,
  panelArrangement,
  draggingPanel,
  draggingFrom,
  dragModes,
  loadingDatasets,
  loadingAnalysisTypes,
  loadingCharts,
  selectedLayerStyles,
  loadingProjects,
  loadingNetworks,
  currentNetwork,
} from "./store";
import {
  getProjects,
  getDataset,
  getProjectCharts,
  getProjectAnalysisTypes,
  getProjectDatasets,
  getDatasetLayers,
  getProjectNetworks,
} from "@/api/rest";
import { addLayer, clearMapLayers, updateBaseLayer, updateLayersShown } from "./layers";
import { Chart, Dataset, Layer, Project } from "./types";

export function clearState() {
  clearProjectState();
  showMapBaseLayer.value = true;
  currentError.value = undefined;
  polls.value = {};
  panelArrangement.value = [
    { id: "datasets",
      label: "Datasets",
      visible: true,
      closeable: false,
      dock: 'left',
      order: 1
    },
    {
      id: "layers",
      label: "Selected Layers",
      visible: true,
      closeable: false,
      dock: 'left',
      order: 2,
    },
    {
      id: "charts",
      label: "Charts",
      visible: true,
      closeable: true,
      dock: 'right',
      order: 1,
    },
    {
      id: 'networks',
      label: 'Networks',
      visible: true,
      closeable: true,
      dock: 'right',
      order: 2,
    },
    {
      id: "analytics",
      label: "Analytics",
      visible: true,
      closeable: true,
      dock: 'right',
      order: 3,
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
  availableAnalysisTypes.value = undefined;
  currentAnalysisType.value = undefined;
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
    loadingProjects.value = false;
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

export function isVisible(value: any): boolean {
  if (value.type == 'Chart') {
    const chartPanel = panelArrangement.value.find((panel) => panel.id === 'charts')
    if (!chartPanel) return false;
    return currentChart.value?.id == value.id && chartPanel.visible
  } else if (value.type === 'Dataset') {
    return selectedLayers.value.some((layer) => {
      return layer.dataset.id === value.id && layer.visible
    })
  } else if (value.type === 'Layer') {
    return selectedLayers.value.some((layer) => {
      return layer.id === value.id && layer.visible
    });
  } else if (value.type === 'Network') {
    return isVisible({
      ...value.dataset,
      type: 'Dataset',
    })
  } else if (value.type === 'AnalysisResult') {
    const analysisType = availableAnalysisTypes.value?.find((t) => t.db_value === value.analysis_type)
    if (analysisType) {
      const showables: Record<string, any>[] = []
       Object.entries(value.outputs).forEach(
        ([outputKey, outputValue]) => {
          const type = analysisType?.output_types[outputKey]
          if (showableTypes.includes(type)) {
            showables.push({
              id: outputValue,
              type
            })
          }
        }
      );
      Object.entries(value.inputs).forEach(
        ([inputKey, inputValue])=> {
          const type = analysisType?.input_types[inputKey]
          const value: Record<string, any> = analysisType.input_options[inputKey]?.find((o: any) => o.id === inputValue)
          if (showableTypes.includes(type)) {
            showables.push({
              ...value,
              type
            })
          }
        }
      );
      return showables.every((o) => isVisible(o))
    }
  }
  return false;
}

export function show(value: any) {
  if (value.type === 'Chart') {
    const chartPanel = panelArrangement.value.find((panel) => panel.id === 'charts')
    if (chartPanel && !chartPanel?.visible) chartPanel.visible = true
    currentChart.value = value as Chart
  } else if (value.type === 'Dataset') {
    getDatasetLayers(value.id).then((layers) => {
      layers.forEach((layer) => {
        show({
          ...layer,
          type: 'Layer'
        })
      })
    })
  } else if (value.type === 'Layer') {
    let add = true
    selectedLayers.value = selectedLayers.value.map((layer) => {
        if (add && layer.id === value.id) {
          layer.visible = true;
          add = false;
        }
        return layer
    })
    if (add) addLayer(value as Layer)
  } else if (value.type === 'Network') {
    show({
      ...value.dataset,
      type: 'Dataset',
    })
  } else if (value.type === 'AnalysisResult') {
    const analysisType = availableAnalysisTypes.value?.find((t) => t.db_value === value.analysis_type)
    if (analysisType) {
      Object.entries(value.outputs).map(([outputKey, outputValue]) => {
        const type = analysisType.output_types[outputKey]
        if (showableTypes.includes(type)) {
          show({
            id: outputValue,
            type
          })
        }
      })
      Object.entries(value.inputs).map(([inputKey, inputValue]) => {
        const type = analysisType.input_types[inputKey]
        const value: Record<string, any> = analysisType.input_options[inputKey].find((o: any) => o.id === inputValue)
        if (showableTypes.includes(type)) {
          show({
            ...value,
            type
          })
        }
      })
    }
  }
   else if (['RasterData', 'VectorData'].includes(value.type)) {
    if (value.dataset) {
      getDataset(value.dataset).then((dataset) => {
        show({
          ...dataset,
          type: 'Dataset'
        })
      })
    }
   }
}

export const showableTypes = ['Chart', 'Dataset', 'Network', 'Layer', 'AnalysisResult', 'RasterData', 'VectorData']


watch(selectedLayers, updateLayersShown)

watch(showMapBaseLayer, updateBaseLayer);

import {
    getProjects,
    getDataset,
    getProjectCharts,
    getProjectAnalysisTypes,
    getProjectDatasets,
    getDatasetLayers,
    getProjectNetworks,
} from '@/api/rest';
import { Dataset, Project } from '@/types';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useNetworkStore } from './network';

import { useMapStore } from './map';
import { useLayerStore } from './layer';
import { useAnalysisStore } from './analysis';
import { usePanelStore } from './panel';
import { useAppStore } from './app';

export const useProjectStore = defineStore('project', () => {
    const loadingProjects = ref<boolean>(true);
    const availableProjects = ref<Project[]>([]);
    const currentProject = ref<Project>();
    const projectConfigMode = ref<"new" | "existing">();
    const polls = ref<Record<number, number>>({});
    const loadingDatasets = ref<boolean>(false);
    const availableDatasets = ref<Dataset[]>();

    const networkStore = useNetworkStore();
    const analysisStore = useAnalysisStore();
    const mapStore = useMapStore();
    const layerStore = useLayerStore();
    const panelStore = usePanelStore();
    const appStore = useAppStore();

    watch(currentProject, () => {
        clearProjectState();
        mapStore.setMapCenter(currentProject.value);
        mapStore.clearMapLayers();
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

    function clearState() {
        clearProjectState();
        mapStore.showMapBaseLayer = true;
        appStore.currentError = undefined;
        polls.value = {};

        panelStore.resetPanels();
        panelStore.draggingPanel = undefined;
        panelStore.draggingFrom = undefined;
        panelStore.dragModes = [];
    }

    function clearProjectState() {
        availableDatasets.value = undefined;

        layerStore.selectedLayers = [];
        layerStore.selectedLayerStyles = {};

        mapStore.clickedFeature = undefined;

        networkStore.availableNetworks = [];

        analysisStore.availableCharts = undefined;
        analysisStore.currentChart = undefined;
        analysisStore.availableAnalysisTypes = undefined;
        analysisStore.currentAnalysisType = undefined;
    }

    watch(projectConfigMode, loadProjects);
    function loadProjects() {
        clearState();
        getProjects().then((data) => {
            availableProjects.value = data;
            loadingProjects.value = false;
        });
    }

    // TODO: Seems unused entirely
    function pollForProcessingDataset(datasetId: number) {
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

    return {
        loadingProjects,
        availableProjects,
        currentProject,
        projectConfigMode,
        polls,
        loadingDatasets,
        availableDatasets,
        clearState,
        clearProjectState,
        loadProjects,
    }
});

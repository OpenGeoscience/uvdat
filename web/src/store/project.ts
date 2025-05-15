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

import {
    useNetworkStore,
    useMapStore,
    useLayerStore,
    useAnalysisStore,
    usePanelStore,
    useAppStore,
    useStyleStore,
} from '.';

export const useProjectStore = defineStore('project', () => {
    const networkStore = useNetworkStore();
    const analysisStore = useAnalysisStore();
    const mapStore = useMapStore();
    const layerStore = useLayerStore();
    const panelStore = usePanelStore();
    const appStore = useAppStore();
    const styleStore = useStyleStore();

    const loadingProjects = ref<boolean>(true);
    const availableProjects = ref<Project[]>([]);
    const currentProject = ref<Project>();
    const projectConfigMode = ref<"new" | "existing">();
    const loadingDatasets = ref<boolean>(false);
    const availableDatasets = ref<Dataset[]>();

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

        panelStore.resetPanels();
        panelStore.draggingPanel = undefined;
        panelStore.draggingFrom = undefined;
        panelStore.dragModes = [];
    }

    function clearProjectState() {
        availableDatasets.value = undefined;

        layerStore.selectedLayers = [];
        styleStore.selectedLayerStyles = {};

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

    return {
        loadingProjects,
        availableProjects,
        currentProject,
        projectConfigMode,
        loadingDatasets,
        availableDatasets,
        clearState,
        clearProjectState,
        loadProjects,
    }
});

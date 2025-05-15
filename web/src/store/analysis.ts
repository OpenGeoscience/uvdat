import { getProjectAnalysisTypes, getProjectCharts } from '@/api/rest';
import { Chart, AnalysisType } from '@/types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAnalysisStore = defineStore('analysis', () => {
    const loadingCharts = ref<boolean>(false);
    const availableCharts = ref<Chart[]>();
    const currentChart = ref<Chart>();
    const loadingAnalysisTypes = ref<boolean>(false);
    const availableAnalysisTypes = ref<AnalysisType[]>();
    const currentAnalysisType = ref<AnalysisType>();
    
    function initCharts(projectId: number) {
        loadingCharts.value = true;
        getProjectCharts(projectId).then((charts) => {
            availableCharts.value = charts;
            currentChart.value = undefined;

            loadingCharts.value = false;
        });
    }

    function initAnalysisTypes(projectId: number) {
        loadingAnalysisTypes.value = true;
        getProjectAnalysisTypes(projectId).then((types) => {
            availableAnalysisTypes.value = types;
            currentAnalysisType.value = undefined;

            loadingAnalysisTypes.value = false;
        })
    }

    return {
        loadingCharts,
        availableCharts,
        currentChart,
        loadingAnalysisTypes,
        availableAnalysisTypes,
        currentAnalysisType,
        initCharts,
        initAnalysisTypes,
    }
});

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
    

    return {
        loadingCharts,
        availableCharts,
        currentChart,
        loadingAnalysisTypes,
        availableAnalysisTypes,
        currentAnalysisType,
    }
});

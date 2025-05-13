import { getDataset, getDatasetLayers } from "./api/rest";
import { availableAnalysisTypes, currentChart, panelArrangement } from "./store";
import { useMapStore } from "./store/map";
import { AnalysisResult, Chart, Dataset, Layer, Network, RasterData, VectorData } from "./types";


export const showableTypes = ['chart', 'dataset', 'network', 'layer', 'analysisresult', 'rasterdata', 'vectordata']


interface Showable {
    chart?: Chart,
    dataset?: Dataset,
    layer?: Layer,
    network?: Network,
    rasterdata?: RasterData,
    vectordata?: VectorData,
    analysisresult?: AnalysisResult,
}


export function resetPanels() {
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
}


export function isVisible(showable: Showable): boolean {
    const mapStore = useMapStore();
    if (showable.chart) {
        const chartPanel = panelArrangement.value.find((panel) => panel.id === 'charts')
        if (!chartPanel) return false;
        return currentChart.value?.id == showable.chart.id && chartPanel.visible
    } else if (showable.dataset) {
        return mapStore.selectedLayers.some((layer) => {
            return layer.dataset.id === showable.dataset?.id && layer.visible
        })
    } else if (showable.layer) {
        return mapStore.selectedLayers.some((layer) => {
            return layer.id === showable.layer?.id && layer.visible
        });
    } else if (showable.network) {
        return isVisible({dataset: showable.network.dataset})
    } else if (showable.analysisresult) {
        const analysisType = availableAnalysisTypes.value?.find((t) => t.db_value === showable.analysisresult?.analysis_type)
        if (analysisType) {
            const showableChildren: Record<string, any>[] = []
            Object.entries(showable.analysisresult.outputs).forEach(
                ([outputKey, outputValue]) => {
                    const type = analysisType?.output_types[outputKey].toLowerCase()
                    if (showableTypes.includes(type)) {
                        showableChildren.push({
                            id: outputValue,
                            type
                        })
                    }
                }
            );
            Object.entries(showable.analysisresult.inputs).forEach(
                ([inputKey, inputValue])=> {
                    const type = analysisType?.input_types[inputKey].toLowerCase()
                    const value: Record<string, any> = analysisType.input_options[inputKey]?.find((o: any) => o.id === inputValue)
                    if (showableTypes.includes(type)) {
                        showableChildren.push({
                            ...value,
                            type
                        })
                    }
                }
            );
            return showableChildren.every((o) => isVisible({[o.type]: o}))
        }
    } else if (showable.rasterdata) {
        return isVisible({dataset: {id: showable.rasterdata.dataset}})
    } else if (showable.vectordata) {
        return isVisible({dataset: {id: showable.vectordata.dataset}})
    }
    return false;
}


export function show(showable: Showable) {
    const mapStore = useMapStore();
    if (showable.chart) {
        const chartPanel = panelArrangement.value.find((panel) => panel.id === 'charts')
        if (chartPanel && !chartPanel?.visible) chartPanel.visible = true
        currentChart.value = showable.chart
    } else if (showable.dataset) {
        getDatasetLayers(showable.dataset.id).then((layers) => {
            layers.forEach((layer) => {show({layer})})
        })
    } else if (showable.layer) {
        let add = true
        mapStore.selectedLayers = mapStore.selectedLayers.map((layer) => {
            if (add && layer.id === showable.layer?.id) {
                layer.visible = true;
                add = false;
            }
            return layer
        })
        if (add) {
            mapStore.addLayer(showable.layer)
        }
    } else if (showable.network) {
        show({dataset: showable.network.dataset})
    } else if (showable.analysisresult) {
        const analysisType = availableAnalysisTypes.value?.find((t) => t.db_value === showable.analysisresult?.analysis_type)
        if (analysisType) {
            Object.entries(showable.analysisresult.outputs).map(([outputKey, outputValue]) => {
                const type = analysisType.output_types[outputKey].toLowerCase()
                if (showableTypes.includes(type)) {
                    show({[type]: {id: outputValue}})
                }
            })
            Object.entries(showable.analysisresult.inputs).map(([inputKey, inputValue]) => {
                const type = analysisType.input_types[inputKey].toLowerCase()
                const value: Record<string, any> = analysisType.input_options[inputKey].find((o: any) => o.id === inputValue)
                if (showableTypes.includes(type)) {
                    show({[type]: value})
                }
            })
        }
    }
    else if (showable.rasterdata) {
        if (showable.rasterdata.dataset) {
            getDataset(showable.rasterdata.dataset).then((dataset) => {
                show({dataset})
            })
        }
    }
    else if (showable.vectordata) {
        if (showable.vectordata.dataset) {
            getDataset(showable.vectordata.dataset).then((dataset) => {
                show({dataset})
            })
        }
    }
}

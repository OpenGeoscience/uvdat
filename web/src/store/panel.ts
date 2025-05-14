import { FloatingPanelConfig, AnalysisResult, Chart, Dataset, Layer, Network, RasterData, VectorData } from '@/types';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAppStore } from './app';
import { getDataset } from '@/api/rest';
import { useLayerStore } from './layer';
import { getDatasetLayers } from '@/api/rest';
import { useAnalysisStore } from './analysis';

const showableTypes = ['chart', 'dataset', 'network', 'layer', 'analysisresult', 'rasterdata', 'vectordata']

interface Showable {
    chart?: Chart,
    dataset?: Dataset,
    layer?: Layer,
    network?: Network,
    rasterdata?: RasterData,
    vectordata?: VectorData,
    analysisresult?: AnalysisResult,
}

function defaultPanelArrangement(): FloatingPanelConfig[] {
    return [
        {
            id: "datasets",
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

export const usePanelStore = defineStore('panel', () => {
    const panelArrangement = ref<FloatingPanelConfig[]>([]);
    const draggingPanel = ref<string | undefined>();
    const draggingFrom = ref<{ x: number; y: number } | undefined>();
    const dragModes = ref<("position" | "height" | "width")[]>();

    const analysisStore = useAnalysisStore();

    function resetPanels() {
        panelArrangement.value = defaultPanelArrangement();
    }

    function startDrag(
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

    function dragPanel(event: MouseEvent) {
        const appStore = useAppStore();

        let offsetX = -5;
        const offsetY = 30;
        const minHeight = 100;
        const minWidth = 150;

        const panel = panelArrangement.value.find(
            (p) => p.id === draggingPanel.value
        );
        if (!panel) return undefined;
        if (draggingFrom.value) {
            const from: { x: number; y: number } = { ...draggingFrom.value };

            if (panel.dock == 'right') offsetX += document.body.clientWidth - 390;
            const position = {
                x: event.clientX - offsetX - (panel.element?.clientWidth || 0),
                y: event.clientY - offsetY,
            };
            if (dragModes.value?.includes("position")) {
                const allowDock = (
                    Math.abs(from.x - event.clientX) > 10 &&
                    Math.abs(from.y - event.clientY) > 10
                )
                if (
                    allowDock &&
                    appStore.openSidebars.includes("left") &&
                    event.clientX < 350
                ) {
                    // dock left
                    panel.dock = 'left';
                    panel.position = undefined;
                    panel.width = undefined;
                    panel.height = undefined;
                    // determine order
                    const currentDocked = panelArrangement.value.filter((p) => p.dock === 'left' && !p.position)
                    panel.order = Math.ceil(event.clientY / (document.body.clientHeight / currentDocked.length))
                } else if (
                    allowDock &&
                    appStore.openSidebars.includes("right") &&
                    event.clientX > document.body.clientWidth - 350
                ) {
                    // dock right
                    panel.dock = 'right';
                    panel.position = undefined;
                    panel.width = undefined;
                    panel.height = undefined;
                    // determine order
                    const currentDocked = panelArrangement.value.filter((p) => p.dock === 'right' && !p.position)
                    panel.order = Math.ceil(event.clientY / (document.body.clientHeight / currentDocked.length))
                } else if (!panel.position) {
                    // float
                    panel.width = 300;
                    panel.height = 200;
                    panel.position = position;
                } else {
                    panel.position = position;
                }
            }
            if (dragModes.value?.includes("height")) {
                if (!panel.height) {
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
            if (dragModes.value?.includes("width") && panel.width) {
                const widthDelta = event.clientX - draggingFrom.value.x;
                if (panel.width + widthDelta > minWidth) {
                    panel.width = panel.width + widthDelta;
                    from.x = event.clientX;
                }
            }
            draggingFrom.value = from;
        }
    }

    function stopDrag() {
        draggingPanel.value = undefined;
        draggingFrom.value = undefined;
        dragModes.value = [];
    }

    function isVisible(showable: Showable): boolean {
        const layerStore = useLayerStore();
        if (showable.chart) {
            const chartPanel = panelArrangement.value.find((panel) => panel.id === 'charts')
            if (!chartPanel) return false;
            return analysisStore.currentChart?.id == showable.chart.id && chartPanel.visible
        } else if (showable.dataset) {
            return layerStore.selectedLayers.some((layer) => {
                return layer.dataset.id === showable.dataset?.id && layer.visible
            })
        } else if (showable.layer) {
            return layerStore.selectedLayers.some((layer) => {
                return layer.id === showable.layer?.id && layer.visible
            });
        } else if (showable.network) {
            return isVisible({dataset: showable.network.dataset})
        } else if (showable.analysisresult) {
            const analysisType = analysisStore.availableAnalysisTypes?.find((t) => t.db_value === showable.analysisresult?.analysis_type)
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
    
    
    function show(showable: Showable) {
        const layerStore = useLayerStore();
        if (showable.chart) {
            const chartPanel = panelArrangement.value.find((panel) => panel.id === 'charts')
            if (chartPanel && !chartPanel?.visible) chartPanel.visible = true
            analysisStore.currentChart = showable.chart
        } else if (showable.dataset) {
            getDatasetLayers(showable.dataset.id).then((layers) => {
                layers.forEach((layer) => {show({layer})})
            })
        } else if (showable.layer) {
            let add = true
            layerStore.selectedLayers = layerStore.selectedLayers.map((layer) => {
                if (add && layer.id === showable.layer?.id) {
                    layer.visible = true;
                    add = false;
                }
                return layer
            })
            if (add) {
                layerStore.addLayer(showable.layer)
            }
        } else if (showable.network) {
            show({dataset: showable.network.dataset})
        } else if (showable.analysisresult) {
            const analysisType = analysisStore.availableAnalysisTypes?.find((t) => t.db_value === showable.analysisresult?.analysis_type)
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


    return {
        showableTypes,
        panelArrangement,
        draggingPanel,
        draggingFrom,
        dragModes,
        resetPanels,
        startDrag,
        dragPanel,
        stopDrag,
        isVisible,
        show,
    }
});

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useLayerStore } from './layer';

interface DisplayCompareMapLayerItem {
    displayName: string;
    state: boolean;
    layerIds: string[];
}

interface DisplaycompareMapLayer {
    mapLayerA: DisplayCompareMapLayerItem[];
    mapLayerB: DisplayCompareMapLayerItem[];
}

export const useMapCompareStore = defineStore('mapCompare', () => {
    const isComparing = ref<boolean>(false);
    const orientation = ref<'horizontal' | 'vertical'>('vertical');
    const displayLayers = ref<DisplaycompareMapLayer>({
        mapLayerA: [],
        mapLayerB: [],
    });
    const layerStore = useLayerStore();

    const generateDisplayLayers = () => {
        const displayLayers: DisplaycompareMapLayer = {
            mapLayerA: [],
            mapLayerB: [],
        };
        layerStore.selectedLayers.forEach(layer => {
            const layerItem: DisplayCompareMapLayerItem = {
                displayName: layer.name,
                state: layer.visible,
                layerIds: layerStore.getMapLayersFromLayerObject(layer).flat()
            };
            displayLayers.mapLayerA.push(layerItem);
            displayLayers.mapLayerB.push(layerItem);
        });
        return displayLayers;
    };
    watch(isComparing, (newVal) => {
        if (newVal) {
            displayLayers.value = generateDisplayLayers();
        }
    });

    return {
        isComparing,
        orientation,
        displayLayers,  
    }
});

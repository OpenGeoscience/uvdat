import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useLayerStore } from './layer';
import { cloneDeep } from 'lodash';

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
        const localDisplayLayers: DisplaycompareMapLayer = {
            mapLayerA: [],
            mapLayerB: [],
        };
        layerStore.selectedLayers.forEach(layer => {
            const layerIds = layerStore.getMapLayersFromLayerObject(layer).flat();
            const layerItemA: DisplayCompareMapLayerItem = {
                displayName: layer.name,
                state: layer.visible,
                layerIds: [...layerIds]
            };
            const layerItemB: DisplayCompareMapLayerItem = {
                displayName: layer.name,
                state: layer.visible,
                layerIds: [...layerIds]
            };
            localDisplayLayers.mapLayerA.push(layerItemA);
            localDisplayLayers.mapLayerB.push(layerItemB);
        });
        displayLayers.value = localDisplayLayers;
    };
    watch(isComparing, (newVal) => {
        if (newVal) {
           generateDisplayLayers();
        }
    });

    const setAllVisibility = (map: 'A' | 'B', visible=true) => {
        const copyLayers = cloneDeep(displayLayers.value);
        const layerItems = (map === 'A' ? copyLayers.mapLayerA : copyLayers.mapLayerB);
        layerItems.forEach((layer) => {
            layer.state = visible;
        });
        displayLayers.value = copyLayers;
    }

    const setVisibility = (map: 'A' | 'B', displayName: string, visible=true) => {
        const copyLayers = cloneDeep(displayLayers.value);
        const layerItems = (map === 'A' ? copyLayers.mapLayerA : copyLayers.mapLayerB);
        const layerItemIndex = layerItems.findIndex((l) => l.displayName === displayName);
        if (layerItemIndex !== -1) {
            layerItems[layerItemIndex].state = visible;
        }
        displayLayers.value = copyLayers;
    };
    
    return {
        isComparing,
        orientation,
        displayLayers,  
        setVisibility,
        setAllVisibility,
        generateDisplayLayers,
    }
});

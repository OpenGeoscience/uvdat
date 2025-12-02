import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useLayerStore } from './layer';
import { cloneDeep } from 'lodash';
import { useMapStore } from './map';
import { MapLayerStyleRaw } from './style';

interface DisplayCompareMapLayerItem {
    displayName: string;
    state: boolean;
    layerIds: string[];
}

interface DisplaycompareMapLayer {
    mapLayerA: DisplayCompareMapLayerItem[];
    mapLayerB: DisplayCompareMapLayerItem[];
}

export interface MapStats {
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
}



export const useMapCompareStore = defineStore('mapCompare', () => {
    const mapStore = useMapStore();
    const layerStore = useLayerStore();
    const isComparing = ref<boolean>(false);
    const orientation = ref<'horizontal' | 'vertical'>('vertical');
    const displayLayers = ref<DisplaycompareMapLayer>({
        mapLayerA: [],
        mapLayerB: [],
    });
    const mapStats = ref<MapStats>({
        center: [0,0],
        zoom: 0,
        bearing: 0,
        pitch: 0,
    });
    const mapAStyle = ref<ReturnType<maplibregl.Map['getStyle']> | undefined>(undefined);
    const mapBStyle = ref<ReturnType<maplibregl.Map['getStyle']> | undefined>(undefined);

    const initlizeComparing = () => {
        const map = mapStore.getMap();
        const style = map.getStyle();
        mapStats.value = {
            center: map.getCenter().toArray() as [number, number],
            zoom: map.getZoom() as number,
            bearing: map.getBearing() as number,
            pitch: map.getPitch() as number,
        };
        mapAStyle.value = cloneDeep(style);
        mapBStyle.value = cloneDeep(style);
        generateDisplayLayers();
    }

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
    function updateMapStats(event: { center: [number, number], zoom: number, bearing: number, pitch: number }) {
        mapStats.value.center = event.center;
        mapStats.value.zoom = event.zoom;
        mapStats.value.bearing = event.bearing;
        mapStats.value.pitch = event.pitch;  
    }

    const getBaseLayerSourceIds = () => {
        const map = mapStore.getMap();
        return map.getStyle().layers.filter((layer: any) => {
            const layerWithSource = layer as { source?: string };
            return layerWithSource.source?.includes('openstreetmap');
        }).map((layer: any) => layer.id);
    }


    const updateMapLayerStyle = (map: 'A' | 'B', mapLayerId: string, style: MapLayerStyleRaw) => {
        const mapStyle = map === 'A' ? mapAStyle.value : mapBStyle.value;
        if (!mapStyle) return;
        const sources = new Set<string>();
        mapStyle.layers.forEach((layer: any) => {
            if (layer.id === mapLayerId) {
                layer.paint = style.paint;
                sources.add(layer.source);
            }
        });
        console.log(sources);
        console.log(style.tileURL);
        if (style.tileURL && sources.size > 0) {
            sources.forEach((sourceId) => {
                if (mapStyle.sources[sourceId] && mapStyle.sources[sourceId].type === 'raster') {
                    mapStyle.sources[sourceId].url = style.tileURL;
                }
            });
        }
    }

    // Array of Enabled map layer IDs for Map A in order
    const mapLayersA = computed(() => {
        const flatList: string[] = [];
        const baseLayerSourceIds = getBaseLayerSourceIds();
        layerStore.selectedLayers.forEach((layer) => {
            if (displayLayers.value.mapLayerA.find((l) => l.displayName === layer.name)?.state === false) {
                return;
            }
            const mapLayerIds = layerStore.getMapLayersFromLayerObject(layer);
            flatList.push(...mapLayerIds);
        });
        if (mapStore.showMapBaseLayer) {
        baseLayerSourceIds.forEach((sourceId: string) => {
                if (sourceId) {
                    flatList.push(sourceId);
                }
            });
        }
        return flatList;
    });

    // Array of enabled Layers for Map B in order
    const mapLayersB = computed(() => {
        const flatList: string[] = [];
        const baseLayerSourceIds = getBaseLayerSourceIds();
        layerStore.selectedLayers.forEach((layer) => {
            if (displayLayers.value.mapLayerB.find((l) => l.displayName === layer.name)?.state === false) {
                return;
            }
            const mapLayerIds = layerStore.getMapLayersFromLayerObject(layer);
            flatList.push(...mapLayerIds);
        });
        if (mapStore.showMapBaseLayer) {
            baseLayerSourceIds.forEach((sourceId: string) => {
                if (sourceId) {
                    flatList.push(sourceId);
                }
            });
        }
        return flatList;
    });


    watch(isComparing, (newVal) => {
        if (newVal) {
            initlizeComparing();
        }
    });


    watch(() => layerStore.selectedLayers, () => {
        if (isComparing.value) {
            mapAStyle.value = mapStore.getMap()?.getStyle();
            mapBStyle.value = mapStore.getMap()?.getStyle();
            generateDisplayLayers();
        }
    }, { deep: true });

    return {
        isComparing,
        orientation,
        displayLayers,
        mapStats,
        setVisibility,
        setAllVisibility,
        generateDisplayLayers,
        updateMapStats,
        updateMapLayerStyle,
        mapAStyle,
        mapBStyle,
        mapLayersA,
        mapLayersB,
    }
});

<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { useAppStore, useMapStore } from "@/store";
import { useMapCompareStore } from "@/store/compare";
import { computed, ref, watch } from "vue";
import Map from "./Map.vue";
import { LayerCompare } from "vue-maplibre-compare";
import { oauthClient } from "@/api/auth";
import 'vue-maplibre-compare/dist/vue-maplibre-compare.css'
import { ResourceType } from "maplibre-gl";
import { baseURL } from "@/api/auth";
interface MapStats {
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
}

const mapStore = useMapStore();
const compareStore = useMapCompareStore();
const appStore = useAppStore();


const transformRequest = (url: string, _resourceType?: ResourceType) => {
    // Only add auth headers to our own tile requests
    if (url.startsWith(baseURL)) {
        return {
            url,
            headers: oauthClient?.authHeaders,
        };
    }
    return { url };
}

const mapStyle = ref<ReturnType<maplibregl.Map['getStyle']> | undefined>(undefined);
mapStore.map?.getCenter()
const mapCenter = ref<[number, number]>([0,0]);
const mapZoom = ref<number>(0);
const tempStats: MapStats = {
    center: mapStore.map?.getCenter().toArray() as [number, number],
    zoom: mapStore.map?.getZoom() as number,
    bearing: mapStore.map?.getBearing() as number,
    pitch: mapStore.map?.getPitch() as number,
};
const computedCompare = computed(() => compareStore.isComparing);
watch(computedCompare, (newVal) => {
    if (newVal && mapStore.map) {
        mapStyle.value = mapStore.getMap()?.getStyle();
        tempStats.center = mapStore.getMap()?.getCenter().toArray() as [number, number];
        tempStats.zoom = mapStore.getMap()?.getZoom() as number;
        tempStats.bearing = mapStore.getMap()?.getBearing() as number;
        tempStats.pitch = mapStore.getMap()?.getPitch() as number;
        mapCenter.value = tempStats.center;
        mapZoom.value = tempStats.zoom;
    } else if (!newVal && mapStore.map) {
        console.log('exiting compare, jumping to temp stats');
        console.log(tempStats);
        mapStore.getMap()?.jumpTo({
            center: tempStats.center,
            zoom: tempStats.zoom,
            bearing: tempStats.bearing,
            pitch: tempStats.pitch,
        });
    }
});

function updateStats(event: { center: [number, number], zoom: number, bearing: number, pitch: number }) {
    tempStats.center = event.center;
    tempStats.zoom = event.zoom;
    tempStats.bearing = event.bearing;
    tempStats.pitch = event.pitch;  
}

function getBaseLayerSourceIds() {
    const map = mapStore.getMap();
    return map.getStyle().layers.filter((layer: any) => {
        const layerWithSource = layer as { source?: string };
        return layerWithSource.source?.includes('openstreetmap');
    }).map((layer: any) => layer.id);
  }

const mapLayersA = computed(() => {
    const flatList: string[] = [];
    const baseLayerSourceIds = getBaseLayerSourceIds();
    if (mapStore.showMapBaseLayer) {
    baseLayerSourceIds.forEach((sourceId: string) => {
            if (sourceId) {
                flatList.push(sourceId);
            }
        });
    }
    compareStore.displayLayers.mapLayerA.forEach((layer) => {
        if (layer.state) {
            flatList.push(...layer.layerIds);
        }
    });
    return flatList;
});
const mapLayersB = computed(() => {
    const flatList: string[] = [];
    const baseLayerSourceIds = getBaseLayerSourceIds();
    if (mapStore.showMapBaseLayer) {
        baseLayerSourceIds.forEach((sourceId: string) => {
            if (sourceId) {
                flatList.push(sourceId);
            }
        });
    }
    compareStore.displayLayers.mapLayerB.forEach((layer) => {
        if (layer.state) {
            flatList.push(...layer.layerIds);
        }
    });
    return flatList;
});
</script>

<template>
    <div class="map-wrapper">
        <Map
            v-show="!compareStore.isComparing"
            :transform-request="transformRequest"
        />
        <div v-if="compareStore.isComparing && mapStyle" class="layer-compare-wrapper">
            <LayerCompare
                :map-style="mapStyle"
                :map-layers-a="mapLayersA"
                :map-layers-b="mapLayersB"
                :center="mapCenter"
                :zoom="mapZoom"
                :orientation="compareStore.orientation"
                :transform-request="transformRequest"
                :swiper-options="{
                    darkMode: appStore.theme === 'dark',
                    orientation: compareStore.orientation,
                }"
                @panend="updateStats($event)"
                @zoomend="updateStats($event)"
                @pitchend="updateStats($event)"
                @rotateend="updateStats($event)"
            />
        </div>
    </div>
</template>

<style scoped>
.map-wrapper {
  height: 100vh;
  width: 100%;
  position: relative;
}

.layer-compare-wrapper {
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.map-compare {
  height: 100%;
  width: 100%;
  position: relative;
}

/* Ensure the internal map-compare-container gets proper height */
:deep(.map-compare-container) {
  height: 100% !important;
  width: 100% !important;
}

:deep(.map-compare-container .map) {
  height: 100% !important;
  width: 100% !important;
}

</style>

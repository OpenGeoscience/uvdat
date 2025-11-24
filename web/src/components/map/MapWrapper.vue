<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { useMapStore } from "@/store";
import { useMapCompareStore } from "@/store/compare";
import { computed, ref, watch } from "vue";
import Map from "./Map.vue";
import { LayerCompare } from "vue-maplibre-compare";
import { oauthClient } from "@/api/auth";
import 'vue-maplibre-compare/dist/vue-maplibre-compare.css'

const mapStore = useMapStore();
const compareStore = useMapCompareStore();;

const mapStyle = ref<ReturnType<maplibregl.Map['getStyle']> | undefined>(undefined);
mapStore.map?.getCenter()
const mapCenter = ref<[number, number]>([0,0]);
const mapZoom = ref<number>(0);
const computedCompare = computed(() => compareStore.isComparing);
watch(computedCompare, (newVal) => {
    if (newVal && mapStore.map) {
        mapStyle.value = mapStore.getMap()?.getStyle();
        mapCenter.value = mapStore.getMap()?.getCenter().toArray() as [number, number];
        mapZoom.value = mapStore.getMap()?.getZoom();
    }
});

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
        <Map v-show="!compareStore.isComparing" />
        <div v-if="compareStore.isComparing && mapStyle" class="layer-compare-wrapper">
            <LayerCompare
                :map-style="mapStyle"
                :map-layers-a="mapLayersA"
                :map-layers-b="mapLayersB"
                :center="mapCenter"
                :zoom="mapZoom"
                :orientation="compareStore.orientation"
                :headers="oauthClient.authHeaders"
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

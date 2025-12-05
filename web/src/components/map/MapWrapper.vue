<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { useAppStore, useLayerStore, useMapStore } from "@/store";
import { useMapCompareStore } from "@/store/compare";
import { computed, ref, watch } from "vue";
import Map from "./Map.vue";
import { MapCompare } from "vue-maplibre-compare";
import { oauthClient } from "@/api/auth";
import 'vue-maplibre-compare/dist/vue-maplibre-compare.css'
import { ResourceType } from "maplibre-gl";
import { baseURL } from "@/api/auth";
import { useTheme } from 'vuetify';

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

const computedCompare = computed(() => compareStore.isComparing);
const mapStats = computed(() => compareStore.mapStats);
watch(computedCompare, (newVal) => {
   if (!newVal && mapStore.map) {
        mapStore.getMap()?.jumpTo({
            center: mapStats.value?.center,
            zoom: mapStats.value?.zoom,
            bearing: mapStats.value?.bearing,
            pitch: mapStats.value?.pitch,
        });
    }
});

const mapStyleA = computed(() => compareStore.mapAStyle);
const mapStyleB = computed(() => compareStore.mapBStyle);
const mapLayersA = computed(() => compareStore.mapLayersA);
const mapLayersB = computed(() => compareStore.mapLayersB);

const swiperColor = computed(() => {
    const theme = useTheme();
    return theme.global.current.value.colors.primary
});
</script>

<template>
    <div class="map-wrapper">
        <Map
            v-show="!compareStore.isComparing"
            :transform-request="transformRequest"
        />
        <div v-if="compareStore.isComparing && mapStyleA && mapStyleB" class="layer-compare-wrapper">
            <MapCompare
                :map-style-a="mapStyleA"
                :map-style-b="mapStyleB"
                :map-layers-a="mapLayersA"
                :map-layers-b="mapLayersB"
                :camera="{
                    center: mapStats.center,
                    zoom: mapStats.zoom,
                }"
                :transform-request="transformRequest"
                :swiper-options="{
                    darkMode: appStore.theme !== 'dark',
                    orientation: compareStore.orientation,
                    grabThickness: 20,
                    lineColor: swiperColor,
                    handleColor: swiperColor
                }"
                layer-order="bottommost"
                @panend="compareStore.updateMapStats($event)"
                @zoomend="compareStore.updateMapStats($event)"
                @pitchend="compareStore.updateMapStats($event)"
                @rotateend="compareStore.updateMapStats($event)"
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

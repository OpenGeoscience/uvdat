<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { useMapStore } from "@/store";
import { useMapCompareStore } from "@/store/compare";
import { computed, onMounted, ref, watch } from "vue";
import Map from "./Map.vue";
import { LayerCompare } from "vue-maplibre-compare";
const mapStore = useMapStore();
const compareStore = useMapCompareStore();;

const mapStyle = ref<maplibregl.StyleSpecification | undefined>(undefined);
mapStore.map?.getCenter()
const mapCenter = ref<[number, number]>([0,0]);
const mapZoom = ref<number>(0);
const computedCompare = computed(() => compareStore.isComparing);
watch(computedCompare, (newVal) => {
    if (newVal && mapStore.map) {
        mapStyle.value = mapStore.map?.getStyle();
        mapCenter.value = mapStore.map.getCenter().toArray() as [number, number];
        mapZoom.value = mapStore.map.getZoom();
        console.log(mapStyle.value);
    }
});
const mapLayersA = computed(() => {
    const flatList: string[] = [];
    compareStore.displayLayers.mapLayerA.forEach((layer) => {
        if (layer.state) {
            flatList.push(...layer.layerIds);
        }
    });
    return flatList;
});
const mapLayersB = computed(() => {
    const flatList: string[] = [];
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
        <LayerCompare v-if="compareStore.isComparing && mapStyle"
            :map-style="mapStyle"
            :map-layers-a="mapLayersA"
            :map-layers-b="mapLayersB"
            :center="mapCenter"
            :zoom="mapZoom"
            :orientation="compareStore.orientation"
            class="map"
        />
    </div>
</template>

<style scoped>
.map-wrapper {
  height: 100%;
  width: 100%;
  position: relative;
}

.map {
  height: 100%;
  width: 100%;
  position: relative;
}

</style>

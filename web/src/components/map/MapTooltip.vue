<script setup lang="ts">
import { computed, watch } from "vue";
import * as turf from "@turf/turf";
import proj4 from "proj4";

import RecursiveTable from "../RecursiveTable.vue";

import { useMapStore, useLayerStore, useNetworkStore } from "@/store";
const layerStore = useLayerStore();
const networkStore = useNetworkStore();
const mapStore = useMapStore();

const clickedFeatureProperties = computed(() => {
  if (mapStore.clickedFeature === undefined) {
    return {};
  }
  const unwantedKeys = new Set([
    "colors",
    "geometry",
    "type",
    "id",
    "node_id",
    "edge_id",
  ]);
  return Object.fromEntries(
    Object.entries(mapStore.clickedFeature.feature.properties).filter(
      ([k, v]: [string, unknown]) => k && !unwantedKeys.has(k) && v
    )
  );
});

const clickedFeatureSourceType = computed(() => {
  if (mapStore.clickedFeature) {
    const feature = mapStore.clickedFeature.feature;
    if (feature.source.includes('.vector')) return 'vector'
    if (feature.source.includes('.bounds')) return 'raster'
  }
})

const rasterValue = computed(() => {
  if (mapStore.clickedFeature && clickedFeatureSourceType.value === 'raster') {
    const feature = mapStore.clickedFeature.feature;
    const { raster } = layerStore.getDBObjectsForSourceID(feature.source);
    if (raster?.id) {
      const data = mapStore.rasterTooltipDataCache[raster.id]?.data;
      if (data) {
        const {lng, lat} = mapStore.clickedFeature.pos;
        let {xmin, xmax, ymin, ymax, srs} = raster.metadata.bounds;
        [xmin, ymin] = proj4(srs, "EPSG:4326", [xmin, ymin]);
        [xmax, ymax] = proj4(srs, "EPSG:4326", [xmax, ymax]);
        // Convert lat/lng to array indices
        const x = Math.floor((lng - xmin) / (xmax - xmin) * data[0].length);
        const y = Math.floor((1 - (lat - ymin) / (ymax - ymin)) * data.length);
        return data[y][x];
      }
    }
  }
})


function zoomToFeature() {
  if (mapStore.clickedFeature === undefined) {
    return;
  }

  // Set map zoom to match bounding box of region
  const map = mapStore.getMap();
  const buffered = turf.buffer(
    mapStore.clickedFeature.feature,
    0.5, {units: 'kilometers'}
  )
  if (!buffered)  return;

  const bbox = turf.bbox(buffered);
  if (bbox.length !== 4) {
    throw new Error("Returned bbox should have 4 elements!");
  }
  map.fitBounds(bbox, {maxZoom: map.getZoom()});
}

// Check if the layer associated with the clicked feature is still selected and visible
watch(() => layerStore.selectedLayers, () => {
  if (mapStore.clickedFeature === undefined) {
    return;
  }
  const feature = mapStore.clickedFeature.feature;
  const sourceId = feature.source;
  const { layer } = layerStore.getDBObjectsForSourceID(sourceId);
  if (!layer?.visible) {
    mapStore.clickedFeature = undefined;
  }
});

// Handle clicked features and raster tooltip behavior.
// Feature clicks are given tooltip priority.
watch(
  () => mapStore.clickedFeature,
  () => {
    const tooltip = mapStore.getTooltip();
    if (mapStore.clickedFeature === undefined) {
      tooltip.remove();
      return;
    }
    // Set tooltip position. Give feature clicks priority
    const centroid = turf.centroid(mapStore.clickedFeature.feature)
    const center = centroid.geometry.coordinates as [number, number]
    tooltip.setLngLat(center);
    // This makes the tooltip visible
    tooltip.addTo(mapStore.getMap());
    zoomToFeature()
  }
);

const clickedFeatureIsDeactivatedNode = computed(
  () =>
    mapStore.clickedFeature &&
    networkStore.availableNetworks.find((network) => {
      return network.deactivated?.nodes.includes(
        mapStore.clickedFeature?.feature.properties.node_id
      )
    })
);

function toggleNodeHandler() {
  if (mapStore.clickedFeature === undefined) {
    throw new Error("Clicked node is undefined!");
  }
  const feature = mapStore.clickedFeature.feature;
  const sourceId = feature.source;
  const nodeId = mapStore.clickedFeature.feature.properties.node_id;
  const { dataset, layer } = layerStore.getDBObjectsForSourceID(sourceId);
  if (nodeId && dataset && layer) {
    networkStore.toggleNodeActive(nodeId, dataset)
  }
};
</script>

<template>
  <div v-if="mapStore.clickedFeature && clickedFeatureSourceType === 'vector'" style="max-height: 40vh; overflow: auto">
    <RecursiveTable :data="clickedFeatureProperties" />


    <!-- Render for Network Nodes -->
    <!-- TODO: Eventually allow deactivating Network Edges -->
    <v-btn
      v-if="mapStore.clickedFeature.feature.properties.node_id"
      block
      variant="outlined"
      @click="toggleNodeHandler"
      :text="clickedFeatureIsDeactivatedNode ? 'Reactivate Node' : 'Deactivate Node'"
    />
  </div>

  <!-- Check for raster tooltip data after, to give clicked features priority -->
  <div v-else-if="clickedFeatureSourceType === 'raster'">
    <div v-if="rasterValue === undefined">
      <span>fetching raster data...</span>
    </div>
    <div v-else class="mr-3">Value: {{ rasterValue }}</div>
  </div>
</template>

<style>
.maplibregl-popup-content {
  background-color: rgb(var(--v-theme-surface)) !important;
  border-top-color: rgb(var(--v-theme-surface)) !important;
}
.maplibregl-popup-tip {
  border-top-color: rgb(var(--v-theme-surface)) !important;
}
.maplibregl-popup-close-button {
  font-size: 24px;
  margin-right: 5px;
}
</style>

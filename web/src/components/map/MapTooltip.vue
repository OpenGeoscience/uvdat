<script setup lang="ts">
import { computed, watch } from "vue";
import {
  clickedFeature,
  selectedLayers,
  rasterTooltipDataCache,
  availableNetworks,
} from "@/store";
import { getMap, getTooltip } from "@/storeFunctions";
import type { SourceRegion } from "@/types";
import * as turf from "@turf/turf";
import proj4 from "proj4";

import RecursiveTable from "../sidebars/RecursiveTable.vue";
import { getDBObjectsForSourceID } from "@/layers";
import { toggleNodeActive } from "@/networks";

const clickedFeatureProperties = computed(() => {
  if (clickedFeature.value === undefined) {
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
    Object.entries(clickedFeature.value.feature.properties).filter(
      ([k, v]: [string, unknown]) => k && !unwantedKeys.has(k) && v
    )
  );
});

const clickedFeatureSourceType = computed(() => {
  if (clickedFeature.value) {
    const feature = clickedFeature.value.feature;
    if (feature.source.includes('.vector')) return 'vector'
    if (feature.source.includes('.bounds')) return 'raster'
  }
})

const rasterValue = computed(() => {
  if (clickedFeature.value && clickedFeatureSourceType.value === 'raster') {
    const feature = clickedFeature.value.feature;
    const { raster } = getDBObjectsForSourceID(feature.source);
    if (raster?.id) {
      const data = rasterTooltipDataCache.value[raster.id]?.data;
      if (data) {
        const {lng, lat} = clickedFeature.value.pos;
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

const clickedRegion = computed(() => {
  const props = clickedFeature.value?.feature?.properties;
  const regionId = props?.region_id;
  const regionName = props?.region_name;
  const regionDatasetId = props?.dataset_id;
  if (regionId) {
    const sourceRegion: SourceRegion = {
      id: regionId,
      name: regionName,
      dataset_id: regionDatasetId,
    };
    return sourceRegion;
  }
  return undefined;
});

function zoomToRegion() {
  if (clickedFeature.value === undefined) {
    return;
  }

  // Set map zoom to match bounding box of region
  const map = getMap();
  const bbox = turf.bbox(clickedFeature.value.feature.geometry);
  if (bbox.length !== 4) {
    throw new Error("Returned bbox should have 4 elements!");
  }

  map.fitBounds(bbox);
}

// Check if the layer associated with the clicked feature is still selected and visible
watch(selectedLayers, () => {
  if (clickedFeature.value === undefined) {
    return;
  }
  const feature = clickedFeature.value.feature;
  const sourceId = feature.source;
  const { layer } = getDBObjectsForSourceID(sourceId);
  if (!layer?.visible) clickedFeature.value = undefined;
});

// Handle clicked features and raster tooltip behavior.
// Feature clicks are given tooltip priority.
watch(
  clickedFeature,
  () => {
    const tooltip = getTooltip();
    if (clickedFeature.value === undefined) {
      tooltip.remove();
      return;
    }
    // Set tooltip position. Give feature clicks priority
    tooltip.setLngLat(clickedFeature.value.pos);
    // This makes the tooltip visible
    tooltip.addTo(getMap());
  }
);

const clickedFeatureIsDeactivatedNode = computed(
  () =>
    clickedFeature.value &&
    availableNetworks.value.find((network) => {
      return network.deactivated?.nodes.includes(
        clickedFeature.value?.feature.properties.node_id
      )
    })
);

function toggleNodeHandler() {
  if (clickedFeature.value === undefined) {
    throw new Error("Clicked node is undefined!");
  }
  const feature = clickedFeature.value.feature;
  const sourceId = feature.source;
  const nodeId = clickedFeature.value.feature.properties.node_id;
  const { dataset, layer } = getDBObjectsForSourceID(sourceId);
  if (nodeId && dataset && layer) {
    toggleNodeActive(nodeId, dataset)
  }
};
</script>

<template>
  <div v-if="clickedFeature && clickedFeatureSourceType === 'vector'">
    <RecursiveTable :data="clickedFeatureProperties" />

    <!-- Render for Source Regions -->
    <v-btn
      v-if="clickedRegion"
      block
      variant="outlined"
      prepend-icon="mdi-vector-square"
      @click="zoomToRegion"
      text="Zoom To Region"
    />

    <!-- Render for Network Nodes -->
    <!-- TODO: Eventually allow deactivating Network Edges -->
    <v-btn
      v-else-if="clickedFeature.feature.properties.node_id"
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

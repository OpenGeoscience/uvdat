<script setup lang="ts">
import { computed, watch } from "vue";
import {
  deactivatedNodes,
  clickedFeature,
  rasterTooltipEnabled,
  rasterTooltipValue,
  selectedLayers,
} from "@/store";
import { getMap, getTooltip } from "@/storeFunctions";
import type { SourceRegion } from "@/types";
import * as turf from "@turf/turf";

import RecursiveTable from "../RecursiveTable.vue";
import { getDBObjectsForSourceID } from "@/layers";
import { toggleNodeActive } from "@/utils";

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
  [clickedFeature, rasterTooltipValue],
  ([featureData, rasterTooltipData]) => {
    const tooltip = getTooltip();
    if (featureData === undefined && rasterTooltipData === undefined) {
      tooltip.remove();
      return;
    }

    // Set tooltip position. Give feature clicks priority
    if (featureData !== undefined) {
      tooltip.setLngLat(featureData.pos);
    } else if (rasterTooltipData !== undefined) {
      tooltip.setLngLat(rasterTooltipData.pos);
    }

    // This makes the tooltip visible
    tooltip.addTo(getMap());
  }
);

const clickedFeatureIsDeactivatedNode = computed(
  () =>
    clickedFeature.value &&
    deactivatedNodes.value.includes(
      clickedFeature.value.feature.properties.node_id
    )
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
  <div v-if="clickedFeature">
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
  <div v-else-if="rasterTooltipEnabled && rasterTooltipValue">
    <div v-if="rasterTooltipValue.text === ''">waiting for data...</div>
    <div v-else>
      <span>{{ rasterTooltipValue.text }}</span>
    </div>
  </div>
</template>

<style>
.maplibregl-popup-content, .maplibregl-popup-tip {
  background-color: rgb(var(--v-theme-surface)) !important;
  border-top-color: rgb(var(--v-theme-surface)) !important;
}
.maplibregl-popup-close-button {
  font-size: 24px;
  margin-right: 5px;
}
</style>

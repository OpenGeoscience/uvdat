<script lang="ts">
import { computed, watch } from "vue";
import {
  clickedDatasetLayer,
  deactivatedNodes,
  clickedFeature,
  selectedSourceRegions,
  rasterTooltipEnabled,
  rasterTooltipValue,
  selectedDatasetLayers,
  availableDatasets,
} from "@/store";
import { getMap, getTooltip } from "@/storeFunctions";
import { toggleNodeActive } from "@/utils";
import type { SourceRegion, UserLayer, VectorDatasetLayer } from "@/types";
import * as turf from "@turf/turf";

export default {
  setup() {
    // const dataObjectForClickedDatasetLayer = computed(() => {
    //   if (!clickedDatasetLayer.value) return undefined;
    //   return getDataObjectForDatasetLayer(clickedDatasetLayer.value) as DerivedRegion;
    // });
    const dataObjectForClickedDatasetLayer = computed(() => {
      return {};
    });

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
        throw new Error('Returned bbox should have 4 elements!');
      }

      map.fitBounds(bbox);
    }

    // Check if the layer associated with the clicked feature is still selected
    watch(selectedDatasetLayers, (selectedLayers) => {
      if (clickedFeature.value === undefined) {
        return;
      }

      const layer = clickedFeature.value.feature.layer as UserLayer;
      const match = selectedLayers.find((dsLayer) => dsLayer.id === layer.metadata.id && dsLayer.type === layer.metadata.type);
      if (match === undefined) {
        clickedFeature.value = undefined;
      }
    });

    // Handle clicked features and raster tooltip behavior.
    // Feature clicks are given tooltip priority.
    watch([clickedFeature, rasterTooltipValue], ([featureData, rasterTooltipData]) => {
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
      tooltip.addTo(getMap())
    });

    const clickedFeatureIsDeactivatedNode = computed(() => (
      clickedFeature.value
      && deactivatedNodes.value.includes(clickedFeature.value.feature.properties.node_id)
    ));

    function toggleNodeHandler() {
      if (clickedFeature.value === undefined) {
        throw new Error('Clicked node is undefined!');
      }

      const dataset = availableDatasets.value?.find(
        (d) => d.id === clickedDatasetLayer.value?.dataset_id
      );
      if (dataset) {
        dataset.current_layer_index =
          dataset?.map_layers?.find(({ id }) => id === clickedDatasetLayer.value?.id)?.index || 0;
      }

      toggleNodeActive(
        clickedFeature.value.feature.properties.node_id,
        dataset!,
        clickedDatasetLayer.value as VectorDatasetLayer,
      );
    }

    return {
      dataObjectForClickedDatasetLayer,
      clickedDatasetLayer,
      clickedFeature,
      clickedFeatureProperties,
      clickedRegion,
      selectedSourceRegions,
      deactivatedNodes,
      toggleNodeHandler,
      zoomToRegion,
      rasterTooltipEnabled,
      rasterTooltipValue,
      selectedDatasetLayers,
      clickedFeatureIsDeactivatedNode,
    };
  },
};
</script>

<template>
  <div v-if="clickedFeature">
    <!-- Render for Source Regions -->
    <div v-if="clickedRegion">
      <v-row no-gutters>ID: {{ clickedRegion.id }}</v-row>
      <v-row no-gutters>Name: {{ clickedRegion.name }}</v-row>
      <v-row no-gutters>
        <v-btn class="my-1" variant="outlined" prepend-icon="mdi-vector-square" @click="zoomToRegion">
          Zoom To Region
        </v-btn>
      </v-row>
    </div>
    <!-- Render for Network Nodes -->
    <!-- TODO: Eventually allow deactivating Network Edges -->
    <div v-else-if="clickedFeature.feature.properties.node_id">
      <v-row no-gutters v-for="(v, k) in clickedFeatureProperties" :key="k">
        {{ k }}: {{ v }}
      </v-row>
      <v-btn variant="outlined" @click="toggleNodeHandler">
        <template v-if="clickedFeatureIsDeactivatedNode">
          Reactivate Node
        </template>
        <template v-else>
          Deactivate Node
        </template>
      </v-btn>
    </div>
    <!-- Render for all other features -->
    <div v-else>
      <v-row no-gutters v-for="(v, k) in clickedFeatureProperties" :key="k">
        {{ k }}: {{ v }}
      </v-row>
    </div>
  </div>

  <!-- Check for raster tooltip data after, to give clicked features priority -->
  <div v-else-if="rasterTooltipEnabled && rasterTooltipValue">
    <div v-if="rasterTooltipValue.text === ''">
      waiting for data...
    </div>
    <div v-else>
      <span>{{ rasterTooltipValue.text }}</span>
    </div>
  </div>
</template>
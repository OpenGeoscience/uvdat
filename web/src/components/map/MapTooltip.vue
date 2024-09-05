<script lang="ts">
import { computed } from "vue";
import {
  clickedDatasetLayer,
  deactivatedNodes,
  clickedFeature,
  selectedSourceRegions,
} from "@/store";
import { getMap } from "@/storeFunctions";
import { toggleNodeActive } from "@/utils";
import type { SourceRegion } from "@/types";
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
        Object.entries(clickedFeature.value.properties).filter(
          ([k, v]: [string, unknown]) => k && !unwantedKeys.has(k) && v
        )
      );
    });

    const clickedRegion = computed(() => {
      const props = clickedFeature.value?.properties;
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
      const bbox = turf.bbox(clickedFeature.value.geometry);
      if (bbox.length !== 4) {
        throw new Error('Returned bbox should have 4 elements!');
      }

      map.fitBounds(bbox);
    }

    return {
      dataObjectForClickedDatasetLayer,
      clickedDatasetLayer,
      clickedFeature,
      clickedFeatureProperties,
      clickedRegion,
      selectedSourceRegions,
      deactivatedNodes,
      toggleNodeActive,
      zoomToRegion,
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
      <v-row>
        <v-btn class="my-1" variant="outlined" block prepend-icon="mdi-vector-square" @click="zoomToRegion">
          Zoom To Region
        </v-btn>
      </v-row>
    </div>
    <!-- Render for Network Nodes -->
    <!-- TODO: Eventually allow deactivating Network Edges -->
    <div v-else-if="clickedFeature.properties.node_id" class="pa-2">
      <v-row no-gutters v-for="(v, k) in clickedFeatureProperties" :key="k">
        {{ k }}: {{ v }}
      </v-row>
      <!-- <v-btn variant="outlined" v-if="deactivatedNodes.includes(clickedFeature.getProperties().node_id)" @click="
        toggleNodeActive(
          clickedFeature.getProperties().node_id,
          dataObjectForClickedDatasetLayer,
          clickedDatasetLayer
        )
        ">
        Reactivate Node
      </v-btn>
      <v-btn variant="outlined" @click="
        toggleNodeActive(
          clickedFeature.getProperties().node_id,
          dataObjectForClickedDatasetLayer,
          clickedDatasetLayer
        )
        " v-else>
        Deactivate Node
      </v-btn> -->
    </div>
    <!-- Render for all other features -->
    <div v-else>
      <v-row no-gutters v-for="(v, k) in clickedFeatureProperties" :key="k">
        {{ k }}: {{ v }}
      </v-row>
    </div>
  </div>
</template>
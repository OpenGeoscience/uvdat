<script lang="ts">
import { computed, watch } from "vue";
import {
  clickedMapLayer,
  deactivatedNodes,
  regionGroupingActive,
  regionGroupingType,
  clickedFeature,
  selectedSourceRegions,
  selectedMapLayers,
  selectedDatasets,
} from "@/store";
import { getMap, cancelRegionGrouping } from "@/storeFunctions";
import { toggleNodeActive } from "@/utils";
import type { DerivedRegion, SourceRegion } from "@/types";
import { SimpleGeometry } from "ol/geom";
import { getDataObjectForMapLayer } from "@/layers";

export default {
  setup() {
    const dataObjectForClickedMapLayer = computed(() => {
      if (!clickedMapLayer.value) return undefined;
      return getDataObjectForMapLayer(clickedMapLayer.value) as DerivedRegion;
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
        Object.entries(clickedFeature.value.getProperties()).filter(
          ([k, v]: [string, unknown]) => k && !unwantedKeys.has(k) && v
        )
      );
    });

    const clickedRegion = computed(() => {
      const props = clickedFeature.value?.getProperties();
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

    const clickedRegionIsGrouped = computed(() => {
      if (clickedRegion.value === undefined) {
        return false;
      }

      return (
        selectedSourceRegions.value.find(
          (region) => region.id === clickedRegion.value?.id
        ) !== undefined
      );
    });

    function zoomToRegion() {
      const geom = clickedFeature.value?.getGeometry() as SimpleGeometry;
      if (geom === undefined) {
        return;
      }
      // Set map zoom to match bounding box of region
      const map = getMap();
      map.getView().fit(geom, {
        size: map.getSize(),
        duration: 300,
      });
    }

    function beginRegionGrouping(groupingType: "intersection" | "union") {
      if (clickedRegion.value === undefined) {
        throw new Error("Began region grouping with no selected region");
      }

      regionGroupingActive.value = true;
      regionGroupingType.value = groupingType;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      selectedSourceRegions.value = [clickedRegion.value];
    }

    // TODO
    // Ensure that if any regions of the currently selected datasets are
    // de-selected, their regions are removed from the selection
    watch(selectedMapLayers, () => {
      // Filter out any regions from un-selected data sources
      selectedSourceRegions.value = selectedSourceRegions.value.filter(
        (region) =>
          region.dataset_id &&
          selectedDatasets.value.map((d) => d.id).includes(region.dataset_id)
      );
      // Check if the list is now empty
      if (selectedSourceRegions.value.length === 0) {
        cancelRegionGrouping();
      }
    });

    function removeRegionFromGrouping() {
      if (clickedRegion.value?.id === undefined) {
        throw new Error("Tried to remove non-existent region from grouping");
      }

      selectedSourceRegions.value = selectedSourceRegions.value.filter(
        (region) => region.id !== clickedRegion.value?.id
      );

      // Check if that element was the last removed
      if (selectedSourceRegions.value.length === 0) {
        cancelRegionGrouping();
      }
    }

    return {
      dataObjectForClickedMapLayer,
      clickedMapLayer,
      regionGroupingActive,
      clickedFeature,
      clickedFeatureProperties,
      clickedRegion,
      selectedSourceRegions,
      clickedRegionIsGrouped,
      regionGroupingType,
      deactivatedNodes,
      toggleNodeActive,
      zoomToRegion,
      removeRegionFromGrouping,
      beginRegionGrouping,
    };
  },
};
</script>

<template>
  <div v-if="dataObjectForClickedMapLayer && clickedFeature">
    <!-- Render for Derived Regions -->
    <div v-if="dataObjectForClickedMapLayer.source_regions">
      <v-row no-gutters>ID: {{ dataObjectForClickedMapLayer.id }} </v-row>
      <v-row no-gutters> Name: {{ dataObjectForClickedMapLayer.name }} </v-row>
      <v-row no-gutters>
        Source Region IDs: {{ dataObjectForClickedMapLayer.source_regions }}
      </v-row>
      <v-row no-gutters>
        Creation Operation: {{ dataObjectForClickedMapLayer.operation }}
      </v-row>
    </div>
    <!-- Render for Source Regions -->
    <div v-else-if="clickedRegion">
      <v-row no-gutters>ID: {{ clickedRegion.id }}</v-row>
      <v-row no-gutters>Name: {{ clickedRegion.name }}</v-row>
      <v-row>
        <v-btn
          class="my-1"
          variant="outlined"
          block
          prepend-icon="mdi-vector-square"
          @click="zoomToRegion"
          >Zoom To Region</v-btn
        >
      </v-row>

      <template v-if="regionGroupingActive && clickedRegion">
        <template v-if="clickedRegionIsGrouped">
          <v-row>
            <v-btn
              variant="outlined"
              block
              class="my-1"
              @click="removeRegionFromGrouping"
            >
              <template v-slot:prepend>
                <v-icon>
                  {{
                    regionGroupingType === "intersection"
                      ? "mdi-vector-intersection"
                      : "mdi-vector-union"
                  }}
                </v-icon>
              </template>
              Ungroup Region
            </v-btn>
          </v-row>
        </template>
        <template v-else>
          <v-row>
            <v-btn
              variant="outlined"
              block
              class="my-1"
              @click="selectedSourceRegions.push(clickedRegion)"
            >
              <template v-slot:prepend>
                <v-icon>
                  {{
                    regionGroupingType === "intersection"
                      ? "mdi-vector-intersection"
                      : "mdi-vector-union"
                  }}
                </v-icon>
              </template>
              Add region to grouping
            </v-btn>
          </v-row>
        </template>
      </template>
      <template v-else>
        <v-row>
          <v-btn
            variant="outlined"
            block
            class="my-1"
            prepend-icon="mdi-vector-intersection"
            @click="beginRegionGrouping('intersection')"
          >
            Begin region intersection
          </v-btn>
        </v-row>
        <v-row>
          <v-btn
            variant="outlined"
            block
            class="my-1"
            prepend-icon="mdi-vector-union"
            @click="beginRegionGrouping('union')"
          >
            Begin region union
          </v-btn>
        </v-row>
      </template>
    </div>
    <!-- Render for Network Nodes -->
    <!-- TODO: Eventually allow deactivating Network Edges -->
    <div v-else-if="clickedFeature.getProperties().node_id" class="pa-2">
      <v-row no-gutters v-for="(v, k) in clickedFeatureProperties" :key="k">
        {{ k }}: {{ v }}
      </v-row>
      <v-btn
        variant="outlined"
        v-if="deactivatedNodes.includes(clickedFeature.getProperties().node_id)"
        @click="
          toggleNodeActive(
            clickedFeature.getProperties().node_id,
            dataObjectForClickedMapLayer,
            clickedMapLayer
          )
        "
      >
        Reactivate Node
      </v-btn>
      <v-btn
        variant="outlined"
        @click="
          toggleNodeActive(
            clickedFeature.getProperties().node_id,
            dataObjectForClickedMapLayer,
            clickedMapLayer
          )
        "
        v-else
      >
        Deactivate Node
      </v-btn>
    </div>
    <!-- Render for all other features -->
    <div v-else>
      <v-row no-gutters v-for="(v, k) in clickedFeatureProperties" :key="k">
        {{ k }}: {{ v }}
      </v-row>
    </div>
  </div>
</template>

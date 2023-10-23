<script lang="ts">
import { computed, watch } from "vue";
import {
  getMap,
  selectedRegions,
  regionGroupingActive,
  regionGroupingType,
  deactivatedNodes,
  networkVis,
  availableMapDataSources,
  activeDataSources,
  showMapTooltip,
  selectedFeature,
  selectedDataSource,
  cancelRegionGrouping,
} from "@/store";
import { toggleNodeActive } from "@/utils";
import type { Region } from "@/types";

import { getDatasetUid } from "@/data";
import { SimpleGeometry } from "ol/geom";

export default {
  setup() {
    const selectedDatasetCategory = computed(
      () => selectedDataSource.value?.dataset?.category || ""
    );
    const selectedFeatureProperties = computed(() => {
      if (selectedFeature.value === undefined) {
        return [];
      }
      const unwantedKeys = new Set([
        "colors",
        "geometry",
        "type",
        "id",
        "node",
        "edge",
      ]);
      return Object.fromEntries(
        Object.entries(selectedFeature.value.getProperties()).filter(
          ([k, v]: [string, unknown]) => k && !unwantedKeys.has(k) && v
        )
      );
    });

    // Regions
    const selectedRegion = computed(() => {
      if (selectedDatasetCategory.value !== "region") {
        return undefined;
      }

      return selectedFeature.value?.getProperties() as Region;
    });
    const selectedRegionID = computed(() => selectedRegion.value?.id);
    const selectedRegionIsGrouped = computed(() => {
      if (selectedRegion.value === undefined) {
        return false;
      }

      const { id } = selectedRegion.value;
      return (
        selectedRegions.value.find((region) => region.id === id) !== undefined
      );
    });

    function zoomToRegion() {
      const geom = selectedFeature.value?.getGeometry() as SimpleGeometry;
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
      if (selectedRegion.value === undefined) {
        throw new Error("Began region grouping with no selected region");
      }

      regionGroupingActive.value = true;
      regionGroupingType.value = groupingType;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      selectedRegions.value = [selectedRegion.value];
    }

    function deselectFeature() {
      showMapTooltip.value = false;
      selectedFeature.value = undefined;
    }

    // Ensure that if any regions of the currently selected datasets are
    // de-selected, their regions are removed from the selection
    watch(activeDataSources, (dsMap) => {
      // If the currently selected region was part of a data source that was removed, de-select it
      if (selectedRegion.value !== undefined) {
        const selectedRegionDataSource = availableMapDataSources.value.find(
          (ds) => ds.dataset?.id === selectedRegion.value?.dataset
        );
        if (
          selectedRegionDataSource === undefined ||
          !dsMap.has(selectedRegionDataSource.uid)
        ) {
          deselectFeature();
        }
      }

      // Filter out any regions from un-selected data sources
      selectedRegions.value = selectedRegions.value.filter((region) =>
        dsMap.has(getDatasetUid(region.dataset))
      );

      // Check if the list is now empty
      if (selectedRegions.value.length === 0) {
        cancelRegionGrouping();
      }
    });

    function removeRegionFromGrouping() {
      if (selectedRegionID.value === undefined) {
        throw new Error("Tried to remove non-existent region from grouping");
      }

      selectedRegions.value = selectedRegions.value.filter(
        (region) => region.id !== selectedRegionID.value
      );

      // Check if that element was the last removed
      if (selectedRegions.value.length === 0) {
        cancelRegionGrouping();
      }
    }

    return {
      regionGroupingActive,
      selectedFeature,
      selectedFeatureProperties,
      selectedDataSource,
      selectedDatasetCategory,
      selectedRegionID,
      selectedRegion,
      selectedRegions,
      selectedRegionIsGrouped,
      regionGroupingType,
      networkVis,
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
  <!-- Render for Derived Regions -->
  <div v-if="selectedFeature && selectedDataSource?.derivedRegion">
    <v-row no-gutters>ID: {{ selectedDataSource.derivedRegion.id }}</v-row>
    <v-row no-gutters>
      Name: {{ selectedDataSource.derivedRegion.name }}
    </v-row>
    <v-row no-gutters>
      Source Region IDs:
      {{ selectedDataSource.derivedRegion.source_regions }}
    </v-row>
    <v-row no-gutters>
      Creation Operation:
      {{ selectedDataSource.derivedRegion.source_operation }}
    </v-row>
  </div>
  <!-- Render for Regions -->
  <div v-else-if="selectedFeature && selectedDatasetCategory === 'region'">
    <v-row no-gutters>ID: {{ selectedRegionID }}</v-row>
    <v-row no-gutters>Name: {{ selectedFeature.get("name") }}</v-row>
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

    <template v-if="regionGroupingActive && selectedRegion">
      <template v-if="selectedRegionIsGrouped">
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
            @click="selectedRegions.push(selectedRegion)"
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
  <!-- Render for networks -->
  <div v-else-if="selectedDataSource?.dataset?.network" class="pa-2">
    <v-row no-gutters v-for="(v, k) in selectedFeatureProperties" :key="k">
      {{ k }}: {{ v }}
    </v-row>
    <template v-if="selectedFeature && networkVis">
      <v-btn
        variant="outlined"
        v-if="deactivatedNodes.includes(selectedFeature.get('id'))"
        @click="toggleNodeActive(selectedFeature.get('id'))"
      >
        Reactivate Node
      </v-btn>
      <v-btn
        variant="outlined"
        @click="toggleNodeActive(selectedFeature.get('id'))"
        v-else
      >
        Deactivate Node
      </v-btn>
    </template>
  </div>
</template>

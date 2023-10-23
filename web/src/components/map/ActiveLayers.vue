<script setup lang="ts">
import { ref } from "vue";
import draggable from "vuedraggable";
import {
  availableDerivedRegions,
  activeMapLayerIds,
  currentContext,
  currentMapDataSource,
} from "@/store";
import { getDataSourceFromLayerId, updateVisibleLayers } from "@/layers";
import { watch } from "vue";
import { MapDataSource, MapDataSourceArgs } from "@/data";

// Layer Menu
const layerMenuActive = ref(false);
watch(activeMapLayerIds, (val, oldVal) => {
  // Open layer menu if the newly added layer is the first one added
  if (!oldVal.length && val.length) {
    layerMenuActive.value = true;
  }
});

function clearActiveLayers() {
  activeMapLayerIds.value = [];
  updateVisibleLayers();
  layerMenuActive.value = false;
}

function getLayerName(layerId: string) {
  const dataSource = getDataSourceFromLayerId(layerId);
  if (dataSource === undefined) {
    throw new Error(`Could not get data source matching layer ${layerId}`);
  }

  return dataSource.name;
}

function setCurrentMapDataSource(layerId: string) {
  const dataSource = getDataSourceFromLayerId(layerId);
  if (dataSource === undefined) {
    throw new Error(`Could not get data source matching layer ${layerId}`);
  }

  // Add dataset if applicable
  const args: MapDataSourceArgs = {};
  const datasetId = dataSource.dataset?.id;
  if (datasetId !== undefined) {
    const dataset = currentContext.value?.datasets.find(
      (d) => d.id === datasetId
    );
    if (dataset === undefined) {
      throw new Error("Dataset not found!");
    }

    args.dataset = dataset;
  }

  // Add region if applicable
  const regionId = dataSource.derivedRegion?.id;
  if (regionId !== undefined) {
    const region = availableDerivedRegions.value.find((r) => r.id === regionId);
    if (region === undefined) {
      throw new Error("Region not found!");
    }
    args.derivedRegion = region;
  }

  currentMapDataSource.value = new MapDataSource(args);
}
</script>

<template>
  <v-menu
    v-model="layerMenuActive"
    persistent
    attach
    no-click-animation
    :close-on-content-click="false"
    location="bottom"
    class="mx-2"
  >
    <template v-slot:activator="{ props }">
      <v-btn icon v-bind="props" class="mx-2">
        <v-icon>mdi-layers</v-icon>
      </v-btn>
    </template>
    <v-card rounded="lg" class="mt-2">
      <v-card-title style="min-width: 250px">
        Active Layers
        <v-tooltip
          v-if="activeMapLayerIds.length"
          text="Remove All Layers"
          location="bottom"
        >
          <template v-slot:activator="{ props }">
            <v-icon
              v-bind="props"
              @click="clearActiveLayers"
              style="float: right"
              >mdi-playlist-remove</v-icon
            >
          </template>
        </v-tooltip>
      </v-card-title>
      <div v-if="!activeMapLayerIds.length" class="pa-4">No layers active.</div>
      <draggable v-model="activeMapLayerIds" @change="updateVisibleLayers">
        <template #item="{ element }">
          <v-card class="px-3 py-1">
            <v-tooltip
              v-if="activeMapLayerIds.length"
              text="Reorder Layers"
              location="bottom"
            >
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" @click="clearActiveLayers"
                  >mdi-drag-horizontal-variant</v-icon
                >
              </template>
            </v-tooltip>

            {{ getLayerName(element) }}

            <v-tooltip
              v-if="activeMapLayerIds.length"
              text="Open Layer Options"
              location="bottom"
            >
              <template v-slot:activator="{ props }">
                <v-icon
                  v-bind="props"
                  size="small"
                  class="expand-icon ml-2"
                  @click="setCurrentMapDataSource(element)"
                >
                  mdi-cog
                </v-icon>
              </template>
            </v-tooltip>
          </v-card>
        </template>
      </draggable>
    </v-card>
  </v-menu>
</template>

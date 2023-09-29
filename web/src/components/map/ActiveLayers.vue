<script setup lang="ts">
import { ref } from "vue";
import draggable from "vuedraggable";
import {
  availableDerivedRegions,
  activeMapLayerIds,
  currentCity,
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
    const dataset = currentCity.value?.datasets.find((d) => d.id === datasetId);
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
    no-click-animation
    :close-on-content-click="false"
    location="bottom"
  >
    <template v-slot:activator="{ props }">
      <v-btn icon v-bind="props">
        <v-icon>mdi-layers</v-icon>
      </v-btn>
    </template>
    <v-card rounded="lg" class="mt-2">
      <v-card-title>
        Active Layers
        <v-icon @click="clearActiveLayers">mdi-playlist-remove</v-icon>
      </v-card-title>
      <draggable
        v-model="activeMapLayerIds"
        @change="updateVisibleLayers"
        :item-key="(e: string) => e"
      >
        <template #item="{ element }">
          <v-card class="px-3 py-1">
            <v-icon>mdi-drag-horizontal-variant</v-icon>

            {{ getLayerName(element) }}

            <v-icon
              size="small"
              class="expand-icon ml-2"
              @click="setCurrentMapDataSource(element)"
            >
              mdi-cog
            </v-icon>
          </v-card>
        </template>
      </draggable>
    </v-card>
  </v-menu>
</template>

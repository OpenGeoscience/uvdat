<script lang="ts">
import { ref, watch } from "vue";
import draggable from "vuedraggable";
import { currentDataset, selectedDatasetLayers } from "@/store";
import {
  updateVisibleMapLayers,
  clearMapLayers,
  findExistingMapLayers,
} from "@/layers";
import { RasterDatasetLayer, VectorDatasetLayer, Dataset } from "@/types";
import { getDataObjectForDatasetLayer } from "@/layers";
import { getMap } from "@/storeFunctions";

export default {
  components: {
    draggable,
  },
  setup() {
    const layerMenuActive = ref(false);

    function labelForLayer(
      datasetLayer: VectorDatasetLayer | RasterDatasetLayer
    ) {
      const dataObject: Dataset | undefined =
        getDataObjectForDatasetLayer(datasetLayer);
      if (dataObject) {
        let ret = dataObject.name;
        if (dataObject.map_layers && dataObject.map_layers.length > 1) {
          ret += ` (Layer ${datasetLayer.index})`;
        }
        return ret;
      }
      return "Unnamed Layer";
    }

    async function setCurrentDataset(
      layer: VectorDatasetLayer | RasterDatasetLayer
    ) {
      currentDataset.value = getDataObjectForDatasetLayer(layer) as Dataset;
    }

    function reorderDatasetLayers() {
      const map = getMap();

      /**
       * Traverse dataset layers in reverse order, since calling moveLayer with no arguments
       * appends it to the end of the list, and in this context, we want the first element
       * in selectedDatasetLayers to be rendered last.
       */
      selectedDatasetLayers.value.toReversed().forEach((datasetLayer) => {
        const layers = findExistingMapLayers(datasetLayer);
        layers.forEach((layer) => {
          map.moveLayer(layer.id);
        });
      });

      updateVisibleMapLayers();
    }

    watch(selectedDatasetLayers, () => {
      layerMenuActive.value = !!selectedDatasetLayers.value.length;
    });

    return {
      layerMenuActive,
      selectedDatasetLayers,
      labelForLayer,
      clearMapLayers,
      reorderDatasetLayers,
      setCurrentDataset,
      getDataObjectForDatasetLayer,
    };
  },
};
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
          v-if="selectedDatasetLayers.length"
          text="Remove All Layers"
          location="bottom"
        >
          <template v-slot:activator="{ props }">
            <v-icon v-bind="props" @click="clearMapLayers" style="float: right"
              >mdi-playlist-remove</v-icon
            >
          </template>
        </v-tooltip>
      </v-card-title>
      <div v-if="!selectedDatasetLayers.length" class="pa-4">
        No layers active.
      </div>
      <draggable
        v-model="selectedDatasetLayers"
        @change="reorderDatasetLayers"
        item-key="id"
      >
        <template #item="{ element }">
          <v-card class="px-3 py-1">
            <v-tooltip
              v-if="selectedDatasetLayers.length"
              text="Reorder Layers"
              location="bottom"
            >
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props">mdi-drag-horizontal-variant</v-icon>
              </template>
            </v-tooltip>

            {{ labelForLayer(element) }}

            <v-tooltip
              v-if="selectedDatasetLayers.length"
              text="Open Layer Options"
              location="bottom"
            >
              <template v-slot:activator="{ props }">
                <v-icon
                  v-bind="props"
                  size="small"
                  class="expand-icon ml-2"
                  @click="setCurrentDataset(element)"
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

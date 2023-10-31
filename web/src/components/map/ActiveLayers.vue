<script lang="ts">
import { ref, watch } from "vue";
import draggable from "vuedraggable";
import { currentDataset, selectedMapLayers } from "@/store";
import { updateVisibleMapLayers, clearMapLayers } from "@/layers";
import {
  RasterMapLayer,
  VectorMapLayer,
  Dataset,
  DerivedRegion,
} from "@/types";
import { getDataObjectForMapLayer } from "@/layers";

export default {
  components: {
    draggable,
  },
  setup() {
    const layerMenuActive = ref(false);

    function labelForLayer(mapLayer: VectorMapLayer | RasterMapLayer) {
      const dataObject: Dataset | DerivedRegion | undefined =
        getDataObjectForMapLayer(mapLayer);
      if (dataObject) {
        let ret = dataObject.name;
        if (dataObject.map_layers.length > 1) {
          ret += ` (Layer ${mapLayer.index})`;
        }
        return ret;
      }
      return "Unnamed Layer";
    }

    async function setCurrentDataset(layer: VectorMapLayer | RasterMapLayer) {
      currentDataset.value = getDataObjectForMapLayer(layer) as Dataset;
    }

    function reorderMapLayers() {
      selectedMapLayers.value.forEach((mapLayer, index) => {
        mapLayer.openlayer.setZIndex(selectedMapLayers.value.length - index);
      });
      updateVisibleMapLayers();
    }

    watch(selectedMapLayers, () => {
      layerMenuActive.value = !!selectedMapLayers.value.length;
    });

    return {
      layerMenuActive,
      selectedMapLayers,
      labelForLayer,
      clearMapLayers,
      reorderMapLayers,
      setCurrentDataset,
      getDataObjectForMapLayer,
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
          v-if="selectedMapLayers.length"
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
      <div v-if="!selectedMapLayers.length" class="pa-4">No layers active.</div>
      <draggable
        v-model="selectedMapLayers"
        @change="reorderMapLayers"
        item-key="id"
      >
        <template #item="{ element }">
          <v-card class="px-3 py-1">
            <v-tooltip
              v-if="selectedMapLayers.length"
              text="Reorder Layers"
              location="bottom"
            >
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props">mdi-drag-horizontal-variant</v-icon>
              </template>
            </v-tooltip>

            {{ labelForLayer(element) }}

            <v-tooltip
              v-if="selectedMapLayers.length"
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

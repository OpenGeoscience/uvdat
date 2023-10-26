<script lang="ts">
import { ref, watch } from "vue";
import draggable from "vuedraggable";
import { selectedMapLayers, currentMapLayer } from "@/store";
import {
  updateVisibleMapLayers,
  clearMapLayers,
  getOrCreateLayerFromID,
} from "@/layers";
import { RasterMapLayer, VectorMapLayer } from "@/types";
import { getMapLayerDataObject } from "@/layers";

export default {
  components: {
    draggable,
  },
  setup() {
    const layerMenuActive = ref(false);

    async function setCurrentMapLayer(layer: VectorMapLayer | RasterMapLayer) {
      currentMapLayer.value = await getOrCreateLayerFromID(
        layer.id,
        layer.type
      );
    }

    watch(selectedMapLayers, () => {
      layerMenuActive.value = !!selectedMapLayers.value.length;
    });

    return {
      layerMenuActive,
      selectedMapLayers,
      clearMapLayers,
      updateVisibleMapLayers,
      setCurrentMapLayer,
      getMapLayerDataObject,
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
        @change="updateVisibleMapLayers"
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

            {{ getMapLayerDataObject(element)?.name }}

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
                  @click="setCurrentMapLayer(element)"
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

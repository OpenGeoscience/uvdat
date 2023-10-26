<script lang="ts">
import { ref, watch, computed } from "vue";
import { rasterColormaps, toggleNodeActive } from "../utils";
import {
  getMapLayerDataObject,
  getOrCreateLayerFromID,
  styleRasterOpenLayer,
} from "@/layers";
import { currentMapLayer, deactivatedNodes, rasterTooltip } from "../store";
import { NetworkNode } from "@/types";

export default {
  setup() {
    const opacity = ref(1);
    const colormap = ref("terrain");
    const layerRange = ref<number[]>([]);
    const colormapRange = ref<number[]>([]);

    const currentDataObject = computed(() => {
      // Can be either a Dataset or a DerivedRegion
      return getMapLayerDataObject(currentMapLayer.value);
    });

    function collapseOptionsPanel() {
      currentMapLayer.value = undefined;
    }

    async function populateRefs() {
      opacity.value = 1;
      colormap.value = "terrain";
      layerRange.value = [];
      colormapRange.value = [];
      if (currentMapLayer.value) {
        if (!currentMapLayer.value.openlayer) {
          currentMapLayer.value = await getOrCreateLayerFromID(
            currentMapLayer.value.id,
            currentMapLayer.value.type
          );
        }
        const openlayer = currentMapLayer.value?.openlayer;
        if (openlayer) {
          const layerProperties = openlayer.getProperties();
          const defaultStyle = layerProperties.default_style;

          if (defaultStyle) {
            opacity.value = openlayer.getOpacity();
            colormap.value = defaultStyle.palette || "terrain";
            layerRange.value =
              defaultStyle.data_range.map((v: number) => Math.round(v)) || [];
            colormapRange.value = layerRange.value;
          }
        }
      }
    }

    function updateLayerOpacity() {
      if (currentMapLayer.value?.openlayer === undefined) return;
      currentMapLayer.value?.openlayer.setOpacity(opacity.value);
    }

    function updateColormap() {
      if (
        currentMapLayer.value?.openlayer === undefined ||
        currentMapLayer.value.type !== "raster"
      )
        return;
      styleRasterOpenLayer(currentMapLayer.value.openlayer, {
        colormap: {
          palette: colormap.value,
          range: colormapRange.value,
        },
      });
    }

    function getNetworkNodeName(nodeId: number) {
      if (!currentDataObject.value) return "";
      return currentDataObject.value.network?.nodes?.find(
        (n: NetworkNode) => n.id === nodeId
      )?.name;
    }

    watch(currentMapLayer, populateRefs);
    watch(opacity, updateLayerOpacity);
    // Use deep watcher to catch inputs from number fields alongside sliders
    watch(colormapRange, updateColormap, { deep: true });
    watch(colormap, updateColormap);

    return {
      currentMapLayer,
      currentDataObject,
      rasterColormaps,
      opacity,
      colormap,
      layerRange,
      colormapRange,
      rasterTooltip,
      deactivatedNodes,
      collapseOptionsPanel,
      toggleNodeActive,
      getNetworkNodeName,
    };
  },
};
</script>

<template>
  <v-card class="fill-height" v-if="currentMapLayer">
    <v-icon class="close-icon" @click="collapseOptionsPanel">
      mdi-close
    </v-icon>
    <v-card-title class="medium-title">Options</v-card-title>
    <v-card-subtitle class="wrap-subtitle">
      {{ currentDataObject?.name || "Untitled" }}
    </v-card-subtitle>
    <v-divider class="mb-2" />

    <div class="pa-2">
      <v-slider
        label="Opacity"
        v-model="opacity"
        dense
        min="0"
        max="1"
        step="0.05"
      />

      <div v-if="currentMapLayer.type === 'raster'">
        <v-select
          v-model="colormap"
          dense
          :items="rasterColormaps"
          label="Color map"
        />
        <v-card-text v-if="colormapRange" class="pa-0">
          Color map range
        </v-card-text>

        <v-range-slider
          v-if="colormapRange"
          v-model="colormapRange"
          :min="layerRange[0]"
          :max="layerRange[1]"
          :step="1"
        >
          <template v-slot:prepend>
            <input
              v-model="colormapRange[0]"
              class="pa-1"
              hide-details
              dense
              type="number"
              style="width: 60px"
              :min="layerRange[0]"
              :max="layerRange[1]"
            />
          </template>
          <template v-slot:append>
            <input
              v-model="colormapRange[1]"
              class="pa-1"
              hide-details
              dense
              type="number"
              style="width: 60px"
              :min="layerRange[0]"
              :max="layerRange[1]"
            />
          </template>
        </v-range-slider>
        <v-switch
          v-model="rasterTooltip"
          :value="currentMapLayer?.id"
          label="Show value tooltip"
        />
      </div>

      <div v-if="currentDataObject && currentDataObject.network">
        <v-expansion-panels :model-value="0" variant="accordion">
          <v-expansion-panel title="Deactivated Nodes">
            <v-expansion-panel-text
              v-for="deactivated in deactivatedNodes"
              :key="deactivated"
            >
              {{ getNetworkNodeName(deactivated) }}
              <v-btn
                size="small"
                style="float: right"
                @click="
                  () =>
                    toggleNodeActive(
                      deactivated,
                      currentDataObject,
                      currentMapLayer
                    )
                "
              >
                Activate
              </v-btn>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </div>
  </v-card>
</template>

<style>
.close-icon {
  float: right;
  top: 10px;
  right: 5px;
}
.medium-title {
  font-size: medium;
}
.wrap-subtitle {
  white-space: break-spaces !important;
}
.bottom {
  text-align: center;
  position: absolute;
  bottom: 0;
  right: 0;
  width: 100%;
}
.v-btn__content {
  white-space: inherit !important;
}
</style>

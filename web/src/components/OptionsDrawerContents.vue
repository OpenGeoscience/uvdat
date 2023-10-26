<script lang="ts">
import { ref, watch, computed } from "vue";
import { rasterColormaps, toggleNodeActive } from "../utils";
import {
  getMapLayerForDataObject,
  getOrCreateLayerFromID,
  styleRasterOpenLayer,
  toggleMapLayer,
} from "@/layers";
import { currentDataset, deactivatedNodes, rasterTooltip } from "@/store";
import { NetworkNode, RasterMapLayer, VectorMapLayer } from "@/types";

export default {
  setup() {
    const currentMapLayer = ref<VectorMapLayer | RasterMapLayer | undefined>();
    const opacity = ref(1);
    const colormap = ref("terrain");
    const layerRange = ref<number[]>([]);
    const colormapRange = ref<number[]>([]);

    const currentFileItemName = computed(() => {
      return currentMapLayer.value?.file_item?.name;
    });

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

    async function updateLayerShown(layerIndex: number) {
      console.log(layerIndex);
      const targetLayerInfo = currentDataset.value?.map_layers[layerIndex];
      const targetLayer = await getOrCreateLayerFromID(
        targetLayerInfo?.id,
        targetLayerInfo?.type
      );
      toggleMapLayer(currentMapLayer.value);
      currentMapLayer.value = targetLayer;
      toggleMapLayer(currentMapLayer.value);
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
      if (!currentDataset.value) return "";
      return currentDataset.value.network?.nodes?.find(
        (n: NetworkNode) => n.id === nodeId
      )?.name;
    }

    watch(currentMapLayer, populateRefs);
    watch(opacity, updateLayerOpacity);
    // Use deep watcher to catch inputs from number fields alongside sliders
    watch(colormapRange, updateColormap, { deep: true });
    watch(colormap, updateColormap);

    watch(currentDataset, () => {
      if (currentDataset.value) {
        getMapLayerForDataObject(
          currentDataset.value,
          currentDataset.value?.current_layer_index
        ).then((mapLayer) => (currentMapLayer.value = mapLayer));
      } else {
        currentMapLayer.value = undefined;
      }
    });

    return {
      currentMapLayer,
      currentDataset,
      currentFileItemName,
      rasterColormaps,
      opacity,
      colormap,
      layerRange,
      colormapRange,
      rasterTooltip,
      deactivatedNodes,
      toggleNodeActive,
      getNetworkNodeName,
      updateLayerShown,
    };
  },
};
</script>

<template>
  <v-card class="fill-height" v-if="currentDataset">
    <v-icon class="close-icon" @click="currentDataset = undefined">
      mdi-close
    </v-icon>
    <v-card-title class="medium-title">Options</v-card-title>
    <v-card-subtitle class="wrap-subtitle">
      {{ currentDataset?.name }}
    </v-card-subtitle>
    <v-divider class="mb-2" />

    <div
      class="pa-2"
      v-if="currentDataset?.map_layers && currentDataset?.map_layers.length > 1"
    >
      <v-slider
        v-model="currentDataset.current_layer_index"
        label="Current Layer"
        dense
        min="0"
        step="1"
        :max="currentDataset?.map_layers.length - 1"
        @update:modelValue="updateLayerShown"
      />
      <v-card-subtitle class="wrap-subtitle">
        {{ currentFileItemName || "Untitled" }}
      </v-card-subtitle>
    </div>

    <div class="pa-2">
      <v-slider
        label="Opacity"
        v-model="opacity"
        dense
        min="0"
        max="1"
        step="0.05"
      />

      <div v-if="currentMapLayer?.type === 'raster'">
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

      <div v-if="currentDataset && currentDataset.network">
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
                      currentDataset,
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

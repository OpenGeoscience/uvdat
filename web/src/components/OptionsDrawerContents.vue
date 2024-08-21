<script lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { rasterColormaps, toggleNodeActive } from "../utils";
import {
  getMapLayerForDataObject,
  isMapLayerVisible,
  styleRasterOpenLayer,
  toggleMapLayer,
} from "@/layers";
import { currentDataset, deactivatedNodes, rasterTooltip } from "@/store";
import {
  NetworkNode,
  RasterMapLayer,
  VectorMapLayer,
  isVectorMapLayer,
} from "@/types";

export default {
  setup() {
    const currentMapLayerIndex = ref(0);
    const currentMapLayer = ref<VectorMapLayer | RasterMapLayer | undefined>();
    const opacity = ref(1);
    const colormap = ref("terrain");
    const layerRange = ref<number[]>([]);
    const colormapRange = ref<number[]>([]);
    const applyToAll = ref<boolean>(false);
    const zIndex = ref<number>();

    const currentLayerName = computed(() => {
      return currentMapLayer.value?.name;
    });

    function getCurrentMapLayer() {
      if (currentDataset.value) {
        getMapLayerForDataObject(
          currentDataset.value,
          currentDataset.value?.current_layer_index
        ).then((mapLayer) => {
          if (zIndex.value !== undefined) {
            mapLayer?.openlayer.setZIndex(zIndex.value);
          }
          if (!isMapLayerVisible(mapLayer)) {
            toggleMapLayer(mapLayer);
          }

          currentMapLayer.value = mapLayer as
            | VectorMapLayer
            | RasterMapLayer
            | undefined;

          populateRefs();
        });
      } else {
        currentMapLayer.value = undefined;
      }
    }

    function populateRefs() {
      if (currentMapLayer.value?.openlayer) {
        const openlayer = currentMapLayer.value.openlayer;
        zIndex.value = openlayer.getZIndex();
        if (applyToAll.value) {
          updateLayerOpacity();
          updateColormap();
        } else {
          currentMapLayerIndex.value = currentMapLayer.value.index;
          opacity.value = openlayer.getOpacity();
          const layerProperties = openlayer.getProperties();
          const defaultStyle = layerProperties.default_style;
          const { min, max, palette } = layerProperties;

          if (defaultStyle) {
            colormap.value = palette || defaultStyle.palette || "terrain";
            layerRange.value =
              defaultStyle.data_range.map((v: number) => Math.round(v)) || [];
            if (min && max) {
              colormapRange.value = [min, max];
            } else {
              colormapRange.value = layerRange.value;
            }
          }
        }
      } else {
        opacity.value = 1;
        colormap.value = "terrain";
        layerRange.value = [];
        colormapRange.value = [];
      }
    }

    function activateNode(deactivated: number) {
      if (isVectorMapLayer(currentMapLayer.value)) {
        toggleNodeActive(
          deactivated,
          currentDataset.value,
          currentMapLayer.value
        );
      }
    }

    async function updateLayerShown() {
      if (
        currentMapLayerIndex.value !== undefined &&
        currentDataset.value?.map_layers &&
        currentMapLayerIndex.value < currentDataset.value?.map_layers.length
      ) {
        // turn off layer at previous index
        toggleMapLayer(currentMapLayer.value);
        currentDataset.value.current_layer_index = currentMapLayerIndex.value;
        getCurrentMapLayer();
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
      if (!currentDataset.value) return "";
      return currentDataset.value.network?.nodes?.find(
        (n: NetworkNode) => n.id === nodeId
      )?.name;
    }

    // Use deep watcher to catch inputs from number fields alongside sliders
    watch(colormapRange, updateColormap, { deep: true });
    watch(colormap, updateColormap);
    watch(opacity, updateLayerOpacity);

    watch(currentDataset, getCurrentMapLayer);
    watch(currentMapLayerIndex, updateLayerShown);
    onMounted(getCurrentMapLayer);

    return {
      currentMapLayerIndex,
      currentMapLayer,
      currentDataset,
      currentLayerName,
      rasterColormaps,
      opacity,
      colormap,
      layerRange,
      colormapRange,
      applyToAll,
      rasterTooltip,
      deactivatedNodes,
      activateNode,
      getNetworkNodeName,
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
      v-if="
        currentMapLayer &&
        currentDataset?.map_layers &&
        currentDataset?.map_layers.length > 1
      "
    >
      <v-checkbox
        v-model="applyToAll"
        :label="`Apply style changes to all ${currentDataset.map_layers.length} layers in Dataset`"
      />

      <v-slider
        v-model="currentMapLayerIndex"
        label="Current Layer"
        :thumb-label="true"
        show-ticks="always"
        :tick-size="5"
        dense
        min="0"
        step="1"
        :max="currentDataset?.map_layers.length - 1"
      />
      <v-card-subtitle class="wrap-subtitle">
        Current layer name: {{ currentLayerName || "Untitled" }}
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
                @click="activateNode(deactivated)"
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

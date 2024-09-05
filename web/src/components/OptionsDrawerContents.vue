<script lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { rasterColormaps, toggleNodeActive } from "../utils";
import {
  findExistingMapLayers,
  getDatasetLayerForDataObject,
  isDatasetLayerVisible,
  styleRasterDatasetLayer,
  toggleDatasetLayer,
} from "@/layers";
import { currentDataset, deactivatedNodes, rasterTooltip } from "@/store";
import {
  NetworkNode,
  RasterDatasetLayer,
  VectorDatasetLayer,
  isVectorDatasetLayer,
} from "@/types";
import { getMap } from "@/storeFunctions";


function getDatasetLayerOpacity(layer: VectorDatasetLayer | RasterDatasetLayer) {
  const mapLayers = findExistingMapLayers(layer);
  const opacities = mapLayers.map((layer) => {
    const opacityProperty = `${layer.type}-opacity`;
    const opacity = layer.getPaintProperty(opacityProperty) as number | undefined;
    return opacity || 1.0;
  });

  // Ensure all layers have the same opacity value or error
  const consistentOpacity = opacities.every((v) => v === opacities[0]);
  if (!consistentOpacity) {
    const allLayerIds = mapLayers.map((layer) => layer.id).join(', ');
    throw new Error(`Inconsistent opacity values in map layers ${allLayerIds}`);
  }

  return opacities[0];
}

function getDatasetLayerProperties(layer: VectorDatasetLayer | RasterDatasetLayer) {
  return {
    ...layer.default_style,
    ...layer.metadata,
  } as Record<string | number, unknown>;
}


export default {
  setup() {
    const currentDatasetLayerIndex = ref(0);
    const currentDatasetLayer = ref<VectorDatasetLayer | RasterDatasetLayer | undefined>();
    const opacity = ref(1);
    const colormap = ref("terrain");
    const layerRange = ref<number[]>([]);
    const colormapRange = ref<number[]>([]);
    const applyToAll = ref<boolean>(true);

    // TODO: Determine what to use this for
    const zIndex = ref<number>();

    const currentLayerName = computed(() => {
      return currentDatasetLayer.value?.name;
    });

    function updateCurrentDatasetLayer() {
      if (currentDataset.value?.map_layers === undefined) {
        currentDatasetLayer.value = undefined;
        return;
      }

      if (currentDataset.value.current_layer_index === undefined) {
        throw new Error('Dataset layer index not set!');
      }

      const layer = currentDataset.value.map_layers[currentDataset.value.current_layer_index];
      if (!isDatasetLayerVisible(layer)) {
        toggleDatasetLayer(layer);
      }
      currentDatasetLayer.value = layer;

      // Ensure refs are set after layer change
      populateRefs();
    }

    function populateRefs() {
      if (!currentDatasetLayer.value) {
        opacity.value = 1;
        colormap.value = "terrain";
        layerRange.value = [];
        colormapRange.value = [];

        return;
      }

      // TODO: apply to all
      if (applyToAll.value) {
        updateLayerOpacity();
        updateColormap();
        return;
      }

      currentDatasetLayerIndex.value = currentDatasetLayer.value.index;
      opacity.value = getDatasetLayerOpacity(currentDatasetLayer.value);

      // Raster specific
      const layerProperties = getDatasetLayerProperties(currentDatasetLayer.value);
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

    function activateNode(deactivated: number) {
      if (isVectorDatasetLayer(currentDatasetLayer.value)) {
        toggleNodeActive(
          deactivated,
          currentDataset.value,
          currentDatasetLayer.value
        );
      }
    }

    async function updateLayerShown() {
      if (
        currentDatasetLayerIndex.value !== undefined &&
        currentDataset.value?.map_layers &&
        currentDatasetLayerIndex.value < currentDataset.value?.map_layers.length
      ) {
        // turn off layer at previous index
        toggleDatasetLayer(currentDatasetLayer.value);
        currentDataset.value.current_layer_index = currentDatasetLayerIndex.value;
        updateCurrentDatasetLayer();
      }
    }

    function updateLayerOpacity() {
      if (currentDatasetLayer.value === undefined) {
        return;
      }

      const map = getMap();
      const layers = findExistingMapLayers(currentDatasetLayer.value);
      layers.forEach((layer) => {
        // The opacity paint property depends on the layer type
        const opacityProperty = `${layer.type}-opacity`;

        // Use map.setPaintProperty instead of layer.setPaintProperty to ensure it redraws properly
        map.setPaintProperty(layer.id, opacityProperty, opacity.value);
      });
    }

    function updateColormap() {
      if (currentDatasetLayer.value?.type !== "raster") {
        return;
      }

      styleRasterDatasetLayer(currentDatasetLayer.value, {
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

    watch(currentDataset, updateCurrentDatasetLayer);
    watch(currentDatasetLayerIndex, updateLayerShown);
    onMounted(updateCurrentDatasetLayer);

    return {
      currentDatasetLayerIndex,
      currentDatasetLayer,
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

    <div class="pa-2" v-if="
      currentDatasetLayer &&
      currentDataset?.map_layers &&
      currentDataset?.map_layers.length > 1
    ">
      <v-checkbox v-model="applyToAll"
        :label="`Apply style changes to all ${currentDataset.map_layers.length} layers in Dataset`" />

      <v-slider v-model="currentDatasetLayerIndex" label="Current Layer" :thumb-label="true" show-ticks="always"
        :tick-size="5" dense min="0" step="1" :max="currentDataset?.map_layers.length - 1" />
      <v-card-subtitle class="wrap-subtitle">
        Current layer name: {{ currentLayerName || "Untitled" }}
      </v-card-subtitle>
    </div>

    <div class="pa-2">
      <v-slider label="Opacity" v-model="opacity" dense min="0" max="1" step="0.05" />

      <div v-if="currentDatasetLayer?.type === 'raster'">
        <v-select v-model="colormap" dense :items="rasterColormaps" label="Color map" />
        <v-card-text v-if="colormapRange" class="pa-0">
          Color map range
        </v-card-text>

        <v-range-slider v-if="colormapRange" v-model="colormapRange" :min="layerRange[0]" :max="layerRange[1]"
          :step="1">
          <template v-slot:prepend>
            <input v-model="colormapRange[0]" class="pa-1" hide-details dense type="number" style="width: 60px"
              :min="layerRange[0]" :max="layerRange[1]" />
          </template>
          <template v-slot:append>
            <input v-model="colormapRange[1]" class="pa-1" hide-details dense type="number" style="width: 60px"
              :min="layerRange[0]" :max="layerRange[1]" />
          </template>
        </v-range-slider>
        <v-switch v-model="rasterTooltip" :value="currentDatasetLayer?.id" label="Show value tooltip" />
      </div>

      <div v-if="currentDataset && currentDataset.network">
        <v-expansion-panels :model-value="0" variant="accordion">
          <v-expansion-panel title="Deactivated Nodes">
            <v-expansion-panel-text v-for="deactivated in deactivatedNodes" :key="deactivated">
              {{ getNetworkNodeName(deactivated) }}
              <v-btn size="small" style="float: right" @click="activateNode(deactivated)">
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
<script>
import { currentDataset, map } from "@/store";
import { onMounted, ref, watch } from "vue";
import { rasterColormaps, addDatasetLayerToMap } from "../utils";

export default {
  setup() {
    const opacity = ref(1);
    const colormap = ref("plasma");
    const datasetRange = ref(undefined);
    const colormapRange = ref(undefined);

    function collapseOptionsPanel() {
      currentDataset.value = undefined;
    }

    function populateRefs() {
      opacity.value = currentDataset.value?.style?.opacity || 1;
      colormap.value = currentDataset.value?.style?.colormap || "plasma";
      datasetRange.value =
        currentDataset.value?.style?.data_range?.map((v) => Math.round(v)) ||
        undefined;
      colormapRange.value = datasetRange.value;
    }

    function updateLayerOpacity() {
      if (currentDataset.value) {
        map.value
          .getLayers()
          .getArray()
          .forEach((layer) => {
            const layerDatasetId = layer.getProperties().datasetId;
            if (layerDatasetId === currentDataset.value.id) {
              layer.setOpacity(opacity.value);
            }
          });
      }
    }

    function updateCurrentDatasetLayer() {
      if (currentDataset.value) {
        let zIndex = 0;
        currentDataset.value.style.opacity = opacity.value;
        currentDataset.value.style.colormap = colormap.value;
        currentDataset.value.style.colormap_range = colormapRange.value;
        map.value
          .getLayers()
          .getArray()
          .forEach((layer) => {
            const layerDatasetId = layer.getProperties().datasetId;
            if (layerDatasetId === currentDataset.value.id) {
              zIndex = layer.zIndex;
              map.value.removeLayer(layer);
            }
          });
        addDatasetLayerToMap(currentDataset.value, zIndex);
      }
    }

    onMounted(populateRefs);
    watch(currentDataset, populateRefs);
    watch(opacity, updateLayerOpacity);
    watch(colormap, updateCurrentDatasetLayer);
    watch(colormapRange, updateCurrentDatasetLayer);

    return {
      collapseOptionsPanel,
      currentDataset,
      rasterColormaps,
      opacity,
      colormap,
      datasetRange,
      colormapRange,
    };
  },
};
</script>

<template>
  <v-card class="fill-height" v-if="currentDataset">
    <v-icon class="collapse-icon" @click="collapseOptionsPanel">
      mdi-close
    </v-icon>
    <v-card-title class="medium-title">Options</v-card-title>
    <v-card-subtitle class="wrap-subtitle">
      {{ currentDataset.name }}
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

      <div v-if="currentDataset.raster_file">
        <v-select
          v-model="colormap"
          dense
          :items="rasterColormaps"
          label="Color map"
          @input="switchColormap"
        />
        <v-card-text v-if="colormapRange" class="pa-0">
          Color map range
        </v-card-text>

        <v-range-slider
          v-if="colormapRange"
          v-model="colormapRange"
          :min="datasetRange[0]"
          :max="datasetRange[1]"
          :step="1"
        >
          <template v-slot:prepend>
            <input
              :value="colormapRange[0]"
              class="pa-1"
              hide-details
              dense
              type="number"
              style="width: 60px"
              @change="$set(colormapRange, 0, $event)"
            />
          </template>
          <template v-slot:append>
            <input
              :value="colormapRange[1]"
              class="pa-1"
              hide-details
              dense
              type="number"
              style="width: 60px"
              @change="$set(colormapRange, 1, $event)"
            />
          </template>
        </v-range-slider>
      </div>
    </div>
  </v-card>
</template>

<style>
.collapse-icon {
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
</style>

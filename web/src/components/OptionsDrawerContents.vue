<script>
import { currentDataset, map } from "@/store";
import { ref, watch } from "vue";
import { rasterColormaps } from "../utils";

export default {
  setup() {
    const colormap = ref("plasma");

    watch(currentDataset, () => {
      colormap.value = currentDataset.value?.style?.colormap || "plasma";
    });
    watch(colormap, () => {
      console.log(colormap.value);
    });

    return {
      currentDataset,
      rasterColormaps,
      colormap,
    };
  },
};
</script>

<template>
  <v-card class="fill-height">
    <v-card-title class="medium-title">Options</v-card-title>
    <v-card-subtitle class="wrap-subtitle">
      {{ currentDataset.name }}
    </v-card-subtitle>
    <v-divider class="mb-2" />

    <div v-if="currentDataset.raster_file">
      <v-select
        v-model="colormap"
        :items="rasterColormaps"
        label="Color map"
        @input="switchColormap"
      />
    </div>
  </v-card>
</template>

<style>
.medium-title {
  font-size: medium;
}
.wrap-subtitle {
  white-space: break-spaces;
}
</style>

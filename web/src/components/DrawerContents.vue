<script>
import VectorTileLayer from "ol/layer/VectorTile.js";
import { currentCity, map } from "@/store";
import { getDatasetJSON } from "@/api/rest";
import { ref } from "vue";
import { createVectorSourceFromGeoJSON } from "@/utils.js";

export default {
  setup() {
    const selectedDatasets = ref([]);
    const openPanel = ref(0);

    function updateActiveDatasets() {
      map.value.getTargetElement().classList.add("spinner");
      selectedDatasets.value.forEach(async (dataset) => {
        getDatasetJSON(dataset.id).then((data) => {
          map.value.addLayer(
            new VectorTileLayer({
              source: createVectorSourceFromGeoJSON(data, map.value),
            })
          );
        });
      });
    }

    return {
      selectedDatasets,
      currentCity,
      openPanel,
      updateActiveDatasets,
    };
  },
};
</script>

<template>
  <v-expansion-panels variant="accordion" v-model="openPanel">
    <v-expansion-panel title="Available Layers">
      <v-expansion-panel-text>
        <v-checkbox
          v-for="dataset in currentCity.datasets"
          v-model="selectedDatasets"
          :key="dataset.name"
          :label="dataset.name"
          :value="dataset"
          @change="updateActiveDatasets"
          density="compact"
          multiple
          hide-details
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
    <v-expansion-panel title="Active Layers">
      <v-expansion-panel-text> TODO </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

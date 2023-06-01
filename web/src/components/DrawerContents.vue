<script>
import VectorTileLayer from "ol/layer/VectorTile.js";
import { currentCity, map } from "@/store";
import { getDatasetJSON } from "@/api/rest";
import { ref } from "vue";
import { createVectorSourceFromGeoJSON, createStyle } from "@/utils.js";

export default {
  setup() {
    const selectedDatasets = ref([]);
    const openPanel = ref(0);

    function updateActiveDatasets() {
      const datasetIdsWithExistingLayers = [];
      const currentMapLayers = map.value.getLayers();
      const selectedDatasetIds = selectedDatasets.value.map(
        (dataset) => dataset.id
      );
      currentMapLayers.forEach((layer) => {
        const layerDatasetId = layer.getProperties().datasetId;
        if (layerDatasetId) {
          datasetIdsWithExistingLayers.push(layerDatasetId);
          layer.setVisible(selectedDatasetIds.includes(layerDatasetId));
        }
      });
      selectedDatasetIds.forEach(async (datasetId) => {
        if (!datasetIdsWithExistingLayers.includes(datasetId)) {
          map.value.getTargetElement().classList.add("spinner");
          getDatasetJSON(datasetId).then((data) => {
            if (data) {
              map.value.addLayer(
                new VectorTileLayer({
                  source: createVectorSourceFromGeoJSON(data, map.value),
                  style: function (feature) {
                    return createStyle({
                      type: feature.get("type"),
                      colors: feature.get("colors"),
                    });
                  },
                  properties: {
                    datasetId,
                  },
                })
              );
            }
            map.value.getTargetElement().classList.remove("spinner");
          });
        }
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

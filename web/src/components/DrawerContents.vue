<script>
import TileLayer from "ol/layer/Tile.js";
import VectorTileLayer from "ol/layer/VectorTile.js";
import XYZSource from "ol/source/XYZ.js";
import VectorTileSource from "ol/source/VectorTile.js";
import GeoJSON from "ol/format/GeoJSON.js";

import { currentCity, map } from "@/store";
import { baseURL } from "@/api/auth";
import { ref } from "vue";
import { createStyle } from "@/utils.js";

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
      selectedDatasets.value.forEach(async (dataset) => {
        if (!datasetIdsWithExistingLayers.includes(dataset.id)) {
          if (dataset.raster_file) {
            map.value.addLayer(
              new TileLayer({
                properties: {
                  datasetId: dataset.id,
                },
                source: new XYZSource({
                  url: `${baseURL}datasets/${dataset.id}/tiles/{z}/{x}/{y}.png/`,
                  projection: "EPSG:3857",
                }),
                opacity: 0.7,
              })
            );
          } else if (dataset.geodata_file) {
            map.value.addLayer(
              new VectorTileLayer({
                properties: {
                  datasetId: dataset.id,
                },
                source: new VectorTileSource({
                  format: new GeoJSON(),
                  url: `${baseURL}datasets/${dataset.id}/vector-tiles/{z}/{x}/{y}/`,
                }),
                style: function (feature) {
                  return createStyle({
                    type: feature.getGeometry().getType(),
                    colors: feature.get("colors"),
                  });
                },
              })
            );
          }
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

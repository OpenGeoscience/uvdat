<script>
import { onMounted, ref, watch } from "vue";
import { rasterColormaps, toggleNodeActive } from "../utils";
import { getUid } from "ol/util";

import {
  getMapLayerFromDataSource,
  updateVisibleLayers,
  addNetworkLayerToMap,
} from "@/layers";
import { MapDataSource, addDataSourceToMap } from "@/data";
import { convertDataset, getDatasetNetwork } from "../api/rest";
import {
  currentCity,
  currentMapDataSource,
  pollForProcessingDataset,
  map,
  networkVis,
  deactivatedNodes,
  rasterTooltip,
  activeMapLayerIds,
} from "../store";

export default {
  setup() {
    const opacity = ref(1);
    const colormap = ref("terrain");
    const datasetRange = ref(undefined);
    const colormapRange = ref(undefined);
    const showConfirmConvert = ref(false);

    function collapseOptionsPanel() {
      currentMapDataSource.value = undefined;
    }

    function populateRefs() {
      const dataset = currentMapDataSource.value?.dataset;

      opacity.value = dataset?.style?.opacity || 1;
      colormap.value = dataset?.style?.colormap || "terrain";
      datasetRange.value =
        dataset?.style?.data_range?.map((v) => Math.round(v)) || undefined;
      colormapRange.value = datasetRange.value;
    }

    function updateLayerOpacity() {
      if (currentMapDataSource.value === undefined) {
        return;
      }

      const layer = getMapLayerFromDataSource(currentMapDataSource.value);
      layer.setOpacity(opacity.value);
    }

    function updateCurrentDatasetLayer() {
      if (currentMapDataSource.value?.dataset === undefined) {
        return;
      }

      currentMapDataSource.value.dataset.style.opacity = opacity.value;
      currentMapDataSource.value.dataset.style.colormap = colormap.value;
      currentMapDataSource.value.dataset.style.colormap_range =
        colormapRange.value;

      const layer = getMapLayerFromDataSource(currentMapDataSource.value);
      const layerNetwork = layer.getProperties().network;
      if (
        !layerNetwork ||
        !networkVis.value ||
        networkVis.value?.id === layerNetwork
      ) {
        map.value.removeLayer(layer);
        addDataSourceToMap(currentMapDataSource.value);
      }
    }

    function updateColormapMin(min) {
      colormapRange.value[0] = min;
      updateCurrentDatasetLayer();
    }

    function updateColormapMax(max) {
      colormapRange.value[1] = max;
      updateCurrentDatasetLayer();
    }

    function toggleNetworkVis() {
      if (currentMapDataSource.value?.dataset === undefined) {
        return;
      }

      const { dataset } = currentMapDataSource.value;

      // TODO: Check active map layers
      const updated = updateVisibleLayers();
      if (
        !updated.shown.some(
          (l) => l.getProperties().datasetId === networkVis.value.id
        )
      ) {
        // no existing one shown, create a new network layer
        getDatasetNetwork(dataset.id).then((nodes) => {
          if (nodes.length && networkVis.value) {
            networkVis.value.nodes = nodes;
            const layer = addNetworkLayerToMap(dataset, nodes);

            // TODO: Integrate the below code into the normal flow

            // Set layer properties and add to activeMapLayerIds
            const dataSource = new MapDataSource({ dataset });
            layer.setProperties({ dataSourceId: dataSource.getUid() });

            // Put new dataset at front of list, so it shows up above any existing layers
            activeMapLayerIds.value = [
              getUid(layer),
              ...activeMapLayerIds.value,
            ];
          }
        });
      }
    }

    function runConversion() {
      if (currentMapDataSource.value?.dataset === undefined) {
        return;
      }
      showConfirmConvert.value = false;
      const { dataset } = currentMapDataSource.value;
      convertDataset(dataset.id).then((dataset) => {
        currentMapDataSource.value = new MapDataSource({ dataset });
        currentCity.value.datasets = currentCity.value.datasets.map((d) =>
          d.id === dataset.id ? dataset : d
        );
        pollForProcessingDataset(dataset.id);
      });
    }

    onMounted(populateRefs);
    watch(currentMapDataSource, populateRefs);
    watch(opacity, updateLayerOpacity);
    watch(colormap, updateCurrentDatasetLayer);
    watch(colormapRange, updateCurrentDatasetLayer);

    return {
      collapseOptionsPanel,
      currentMapDataSource,
      rasterColormaps,
      opacity,
      colormap,
      datasetRange,
      colormapRange,
      updateColormapMin,
      updateColormapMax,
      rasterTooltip,
      networkVis,
      toggleNetworkVis,
      toggleNodeActive,
      deactivatedNodes,
      showConfirmConvert,
      runConversion,
    };
  },
};
</script>

<template>
  <v-card class="fill-height" v-if="currentMapDataSource">
    <v-icon class="close-icon" @click="collapseOptionsPanel">
      mdi-close
    </v-icon>
    <v-card-title class="medium-title">Options</v-card-title>
    <v-card-subtitle class="wrap-subtitle">
      {{ currentMapDataSource.getName() }}
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

      <div v-if="currentMapDataSource.dataset?.raster_file">
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
              @change="(e) => updateColormapMin(e.target.value)"
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
              @change="(e) => updateColormapMax(e.target.value)"
            />
          </template>
        </v-range-slider>
        <v-switch
          v-model="rasterTooltip"
          :value="currentMapDataSource.dataset?.id"
          label="Show value tooltip"
        />
      </div>

      <div v-if="currentMapDataSource.dataset?.network">
        <v-switch
          v-model="networkVis"
          :value="currentMapDataSource.dataset"
          label="Show as node network"
          @change="toggleNetworkVis"
        />

        <v-expansion-panels
          v-show="networkVis"
          :model-value="0"
          variant="accordion"
        >
          <v-expansion-panel title="Deactivated Nodes">
            <v-expansion-panel-text
              v-for="deactivated in deactivatedNodes"
              v-show="networkVis.nodes.map((n) => n.id).includes(deactivated)"
              :key="deactivated"
            >
              {{ networkVis.nodes.find((n) => n.id === deactivated)?.name }}
              <v-btn
                size="small"
                style="float: right"
                @click="(e) => toggleNodeActive(deactivated)"
              >
                Activate
              </v-btn>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <div class="bottom" @click="showConfirmConvert = true">
        <v-icon>mdi-refresh</v-icon>
        Rerun conversion task
      </div>

      <v-dialog v-model="showConfirmConvert">
        <v-card>
          <v-card-title>
            Confirmation
            <v-icon class="close-icon" @click="showConfirmConvert = false">
              mdi-close
            </v-icon>
          </v-card-title>
          <v-card-text>
            Are you sure you want to rerun the conversion task? This will delete
            the current converted data and start a new conversion task. The
            conversion task will read the raw data archive, convert it, and save
            it.
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="runConversion">Convert</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
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

<script>
import { ref, watch, computed } from "vue";
import { rasterColormaps, toggleNodeActive } from "../utils";
import { getUid } from "ol/util";

import {
  getMapLayerFromDataSource,
  addNetworkLayerToMap,
  setRasterLayerStyle,
  removeLayerFromMap,
} from "@/layers";
import { MapDataSource, addDataSourceToMap } from "@/data";
import { convertDataset, getDatasetNetwork } from "../api/rest";
import {
  currentCity,
  currentMapDataSource,
  pollForProcessingDataset,
  networkVis,
  deactivatedNodes,
  rasterTooltip,
  activeMapLayerIds,
  availableMapDataSources,
} from "../store";

export default {
  setup() {
    const opacity = ref(1);
    const colormap = ref("terrain");
    const datasetRange = ref(undefined);
    const colormapRange = ref(undefined);
    const showConfirmConvert = ref(false);

    // Use deep watcher to catch inputs from number fields alongside sliders
    watch(colormapRange, updateColormap, { deep: true });
    watch(colormap, updateColormap);

    function collapseOptionsPanel() {
      currentMapDataSource.value = undefined;
    }

    function populateRefs() {
      if (currentMapDataSource.value === undefined) {
        return;
      }

      const layer = getMapLayerFromDataSource(currentMapDataSource.value);
      const dataset = currentMapDataSource.value?.dataset;

      // Set opacity to layer value, update if it hasn't been changed
      opacity.value = layer.getOpacity();
      if (opacity.value === 1 && dataset?.style?.opacity) {
        opacity.value = dataset.style.opacity;
      }

      // Update other values
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

    function updateColormap() {
      if (colormapRange.value === undefined) {
        return;
      }

      const [min, max] = colormapRange.value;
      const layer = getMapLayerFromDataSource(currentMapDataSource.value);
      setRasterLayerStyle(layer, currentMapDataSource.value.dataset, {
        min,
        max,
        palette: colormap.value,
      });
    }

    async function enableNodeNetworkVis() {
      if (currentMapDataSource.value?.dataset === undefined) {
        throw new Error("No dataset defined on current map data source!");
      }

      const { dataset } = currentMapDataSource.value;
      networkVis.value = dataset;
      deactivatedNodes.value = [];

      // Ensure that only one layer exists for this dataset at a time
      const existingLayer = getMapLayerFromDataSource(
        currentMapDataSource.value
      );
      if (existingLayer) {
        removeLayerFromMap(existingLayer);

        // Ensure it's truly removed from the map
        const layer = getMapLayerFromDataSource(currentMapDataSource.value);
        if (layer !== undefined) {
          throw new Error(
            `DataSource layer ${currentMapDataSource.value.uid} still found after removal`
          );
        }
      }

      // Create a new network layer
      const nodes = await getDatasetNetwork(dataset.id);
      if (!nodes.length) {
        throw new Error(`No nodes returned for dataset ${dataset.id}`);
      }

      // TODO: Integrate the below code into the normal flow
      // Set nodes in networkVis and add new layer to map
      networkVis.value.nodes = nodes;
      const layer = addNetworkLayerToMap(dataset, nodes);
      layer.setProperties({ dataSourceId: currentMapDataSource.value.uid });

      // Put new dataset at front of list, so it shows up above any existing layers
      activeMapLayerIds.value = [getUid(layer), ...activeMapLayerIds.value];
    }

    function disableNodeNetworkVis() {
      networkVis.value = undefined;
      deactivatedNodes.value = [];

      if (currentMapDataSource.value?.dataset === undefined) {
        throw new Error("No dataset defined on current map data source!");
      }

      // Remove existing layer
      removeLayerFromMap(getMapLayerFromDataSource(currentMapDataSource.value));

      // Add data source back normally
      addDataSourceToMap(currentMapDataSource.value);
    }

    async function toggleNetworkVis() {
      if (networkVis.value) {
        disableNodeNetworkVis();
      } else {
        enableNodeNetworkVis();
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

    const datasetIdToDataSource = computed(() => {
      const map = new Map();
      availableMapDataSources.value.forEach((ds) => {
        if (ds.dataset !== undefined) {
          map.set(ds, ds.dataset);
        }
      });

      return map;
    });

    watch(currentMapDataSource, populateRefs);
    watch(opacity, updateLayerOpacity);

    return {
      collapseOptionsPanel,
      currentMapDataSource,
      rasterColormaps,
      opacity,
      colormap,
      datasetRange,
      colormapRange,
      updateColormap,
      rasterTooltip,
      networkVis,
      toggleNetworkVis,
      toggleNodeActive,
      deactivatedNodes,
      showConfirmConvert,
      runConversion,
      datasetIdToDataSource,
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
      {{ currentMapDataSource.name }}
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
              v-model="colormapRange[0]"
              class="pa-1"
              hide-details
              dense
              type="number"
              style="width: 60px"
              :min="datasetRange[0]"
              :max="datasetRange[1]"
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
              :min="datasetRange[0]"
              :max="datasetRange[1]"
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
          :model-value="networkVis !== undefined"
          label="Show as node network"
          @change="toggleNetworkVis"
        />

        <v-expansion-panels
          v-show="networkVis"
          :model-value="0"
          variant="accordion"
        >
          <v-expansion-panel title="Deactivated Nodes" v-if="networkVis">
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

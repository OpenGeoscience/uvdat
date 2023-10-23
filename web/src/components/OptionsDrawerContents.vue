<script lang="ts">
import { ref, watch, computed } from "vue";
import { rasterColormaps, toggleNodeActive } from "../utils";

import { getMapLayer } from "@/layers";
import { MapLayer } from "@/data";
import { convertDataset } from "../api/rest";
import {
  currentContext,
  currentMapLayer,
  deactivatedNodes,
  rasterTooltip,
  availableMapLayers,
} from "../store";
import { pollForProcessingDataset } from "@/storeFunctions";

export default {
  setup() {
    const opacity = ref(1);
    const colormap = ref("terrain");
    const datasetRange = ref<number[]>([]);
    const colormapRange = ref<number[]>([]);
    const showConfirmConvert = ref(false);

    function collapseOptionsPanel() {
      currentMapLayer.value = undefined;
    }

    function populateRefs() {
      if (currentMapLayer.value === undefined) {
        return;
      }
      // TODO
      // const layer = getMapLayer(currentMapLayer.value);
      // const dataset = currentMapLayer.value?.dataset;

      // Set opacity to layer value, update if it hasn't been changed
      // opacity.value = layer.getOpacity();
      // if (opacity.value === 1 && dataset?.style?.opacity) {
      //   opacity.value = dataset.style.opacity;
      // }

      // Update other values
      // colormap.value = dataset?.style?.colormap || "terrain";
      // datasetRange.value =
      //   dataset?.style?.data_range?.map((v) => Math.round(v)) || undefined;
      // colormapRange.value = datasetRange.value;
    }

    function updateLayerOpacity() {
      if (currentMapLayer.value === undefined) {
        return;
      }

      const layer = getMapLayer(currentMapLayer.value);
      if (layer) layer.setOpacity(opacity.value);
    }

    function updateCurrentDatasetLayer() {
      if (currentMapLayer.value?.dataset === undefined) {
        return;
      }

      // TODO
      // currentMapLayer.value.dataset.style.opacity = opacity.value;
      // currentMapLayer.value.dataset.style.colormap = colormap.value;
      // currentMapLayer.value.dataset.style.colormap_range = colormapRange.value;

      // const layer = getMapLayer(currentMapLayer.value);
      // const layerNetwork = layer.getProperties().network;
      // if (
      //   !layerNetwork ||
      //   !networkVis.value ||
      //   networkVis.value?.id === layerNetwork
      // ) {
      //   getMap().removeLayer(layer);
      //   addMapLayerToMap(currentMapLayer.value);
      // }
    }

    function updateColorMapRangeValue(e: Event, key: "min" | "max") {
      if (e.target) {
        const target = e.target as HTMLInputElement;
        const value = parseInt(target.value);
        if (key === "min") {
          colormapRange.value[0] = value;
        } else if (key === "max") {
          colormapRange.value[1] = value;
        }
        updateCurrentDatasetLayer();
      }
    }

    function toggleNetworkVis() {
      if (currentMapLayer.value?.dataset === undefined) {
        return;
      }

      // TODO
      // const { dataset } = currentMapLayer.value;

      // TODO: Check active map layers
      // Check if there is a visible layer that matches the networkvis dataset id
      // const updated = updateVisibleMapLayers();
      // if (
      //   !updated.shown.some(
      //     (l) => l.getProperties().datasetId === networkVis.value.id
      //   )
      // ) {
      //   // no existing one shown, create a new network layer
      //   getDatasetNetwork(dataset.id).then((nodes) => {
      //     if (nodes.length && networkVis.value) {
      //       networkVis.value.nodes = nodes;
      //       const layer = addNetworkLayerToMap(dataset, nodes);

      //       // TODO: Integrate the below code into the normal flow

      //       // Set layer properties and add to activeMapLayerIds
      //       const mapLayer = new MapLayer({ dataset });
      //       layer.setProperties({ mapLayerId: mapLayer.uid });

      //       // Put new dataset at front of list, so it shows up above any existing layers
      //       activeMapLayerIds.value = [
      //         getUid(layer),
      //         ...activeMapLayerIds.value,
      //       ];
      //     }
      //   });
      // }
    }

    function runConversion() {
      if (currentMapLayer.value?.dataset === undefined) {
        return;
      }
      showConfirmConvert.value = false;
      const { dataset } = currentMapLayer.value;
      convertDataset(dataset.id).then((dataset) => {
        if (!currentContext.value) return;
        currentMapLayer.value = new MapLayer({ dataset });
        currentContext.value.datasets = currentContext.value.datasets.map((d) =>
          d.id === dataset.id ? dataset : d
        );
        pollForProcessingDataset(dataset.id);
      });
    }

    const datasetIdToMapLayer = computed(() => {
      const map = new Map();
      availableMapLayers.value.forEach((ds) => {
        if (ds.dataset !== undefined) {
          map.set(ds, ds.dataset);
        }
      });

      return map;
    });

    watch(currentMapLayer, populateRefs);
    watch(opacity, updateLayerOpacity);
    watch(colormap, updateCurrentDatasetLayer);
    watch(colormapRange, updateCurrentDatasetLayer);

    return {
      currentMapLayer,
      rasterColormaps,
      opacity,
      colormap,
      datasetRange,
      colormapRange,
      rasterTooltip,
      deactivatedNodes,
      showConfirmConvert,
      datasetIdToMapLayer,
      collapseOptionsPanel,
      toggleNetworkVis,
      toggleNodeActive,
      updateColorMapRangeValue,
      runConversion,
    };
  },
};
</script>

<template>
  <v-card class="fill-height" v-if="currentMapLayer">
    <v-icon class="close-icon" @click="collapseOptionsPanel">
      mdi-close
    </v-icon>
    <v-card-title class="medium-title">Options</v-card-title>
    <v-card-subtitle class="wrap-subtitle">
      {{ currentMapLayer.name }}
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

      <div v-if="currentMapLayer">
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
              @change="(e) => updateColorMapRangeValue(e, 'min')"
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
              @change="(e) => updateColorMapRangeValue(e, 'max')"
            />
          </template>
        </v-range-slider>
        <v-switch
          v-model="rasterTooltip"
          :value="currentMapLayer.dataset?.id"
          label="Show value tooltip"
        />
      </div>

      <div v-if="currentMapLayer.dataset?.network">
        <v-switch
          :value="currentMapLayer.dataset"
          label="Show as node network"
          @change="toggleNetworkVis"
        />

        <v-expansion-panels :model-value="0" variant="accordion">
          <v-expansion-panel title="Deactivated Nodes">
            <v-expansion-panel-text
              v-for="deactivated in deactivatedNodes"
              :key="deactivated"
            >
              TODO: node name
              <v-btn
                size="small"
                style="float: right"
                @click="() => toggleNodeActive(deactivated)"
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

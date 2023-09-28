<script setup lang="ts">
import Map from "ol/Map.js";
import Overlay from "ol/Overlay";
import { onMounted, ref } from "vue";
import {
  clearMap,
  map,
  getMap,
  regionGroupingActive,
  availableDataSourcesTable,
  showMapTooltip,
  selectedFeature,
  selectedDataSource,
} from "@/store";
import { displayRasterTooltip } from "@/utils";
import type { MapBrowserEvent, Feature } from "ol";
import type { Layer } from "ol/layer";
import Control from "ol/control/Control";

import MapControl from "./MapControl.vue";
import MapTooltip from "./MapTooltip.vue";

// OpenLayers variables
const tooltip = ref();
const context = ref();
let tooltipOverlay: Overlay;
let contextControl: Control;

function handleMapClick(e: MapBrowserEvent<MouseEvent>) {
  // Retrieve first clicked feature, and its layer
  let res = getMap().forEachFeatureAtPixel(e.pixel, (feature, layer) => [
    feature,
    layer,
  ]) as [Feature, Layer] | undefined;

  // If nothing clicked, reset values and return
  if (!res) {
    showMapTooltip.value = false;
    selectedFeature.value = undefined;
    return;
  }

  // Get feature and layer, exit if data source isn't provided through the layer
  const [feature, layer] = res;
  const dataSource = availableDataSourcesTable.value.get(
    layer.get("dataSourceId")
  );

  if (!dataSource) {
    return;
  }

  selectedDataSource.value = dataSource;
  selectedFeature.value = feature;

  // Show tooltip and set position
  showMapTooltip.value = true;
  tooltipOverlay.setPosition(e.coordinate);
}

function createMap() {
  const newMap = new Map({
    target: "mapContainer",
  });
  newMap.getTargetElement().classList.add("spinner");
  newMap.on("loadend", function () {
    getMap().getTargetElement().classList.remove("spinner");
  });

  // Add overlay to display contextual info
  contextControl = new Control({ element: context.value });
  contextControl.setMap(newMap);

  // Add tooltip overlay
  tooltipOverlay = new Overlay({
    element: tooltip.value,
    offset: [10, 0],
    positioning: "bottom-left",
  });
  tooltipOverlay.setMap(newMap);

  // Handle clicks and pointer moves
  newMap.on("click", handleMapClick);
  newMap.on("pointermove", (e) => {
    displayRasterTooltip(e, tooltip, tooltipOverlay);
  });

  map.value = newMap;
}

onMounted(() => {
  createMap();
  clearMap();
});
</script>

<template>
  <div id="mapContainer" class="map">
    <div ref="context" class="context-control" v-show="regionGroupingActive">
      <MapControl />
    </div>
    <div ref="tooltip" class="tooltip" v-show="showMapTooltip">
      <MapTooltip />
    </div>
  </div>
</template>

<style scoped>
@import "~ol/ol.css";
.map {
  height: 100%;
  width: 100%;
  position: relative;
}
@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}
.spinner:after {
  content: "";
  box-sizing: border-box;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin-top: -20px;
  margin-left: -20px;
  border-radius: 50%;
  border: 5px solid rgba(180, 180, 180, 0.6);
  border-top-color: rgba(0, 0, 0, 0.6);
  animation: spinner 0.6s linear infinite;
}
.tooltip {
  background-color: white;
  border-radius: 5px;
  padding: 10px 20px;
  word-break: break-word;
}

.context-control {
  float: left;
  position: relative;
  top: 2%;
  left: 3%;
}
</style>

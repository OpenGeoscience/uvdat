<script lang="ts">
import Map from "ol/Map.js";
import Overlay from "ol/Overlay";
import { onMounted, ref } from "vue";
import {
  map,
  // availableMapLayers,
  showMapTooltip,
  selectedFeature,
  clickedMapLayer,
} from "@/store";
import { getMap, clearMap } from "@/storeFunctions";
import { displayRasterTooltip } from "@/utils";
import type { MapBrowserEvent, Feature } from "ol";
import type { Layer } from "ol/layer";
import Control from "ol/control/Control";

import RegionGrouping from "./RegionGrouping.vue";
import ActiveLayers from "./ActiveLayers.vue";
import MapTooltip from "./MapTooltip.vue";

export default {
  components: {
    RegionGrouping,
    ActiveLayers,
    MapTooltip,
  },
  setup() {
    // OpenLayers refs
    const tooltip = ref();
    const regiongrouping = ref();
    const activelayers = ref();
    let tooltipOverlay: Overlay;

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
      // TODO
      console.log("get maplayer object from ", layer);
      const mapLayer = undefined;
      // const mapLayer = availableMapLayers.value.get(
      //   layer.get("mapLayerId")
      // );

      if (!mapLayer) {
        return;
      }

      clickedMapLayer.value = mapLayer;
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

      // Handle clicks and pointer moves
      newMap.on("click", handleMapClick);
      newMap.on("pointermove", (e) => {
        displayRasterTooltip(e, tooltip, tooltipOverlay);
      });

      map.value = newMap;
      createMapControls();
    }

    function createMapControls() {
      if (map.value) {
        // Add overlay to display region grouping
        map.value.addControl(new Control({ element: regiongrouping.value }));

        // Add overlay to display active layers
        map.value.addControl(new Control({ element: activelayers.value }));

        // Add tooltip overlay
        tooltipOverlay = new Overlay({
          element: tooltip.value,
          offset: [10, 0],
          positioning: "bottom-left",
        });
        tooltipOverlay.setMap(map.value);
      }
    }

    onMounted(() => {
      createMap();
      clearMap();
    });

    return {
      activelayers,
      regiongrouping,
      tooltip,
      showMapTooltip,
    };
  },
};
</script>

<template>
  <div id="mapContainer" class="map">
    <div ref="activelayers" class="active-layers-control">
      <ActiveLayers />
    </div>
    <div ref="regiongrouping" class="region-grouping-control">
      <RegionGrouping />
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

.active-layers-control {
  float: left;
  position: relative;
  top: 2%;
  left: 3%;
}
.region-grouping-control {
  float: left;
  position: absolute;
  bottom: 2%;
  left: 3%;
}
</style>

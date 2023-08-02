<script>
import Map from "ol/Map.js";
import Overlay from "ol/Overlay";
import { onMounted, ref } from "vue";
import { clearMap, map } from "@/store";
import { displayFeatureTooltip, displayRasterTooltip } from "@/utils";

export default {
  name: "OpenLayersMap",
  setup() {
    const tooltip = ref();

    function createMap() {
      map.value = new Map({
        target: "mapContainer",
      });
      map.value.on("loadstart", function () {
        setTimeout(() => {
          if (!map.value.loaded_) {
            map.value.getTargetElement().classList.add("spinner");
          }
        }, 1000);
      });
      map.value.on("loadend", function () {
        map.value.getTargetElement().classList.remove("spinner");
      });
      var overlay = new Overlay({
        element: tooltip.value,
        offset: [10, 0],
        positioning: "bottom-left",
      });
      map.value.addOverlay(overlay);
      map.value.on("click", (e) => displayFeatureTooltip(e, tooltip, overlay));
      map.value.on("pointermove", (e) =>
        displayRasterTooltip(e, tooltip, overlay)
      );
    }

    onMounted(() => {
      createMap();
      clearMap();
    });

    return {
      tooltip,
    };
  },
};
</script>

<template>
  <div id="mapContainer" class="map">
    <div ref="tooltip" class="tooltip" />
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
  max-width: 300px;
  padding: 10px 5px;
  word-break: break-word;
}
</style>

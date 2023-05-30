<script>
import Map from "ol/Map.js";
import { onMounted } from "vue";
import { map } from "@/store";

export default {
  name: "OpenLayersMap",
  setup() {
    onMounted(async () => {
      map.value = new Map({
        target: "mapContainer",
      });
      map.value.on("loadend", function () {
        map.value.getTargetElement().classList.remove("spinner");
      });
    });

    return {};
  },
};
</script>

<template>
  <div id="mapContainer" class="map" />
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
</style>

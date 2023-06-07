<script>
import Map from "ol/Map.js";
import Overlay from "ol/Overlay";
import { onMounted, ref } from "vue";
import { clearMap, map } from "@/store";

export default {
  name: "OpenLayersMap",
  setup() {
    const tooltip = ref();

    function createMap() {
      map.value = new Map({
        target: "mapContainer",
      });
      map.value.on("loadstart", function () {
        map.value.getTargetElement().classList.add("spinner");
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
      function displayTooltip(evt) {
        var pixel = evt.pixel;
        var feature = map.value.forEachFeatureAtPixel(
          pixel,
          function (feature) {
            return feature;
          }
        );
        tooltip.value.style.display = feature ? "" : "none";
        if (feature) {
          const properties = Object.fromEntries(
            Object.entries(feature.values_).filter(([k, v]) => k && v)
          );
          ["colors", "geometry", "type"].forEach(
            (prop) => delete properties[prop]
          );
          const prettyString = JSON.stringify(properties)
            .replaceAll('"', "")
            .replaceAll(",", "\n")
            .replaceAll("{", "")
            .replaceAll("}", "");
          tooltip.value.innerHTML = prettyString;
          // make sure the tooltip isn't cut off
          const mapCenter = map.value.get("view").get("center");
          const viewPortSize = map.value.get("view").viewportSize_;
          const tooltipSize = [
            tooltip.value.clientWidth,
            tooltip.value.clientHeight,
          ];
          const tooltipPosition = evt.coordinate.map((v, i) => {
            const mapEdge = mapCenter[i] + viewPortSize[i];
            if (v + tooltipSize[i] > mapEdge) {
              return mapEdge - (tooltipSize[i] * 3) / 2;
            }
            return v;
          });
          overlay.setPosition(tooltipPosition);
        }
      }
      map.value.on("click", displayTooltip);
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

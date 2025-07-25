<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { Map, Popup, AttributionControl } from "maplibre-gl";
import { onMounted, ref, watch } from "vue";
import "maplibre-gl/dist/maplibre-gl.css";

import MapTooltip from "./MapTooltip.vue";
import { oauthClient } from "@/api/auth";

import { useAppStore, useMapStore, useLayerStore } from "@/store";
const appStore = useAppStore();
const mapStore = useMapStore();
const layerStore = useLayerStore();

const ATTRIBUTION = [
  "<a target='_blank' href='https://maplibre.org/'>© MapLibre</a>",
  "<span> | </span>",
  "<a target='_blank' href='https://www.maptiler.com/copyright'>© MapTiler</a>",
  "<span> | </span>",
  "<a target='_blank' href='https://www.openstreetmap.org/copyright'>© OpenStreetMap contributors</a>",
];

const BASE_MAPS = {
  light: [
    `https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=${process.env.VUE_APP_MAPTILER_API_KEY}`,
  ],
  dark: [
    `https://api.maptiler.com/maps/basic-v2-dark/{z}/{x}/{y}.png?key=${process.env.VUE_APP_MAPTILER_API_KEY}`,
  ],
};

// MapLibre refs
const tooltip = ref<HTMLElement>();
const attributionControl = new AttributionControl({
  compact: true,
  customAttribution: ATTRIBUTION,
});
attributionControl.onAdd = (map: Map): HTMLElement => {
  attributionControl._map = map;
  const container = document.createElement("div");
  container.innerHTML = ATTRIBUTION.join("");
  attributionControl._container = container;
  setAttributionControlStyle();
  return container;
};

function setAttributionControlStyle() {
  const container = attributionControl._container;
  container.style.padding = "3px 8px";
  container.style.marginRight = "5px";
  container.style.borderRadius = "15px";
  container.style.position = "relative";
  container.style.right = appStore.openSidebars.includes("right")
    ? "360px"
    : "0px";
  container.style.background = appStore.theme === "light" ? "white" : "black";
  container.childNodes.forEach((child) => {
    const childElement = child as HTMLElement;
    childElement.style.color = appStore.theme === "light" ? "black" : "white";
  });
}

function createMap() {
  const newMap = new Map({
    container: "mapContainer",
    attributionControl: false,
    preserveDrawingBuffer: true, // allows screenshots
    // transformRequest adds auth headers to tile requests (excluding MapTiler requests)
    transformRequest: (url) => {
      let headers = {};
      if (!url.includes("maptiler")) {
        headers = oauthClient?.authHeaders;
      }
      return {
        url,
        headers,
      };
    },
    style: {
      version: 8,
      sources: {
        light: {
          type: "raster",
          tiles: BASE_MAPS.light,
          tileSize: 512,
        },
        dark: {
          type: "raster",
          tiles: BASE_MAPS.dark,
          tileSize: 512,
        },
      },
      layers: [
        {
          id: "base-tiles",
          type: "raster",
          source: appStore.theme,
          minzoom: 0,
          // 22 is the max zoom, but setting it to just that makes the map go white at full zoom
          maxzoom: 22 + 1,
        },
      ],
    },
    center: [-75.5, 43.0], // Coordinates for the center of New York State
    zoom: 7, // Initial zoom level
  });

  newMap.addControl(attributionControl);

  // Add spinner while loading
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const mapContainer = document.getElementById("mapContainer")!;
  mapContainer.classList.add("spinner");
  newMap.on("load", () => {
    mapContainer.classList.remove("spinner");
  });
  newMap.on('error', (response) => {
    // AbortErrors are raised when updating style of raster layers; ignore these
    if (response.error.message !== 'AbortError') console.error(response.error)
});

  /**
   * This is called on every click, and technically hides the tooltip on every click.
   * However, if a feature layer is clicked, that event is fired after this one, and the
   * tooltip is re-enabled and rendered with the desired contents. The net result is that
   * this only has a real effect when the base map is clicked, as that means that no other
   * feature layer can "catch" the event, and the tooltip stays hidden.
   */
  newMap.on("click", () => {mapStore.clickedFeature = undefined});

  // Order is important as the following function relies on the ref being set
  mapStore.map = newMap;
  createMapControls();
}

function createMapControls() {
  if (!mapStore.map || !tooltip.value) {
    throw new Error("Map or refs not initialized!");
  }

  // Add tooltip overlay
  const popup = new Popup({
    anchor: "bottom-left",
    closeOnClick: false,
    maxWidth: "none",
    closeButton: true,
  });

  // Link overlay ref to dom, allowing for modification elsewhere
  popup.setDOMContent(tooltip.value);

  // Set store value
  mapStore.tooltipOverlay = popup;
}

onMounted(() => {
  createMap();
  mapStore.setMapCenter(undefined, true);
});

watch(() => appStore.theme, (value) => {
  const map = mapStore.getMap();
  map.removeLayer("base-tiles");
  map.addLayer({
    id: "base-tiles",
    type: "raster",
    source: value,
    minzoom: 0,
    maxzoom: 22 + 1,
    layout: {
      visibility: mapStore.showMapBaseLayer ? "visible" : "none",
    },
  });
  setAttributionControlStyle();
  layerStore.updateLayersShown();
});

watch(() => appStore.openSidebars, () => {
  setAttributionControlStyle();
});
</script>

<template>
  <div id="mapContainer" class="map">
    <div id="map-tooltip" ref="tooltip" class="tooltip pa-0">
      <MapTooltip />
    </div>
  </div>
</template>

<style scoped>
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
  border-radius: 5px;
  padding: 10px 20px;
  word-break: break-word;
  text-wrap: wrap;
  width: fit-content;
  min-width: 50px;
  max-width: 350px;
}

.base-layer-control {
  float: right;
  position: absolute;
  top: 2%;
  right: 2%;
  z-index: 2;
}
</style>

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { Map, Popup, Source } from "maplibre-gl";
import { ClickedFeatureData, Project } from '@/types';

export const useMapStore = defineStore('map', () => {
  const map = ref<Map>();
  const mapSources = ref<Record<string, Source>>({});
  const showMapBaseLayer = ref(true);
  const tooltipOverlay = ref<Popup>();
  const clickedFeature = ref<ClickedFeatureData>();

  // Update the base layer visibility
  watch(showMapBaseLayer, () => {
    const map = getMap();
    map.getLayersOrder().forEach((id) => {
      if (id === 'base-tiles') {
        map.setLayoutProperty(
          id,
          "visibility",
          showMapBaseLayer.value ? "visible" : "none"
        );
      }
    });
  });

  function toggleBaseLayer() {
    showMapBaseLayer.value = !showMapBaseLayer.value;
  }

  function getMap() {
    if (map.value === undefined) {
      throw new Error("Map not yet initialized!");
    }
    return map.value;
  }

  function getCurrentMapPosition() {
    const map = getMap();
    const { lat, lng } = map.getCenter();
    return {
      center: [lng, lat],
      zoom: map.getZoom(),
    };
  }

  function getTooltip() {
    if (tooltipOverlay.value === undefined) {
      throw new Error("Tooltip not yet initialized!");
    }
    return tooltipOverlay.value;
  }

  function setMapCenter(
    project: Project | undefined = undefined,
    jump = false
  ) {
    let center: [number, number] = [0, 30];
    let zoom = 1;
    if (project) {
      center = project.default_map_center;
      zoom = project.default_map_zoom;
    }

    const map = getMap();
    if (jump) {
      map.jumpTo({ center, zoom });
    } else {
      map.flyTo({ center, zoom, duration: 2000 });
    }
  }

  function clearMapLayers() {
    const map = getMap();
    map.getLayersOrder().forEach((id) => {
      if (id !== 'base-tiles') {
        map.setLayoutProperty(id, "visibility", "none");
      }
    });
  }

  return {
    map,
    mapSources,
    showMapBaseLayer,
    tooltipOverlay,
    clickedFeature,
    toggleBaseLayer,
    getMap,
    getCurrentMapPosition,
    getTooltip,
    setMapCenter,
    clearMapLayers,
  }
});

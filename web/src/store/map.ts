import { defineStore } from 'pinia';
import { ref, shallowRef, watch } from 'vue';
import { Map, MapLayerMouseEvent, Popup, Source } from "maplibre-gl";
import { ClickedFeatureData, Project } from '@/types';


export const useMapStore = defineStore('map', () => {
  const map = shallowRef<Map>();
  const mapSources = ref<Record<string, Source>>({});
  const showMapBaseLayer = ref(true);
  const tooltipOverlay = ref<Popup>();
  const clickedFeature = ref<ClickedFeatureData>();

  function handleLayerClick(e: MapLayerMouseEvent) {
    const map = getMap();
    const clickedFeatures = map.queryRenderedFeatures(e.point);
    if (!clickedFeatures.length) {
        return;
    }

    // Sort features that were clicked on by their reverse layer ordering,
    // since the last element in the list (the top one) should be the first one clicked.
    const featQuery = clickedFeatures.toSorted(
        (feat1, feat2) => {
            const order = map.getLayersOrder();
            return order.indexOf(feat2.layer.id) - order.indexOf(feat1.layer.id);
        }
    );

    // Select the first feature in this ordering, since this is the one that should be clicked on
    const feature = featQuery[0];

    // Perform this check to prevent unnecessary repeated assignment
    if (feature !== clickedFeature.value?.feature) {
        clickedFeature.value = {
            feature,
            pos: e.lngLat,
        };
    }
  }

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
    // Data
    map,
    mapSources,
    showMapBaseLayer,
    tooltipOverlay,
    clickedFeature,
    // Functions
    handleLayerClick,
    toggleBaseLayer,
    getMap,
    getCurrentMapPosition,
    getTooltip,
    setMapCenter,
    clearMapLayers,
  }
});

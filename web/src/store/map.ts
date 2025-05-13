import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { Map, Popup, Source } from "maplibre-gl";
import { ClickedFeatureData, Layer, Project, Style } from '@/types';
import { getDefaultColor, setMapLayerStyle } from '@/layerStyles';
import { addFrame } from '@/layers';

export const useMapStore = defineStore('map', () => {
  const map = ref<Map>();
  const mapSources = ref<Record<string, Source>>({});
  const showMapBaseLayer = ref(true);
  const tooltipOverlay = ref<Popup>();
  const clickedFeature = ref<ClickedFeatureData>();
  const selectedLayers = ref<Layer[]>([]);
  const selectedLayerStyles = ref<Record<string, Style>>({});

  function updateLayersShown() {
    const map = getMap();

    // reverse selected layers list for first on top
    selectedLayers.value.toReversed().forEach((layer) => {
      layer.frames.forEach((frame) => {
        const styleId = `${layer.id}.${layer.copy_id}`
        const sourceId = `${styleId}.${frame.id}`
        if (!selectedLayerStyles.value[styleId]) {
          selectedLayerStyles.value[styleId] = {
            color: getDefaultColor(),
            opacity: 1,
            visible: true,
          }
        }
        const currentStyle = selectedLayerStyles.value[styleId];
        currentStyle.visible = layer.visible
        if (currentStyle.visible && !map.getLayersOrder().some(
          (mapLayerId) => mapLayerId.includes(sourceId)
        ) && layer.current_frame === frame.index) {
          addFrame(frame, sourceId);
        }
        map.getLayersOrder().forEach((mapLayerId) => {
          if (mapLayerId !== 'base-tiles') {
            if (mapLayerId.includes(sourceId)) {
              map.moveLayer(mapLayerId);  // handles reordering
              setMapLayerStyle(mapLayerId, {
                ...currentStyle,
                visible: layer.visible && layer.current_frame === frame.index
              })
            }
          }
        });
      })
    })
    // hide any removed layers
    map.getLayersOrder().forEach((mapLayerId) => {
      if (mapLayerId !== 'base-tiles') {
        const [layerId, layerCopyId] = mapLayerId.split('.');
        if (!selectedLayers.value.some((l) => {
          return l.id == parseInt(layerId) && l.copy_id == parseInt(layerCopyId)
        })) {
          map.setLayoutProperty(mapLayerId, "visibility", "none");
        }
      }
    });
  }

  watch(selectedLayers, updateLayersShown);


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
    selectedLayers,
    selectedLayerStyles,
    updateLayersShown,
    toggleBaseLayer,
    getMap,
    getCurrentMapPosition,
    getTooltip,
    setMapCenter,
    clearMapLayers,
  }
});

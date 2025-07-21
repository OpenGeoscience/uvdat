import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { LngLatBoundsLike, Source } from "maplibre-gl";
import { Dataset, Layer, LayerFrame, Network, RasterData, RasterDataValues, VectorData } from '@/types';
import { getRasterDataValues, getVectorDataBounds } from '@/api/rest';
import { baseURL } from '@/api/auth';
import proj4 from 'proj4';

import { useMapStore, useStyleStore, useNetworkStore } from '.';

interface SourceDBObjects {
  dataset?: Dataset,
  layer?: Layer,
  frame?: LayerFrame,
  vector?: VectorData,
  raster?: RasterData,
  network?: Network,
}


function uniqueLayerIdFromLayer(layer: Layer) {
  return `${layer.id}.${layer.copy_id}`;
}

function sourceIdFromLayerFrame(layer: Layer, frame: LayerFrame) {
  const parts: (number | string)[] = [
    uniqueLayerIdFromLayer(layer),
    frame.id,
  ]

  if (frame.vector) {
    parts.push('vector');
    parts.push(frame.vector.id);
  } else if (frame.raster) {
    parts.push('raster');
    parts.push(frame.raster.id);
  } else {
    throw new Error("Layer frame is neither raster nor vector!");
  }

  return parts.join('.');
}

export const useLayerStore = defineStore('layer', () => {
  const selectedLayers = ref<Layer[]>([]);
  const selectedLayerFrames = computed(() => selectedLayers.value.reduce((acc, layer) => [...acc, ...layer.frames], [] as LayerFrame[]));

  // Sibling store imports
  const mapStore = useMapStore();
  const networkStore = useNetworkStore();
  const styleStore = useStyleStore();

  function getDBObjectsForSourceID(sourceId: string) {
    const DBObjects: SourceDBObjects = {}
    const [
      layerId, layerCopyId, frameId
    ] = sourceId.split('.');
    selectedLayers.value.forEach((layer) => {
      if (layer.id === parseInt(layerId) && layer.copy_id === parseInt(layerCopyId)) {
        DBObjects.dataset = layer.dataset;
        DBObjects.layer = layer;
        layer.frames.forEach((frame) => {
          if (frame.id === parseInt(frameId)) {
            DBObjects.frame = frame;
            if (frame.vector) DBObjects.vector = frame.vector;
            else if (frame.raster) DBObjects.raster = frame.raster;
          }
        })
        DBObjects.network = networkStore.availableNetworks.find((n) => n.vector_data == DBObjects.vector?.id)
      }
    })
    return DBObjects
  }

  async function getBoundsOfVisibleLayers(): Promise<LngLatBoundsLike | undefined> {
    let xMinGlobal, xMaxGlobal, yMinGlobal, yMaxGlobal = undefined;
    for (let index = 0; index < selectedLayers.value.length; index++) {
      const layer = selectedLayers.value[index];
      if (layer.visible) {
        const currentFrame = layer.frames[layer.current_frame]
        let xmin, xmax, ymin, ymax, srs = undefined;
        if (currentFrame.raster) {
          const bounds = currentFrame.raster.metadata.bounds;
          ({ xmin, xmax, ymin, ymax, srs } = bounds);
          [xmin, ymin] = proj4(srs, "EPSG:4326", [xmin, ymin]);
          [xmax, ymax] = proj4(srs, "EPSG:4326", [xmax, ymax]);
        } else if (currentFrame.vector) {
          const bounds = await getVectorDataBounds(currentFrame.vector.id);
          [xmin, ymin, xmax, ymax] = bounds;
        }
        if (!xMinGlobal || xMinGlobal > xmin) xMinGlobal = xmin;
        if (!yMinGlobal || yMinGlobal > ymin) yMinGlobal = ymin;
        if (!xMaxGlobal || xMaxGlobal < xmax) xMaxGlobal = xmax;
        if (!yMaxGlobal || yMaxGlobal < ymax) yMaxGlobal = ymax;
      }
    }
    if (xMinGlobal && xMaxGlobal && yMinGlobal && yMaxGlobal) {
      return [[xMinGlobal, yMinGlobal], [xMaxGlobal, yMaxGlobal]]
    }
  }

  // Add this layer to selectedLayers, which will then trigger updateLayersShown to add it to the map
  function addLayer(layer: Layer) {
    let name = layer.name;
    let copy_id = 0;
    const existing = Object.keys(mapStore.mapSources).filter((sourceId) => {
      const { layerId } = mapStore.parseSourceString(sourceId);
      return layerId === layer.id
    });

    // Must divide by number of frames to get the true copy ID, since each frame is added as a map source
    const numExisting = existing.length / layer.frames.length;
    if (numExisting) {
      copy_id = numExisting;
      name = `${layer.name} (${copy_id})`;
    }

    selectedLayers.value = [
      { ...layer, name, copy_id, visible: true, current_frame: 0 },
      ...selectedLayers.value,
    ];
  }

  watch(selectedLayers, updateLayersShown);
  function updateLayersShown() {
    const map = mapStore.getMap();

    // reverse selected layers list for first on top
    selectedLayers.value.toReversed().forEach((layer) => {
      const multiFrame = layer.frames.length > 1;
      layer.frames.forEach((frame) => {
        const styleId = uniqueLayerIdFromLayer(layer);
        if (!styleStore.selectedLayerStyles[styleId]) {
          styleStore.selectedLayerStyles[styleId] = styleStore.getDefaultStyle();
        }
        const currentStyle = styleStore.selectedLayerStyles[styleId];
        currentStyle.visible = layer.visible

        const currentFrame = layer.current_frame === frame.index;
        // const currentFrame = true;


        // TODO: Move this conditional functionality into `addLayer`, and directly call addLayerFrameToMap there
        const sourceId = sourceIdFromLayerFrame(layer, frame);
        if (currentStyle.visible && !map.getLayersOrder().some(
          (mapLayerId) => mapLayerId.includes(sourceId)
        ) && currentFrame) {
          mapStore.addLayerFrameToMap(frame, sourceId, multiFrame);
        }

        map.getLayersOrder().forEach((mapLayerId) => {
          if (mapLayerId !== 'base-tiles') {
            if (mapLayerId.includes(sourceId)) {
              map.moveLayer(mapLayerId);  // handles reordering
              styleStore.setMapLayerStyle(mapLayerId, {
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

  return {
    selectedLayers,
    // layerFrameMap,
    selectedLayerFrames,
    uniqueLayerIdFromLayer,
    sourceIdFromLayerFrame,
    updateLayersShown,
    addLayer,
    getDBObjectsForSourceID,
    getBoundsOfVisibleLayers,
  }
});

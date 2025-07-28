import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { LngLatBoundsLike } from "maplibre-gl";
import { Dataset, Layer, LayerFrame, Network, RasterData, VectorData } from '@/types';
import { getDatasetLayers, getLayer, getLayerFrames, getVectorDataBounds } from '@/api/rest';
import proj4 from 'proj4';

import { useMapStore, useStyleStore, useNetworkStore, useProjectStore } from '.';

interface SourceDBObjects {
  dataset?: Dataset,
  layer?: Layer,
  frame?: LayerFrame,
  vector?: VectorData,
  raster?: RasterData,
  network?: Network,
}

export const useLayerStore = defineStore('layer', () => {
  const availableLayers = ref<Layer[]>([]);
  const selectedLayers = ref<Layer[]>([]);
  const framesByLayerId = ref<Record<number, LayerFrame[]>>({});

  // Sibling store imports
  const mapStore = useMapStore();
  const networkStore = useNetworkStore();
  const styleStore = useStyleStore();
  const projectStore = useProjectStore();

  /**
   * Return the maplibre layers associated with a Layer DB object
   *
   * @param layer The Layer DB object
   */
  function getMapLayersFromLayerObject(layer: Layer) {
    // Map layer format is <layerId>.<layerCopyId>.<frameId>.<type>.<typeId>,
    // where type is vector, raster, or 'bounds' (used for raster bounds)
    return mapStore.getUserMapLayers().filter((layerId) => layerId.startsWith(mapStore.uniqueLayerIdFromLayer(layer)));
  }

  async function fetchAvailableLayer(layerId: number) {
    const layer = await getLayer(layerId)
    if (!availableLayers.value.map((l: Layer) => l.id).includes(layer.id)) {
      availableLayers.value = [
        ...availableLayers.value,
        layer
      ]
    } else {
      availableLayers.value = availableLayers.value.map((l: Layer) => {
        return l.id === layer.id ? layer : l
      })
    }
    return layer
  }

  async function fetchAvailableLayersForDataset(datasetId: number) {
    // fetch all layers on a dataset and update availableLayers
    // such that any existing layers are overwritten and new ones are added
    const datasetLayers = await getDatasetLayers(datasetId)
    const datasetLayerIds = new Set(datasetLayers.map((l: Layer) => l.id))
    const existingLayerIds = new Set(availableLayers.value.map((l: Layer) => l.id))
    const newLayers = datasetLayers.filter((l: Layer) => !existingLayerIds.has(l.id))
    const updatedExistingLayers = datasetLayers.filter((l: Layer) => existingLayerIds.has(l.id))
    const remainingExistingLayers = availableLayers.value.filter((l: Layer) => !datasetLayerIds.has(l.id))
    availableLayers.value = [
      ...newLayers,
      ...updatedExistingLayers,
      ...remainingExistingLayers,
    ]
    return datasetLayers
  }

  async function fetchFramesForLayer(layerId: number) {
    const frames = await getLayerFrames(layerId)
    framesByLayerId.value[layerId] = frames
    return frames
  }

  function layerFrames(layer: Layer) {
    return framesByLayerId.value[layer.id] || []
  }

  function getDBObjectsForSourceID(sourceId: string) {
    const DBObjects: SourceDBObjects = {}
    const {layerId, layerCopyId, frameId } = mapStore.parseSourceString(sourceId)
    selectedLayers.value.forEach((layer) => {
      if (layer.id === layerId && layer.copy_id === layerCopyId) {
        DBObjects.dataset = projectStore.availableDatasets?.find((d: Dataset) => d.id === layer.dataset);
        DBObjects.layer = layer;
        framesByLayerId.value[layer.id].forEach((frame) => {
          if (frame.id === frameId) {
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
        const currentFrames = framesByLayerId.value[layer.id].filter(
          (frame: LayerFrame) => frame.index === layer.current_frame_index
        )
        for (let i = 0; i < currentFrames.length; i++) {
          const currentFrame = currentFrames[i];
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
    }
    if (xMinGlobal && xMaxGlobal && yMinGlobal && yMaxGlobal) {
      return [[xMinGlobal, yMinGlobal], [xMaxGlobal, yMaxGlobal]]
    }
  }

  // Add this layer to selectedLayers, which will then trigger updateLayersShown to add it to the map
  async function addLayer(layer: Layer) {
    const existing = mapStore.getLatestLayerInstance(layer);
    const copy_id = existing === undefined ? 0 : existing.layerCopyId + 1;
    const name = copy_id > 0 ? `${layer.name} (${copy_id})` : layer.name;
    const newLayer = { ...layer, name, copy_id, visible: true, current_frame_index: 0 };

    // Need to fetch the frames for this layer, if not present
    if (!layerFrames(layer).length) {
      await fetchFramesForLayer(layer.id);
    }

    selectedLayers.value = [
      newLayer,
      ...selectedLayers.value,
    ];
  }

  watch(selectedLayers, updateLayersShown);
  watch(framesByLayerId, updateLayersShown);
  function updateLayersShown() {
    const map = mapStore.getMap();

    // reverse selected layers list for first on top
    selectedLayers.value.toReversed().forEach((layer) => {
      const frames = layerFrames(layer)
      const multiFrame = frames.length > 1;
      frames.forEach((frame) => {
        const styleId = mapStore.uniqueLayerIdFromLayer(layer);
        if (!styleStore.selectedLayerStyles[styleId]) {
          if (layer.default_style?.style_spec && Object.keys(layer.default_style.style_spec).length) {
            styleStore.selectedLayerStyles[styleId] = { ...layer.default_style?.style_spec }
            if (styleStore.selectedLayerStyles[styleId]?.default_frame !== layer.current_frame_index) {
              layer.current_frame_index = styleStore.selectedLayerStyles[styleId].default_frame
            }
          } else {
            const firstCurrentRaster = frames.find((f) => f.index == layer.current_frame_index && f.raster)?.raster
            styleStore.selectedLayerStyles[styleId] = { ...styleStore.getDefaultStyleSpec(firstCurrentRaster) }
          }
        }

        // TODO: Move this conditional functionality into `addLayer`, and directly call addLayerFrameToMap there
        const sourceId = mapStore.sourceIdFromLayerFrame(layer, frame);
        if (layer.visible && !mapStore.getUserMapLayers().some(
          (mapLayerId) => mapLayerId.includes(sourceId)
        ) && layer.current_frame_index === frame.index) {
          mapStore.addLayerFrameToMap(frame, sourceId, multiFrame);
        }

        mapStore.getUserMapLayers().forEach((mapLayerId) => {
          if (mapLayerId.includes(sourceId)) {
            map.moveLayer(mapLayerId);  // handles reordering
          }
        });
      })
      styleStore.updateLayerStyles(layer)
    })
    // hide any removed layers
    mapStore.getUserMapLayers().forEach((mapLayerId) => {
      const { layerId, layerCopyId } = mapStore.parseLayerString(mapLayerId);
      if (!selectedLayers.value.some((l) => {
        return l.id == layerId && l.copy_id == layerCopyId
      })) {
        map.setLayoutProperty(mapLayerId, "visibility", "none");
      }
    });
  }

  return {
    availableLayers,
    selectedLayers,
    fetchAvailableLayer,
    fetchAvailableLayersForDataset,
    fetchFramesForLayer,
    layerFrames,
    updateLayersShown,
    addLayer,
    getDBObjectsForSourceID,
    getBoundsOfVisibleLayers,
    getMapLayersFromLayerObject,
  }
});

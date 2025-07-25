import { defineStore } from 'pinia';
import { ref, shallowRef, watch } from 'vue';
import {
  ClickedFeatureData,
  Project,
  RasterData,
  RasterDataValues,
  VectorData,
  LayerFrame,
  MapLibreLayerWithMetadata,
  MapLibreLayerMetadata,
  Layer,
} from '@/types';
import { Map, MapLayerMouseEvent, Popup, Source, LayerSpecification } from "maplibre-gl";
import { getRasterDataValues } from '@/api/rest';
import { baseURL } from '@/api/auth';
import proj4 from 'proj4';
import { useStyleStore } from './style';

function getLayerIsVisible(layer: MapLibreLayerWithMetadata) {
  // Since visibility must be 'visible' for a feature click to even be registered,
  // we know that if it's not multiFrame, then it is indeed visible
  if (!layer.metadata.multiFrame) {
    return true;
  }

  // Try to check opacity now
  if (layer.paint === undefined) {
    throw new Error("Layer paint property is undefined");
  }

  const opacityKeys = Object.keys(layer.paint).filter((key) => key.endsWith('-opacity'));
  const opaque = opacityKeys.every((key) => layer.paint![key as keyof MapLibreLayerWithMetadata["paint"]] > 0);

  return opaque;
}


function sourceIdFromMapLayerId(mapLayerId: string) {
  return mapLayerId.split('.').slice(0, -1).join('.');
}

function uniqueLayerIdFromLayer(layer: Layer) {
  return `${layer.id}.${layer.copy_id}`;
}

/**
 * Note: Rasters also have an extra `bounds` source, which allows for
 * interaction with the raster layer. This is not considered in this
 * function, as it's rarely accessed directly.
 */
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


type SourceType = 'vector' | 'raster' | 'bounds';
interface SourceDescription {
  layerId: number;
  layerCopyId: number;
  frameId: number;
  type: SourceType;
  typeId: number;
}

function parseSourceString(sourceId: string): SourceDescription {
  const parts = sourceId.split('.');
  if (parts.length !== 5) {
    throw new Error(`Source string incompatible: ${sourceId}`);
  }

  const [layerId, layerCopyId, frameId, type, typeId] = parts;
  return {
    layerId: parseInt(layerId),
    layerCopyId: parseInt(layerCopyId),
    frameId: parseInt(frameId),
    type: type as SourceType,
    typeId: parseInt(typeId),
  }
}


interface LayerDescription extends SourceDescription {
  layerType: LayerSpecification['type']
}

function parseLayerString(layerId: string): LayerDescription {
  const parts = layerId.split('.');
  if (parts.length !== 6) {
    throw new Error(`Layer string incompatible: ${layerId}`);
  }

  const layerType = parts[parts.length - 1] as LayerDescription['layerType'];
  const sourceDesc = parseSourceString(sourceIdFromMapLayerId(layerId));
  return {
    ...sourceDesc,
    layerType,
  }
}

export const useMapStore = defineStore('map', () => {
  const map = shallowRef<Map>();
  const showMapBaseLayer = ref(true);
  const tooltipOverlay = ref<Popup>();
  const clickedFeature = ref<ClickedFeatureData>();
  const rasterTooltipDataCache = ref<Record<number, RasterDataValues | undefined>>({});

  const styleStore = useStyleStore();

  function handleLayerClick(e: MapLayerMouseEvent) {
    const map = getMap();
    const clickedFeatures = map.queryRenderedFeatures(e.point).filter(
      (feat) => getLayerIsVisible(feat.layer as MapLibreLayerWithMetadata)
    );

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

  function getMapSources() {
    const map = getMap();
    return map.getLayersOrder().map((layerId) => map.getLayer(layerId)!.source);
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
    const userLayers = getMap().getLayersOrder().filter((id) => id !== 'base-tiles');
    removeLayers(userLayers);
  }

  function removeLayers(layerIds: string[]) {
    const map = getMap();

    // Must collect all source Ids so they can be removed after all layers
    // have been removed, since multple layers may use the same source
    let sourceIdsToRemove = new Set<string>();
    const layersToRemove = map.getLayersOrder().filter((id) => layerIds.includes(id));
    layersToRemove.forEach((id) => {
      sourceIdsToRemove.add(map.getLayer(id)!.source);
      map.removeLayer(id);
    });

    // Now remove the sources
    sourceIdsToRemove.forEach((id) => {
      map.removeSource(id);
    });
  }

  function createVectorFeatureMapLayers(source: Source, multiFrame: boolean) {
    const map = getMap();
    const { layerId, layerCopyId, frameId } = parseSourceString(source.id);
    const metadata: MapLibreLayerMetadata = {
      layer_id: layerId,
      layer_copy_id: layerCopyId,
      frame_id: frameId,
      multiFrame,
    }

    // Fill Layer
    map.addLayer({
      id: source.id + '.fill',
      type: "fill",
      source: source.id,
      metadata,
      "source-layer": "default",
      filter: [
        "match",
        ["geometry-type"],
        ["Polygon", "MultiPolygon"],
        true,
        false,
      ],
      layout: {
        visibility: "visible",
      },
      paint: {
        "fill-color": "black",
        "fill-opacity": 0.5,
      },
    });

    // Line Layer
    map.addLayer({
      id: source.id + '.line',
      type: "line",
      source: source.id,
      metadata,
      "source-layer": "default",
      layout: {
        "line-join": "round",
        "line-cap": "round",
        visibility: "visible",
      },
      paint: {
        "line-color": "black",
        "line-width": 2,
        "line-opacity": 1,
      },
    });

    // Circle Layer
    map.addLayer({
      id: source.id + '.circle',
      type: "circle",
      source: source.id,
      metadata,
      "source-layer": "default",
      filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
      paint: {
        "circle-color": "black",
        "circle-opacity": 1,
        "circle-stroke-color": "black",
        "circle-stroke-opacity": 1,
        "circle-stroke-width": 2,
        "circle-radius": 5,
      },
      layout: {
        visibility: "visible",
      },
    });

    map.on("click", source.id + '.fill', handleLayerClick);
    map.on("click", source.id + '.line', handleLayerClick);
    map.on("click", source.id + '.circle', handleLayerClick);
  }

  function createRasterFeatureMapLayers(tileSource: Source, boundsSource: Source, multiFrame: boolean) {
    const map = getMap();
    const { layerId, layerCopyId, frameId } = parseSourceString(tileSource.id);
    const metadata: MapLibreLayerMetadata = {
      layer_id: layerId,
      layer_copy_id: layerCopyId,
      frame_id: frameId,
      multiFrame,
    }

    // Tile Layer
    map.addLayer({
      id: tileSource.id + '.tile',
      type: "raster",
      source: tileSource.id,
      metadata,
    });

    map.addLayer({
      id: boundsSource.id + '.mask',
      type: "fill",
      source: boundsSource.id,
      paint: {
        "fill-opacity": 0,
      },

      // Must ensure multiFrame is always false for this layer, since
      // the opacity of will always be 0, but it must still be clickable
      metadata: { ...metadata, multiFrame: false },
    });

    map.on("click", boundsSource.id + '.mask', handleLayerClick);
  }

  async function cacheRasterData(raster: RasterData) {
    if (rasterTooltipDataCache.value[raster.id] !== undefined) {
      return;
    }
    const data = await getRasterDataValues(raster.id);
    rasterTooltipDataCache.value[raster.id] = data;
  }

  function createVectorTileSource(vector: VectorData, sourceId: string, multiFrame: boolean): Source | undefined {
    const map = getMap();
    map.addSource(sourceId, {
      type: "vector",
      tiles: [`${baseURL}vectors/${vector.id}/tiles/{z}/{x}/{y}/`],
    });
    const source = map.getSource(sourceId);
    if (source) {
      createVectorFeatureMapLayers(source, multiFrame);
      return source;
    }
  }

  function createRasterTileSource(raster: RasterData, sourceId: string, multiFrame: boolean): Source | undefined {
    const map = getMap();

    const { layerId, layerCopyId } = parseSourceString(sourceId);
    const styleSpec = styleStore.selectedLayerStyles[`${layerId}.${layerCopyId}`];
    const queryParams: {projection: string, style?: string} = { projection: 'epsg:3857' }
    const styleParams = styleStore.getRasterTilesQuery(styleSpec)
    if (styleParams) queryParams.style = JSON.stringify(styleParams)
    const query = new URLSearchParams(queryParams)
    map.addSource(sourceId, {
      type: "raster",
      tiles: [`${baseURL}rasters/${raster.id}/tiles/{z}/{x}/{y}.png/?${query}`],
    });
    const tileSource = map.getSource(sourceId);

    const bounds = raster.metadata.bounds;
    const boundsSourceId = sourceId + '.bounds.' + raster.id;
    let { xmin, xmax, ymin, ymax, srs } = bounds;
    [xmin, ymin] = proj4(srs, "EPSG:4326", [xmin, ymin]);
    [xmax, ymax] = proj4(srs, "EPSG:4326", [xmax, ymax]);
    map.addSource(boundsSourceId, {
      type: "geojson",
      data: {
        type: "Polygon",
        coordinates: [[
          [xmin, ymin], [xmin, ymax], [xmax, ymax], [xmax, ymin], [xmin, ymin],
        ]]
      }
    });
    const boundsSource = map.getSource(boundsSourceId);

    if (tileSource && boundsSource) {
      createRasterFeatureMapLayers(tileSource, boundsSource, multiFrame);
      cacheRasterData(raster);
      return tileSource;
    }
  }

  function addLayerFrameToMap(frame: LayerFrame, sourceId: string, multiFrame: boolean) {
    if (!getMapSources().includes(sourceId)) {
      if (frame.vector) {
        createVectorTileSource(frame.vector, sourceId, multiFrame);
      } else if (frame.raster) {
        createRasterTileSource(frame.raster, sourceId, multiFrame);
      } else {
        throw new Error('Layer Frame is neither raster nor vector!');
      }
    }
  }

  return {
    // Data
    map,
    showMapBaseLayer,
    tooltipOverlay,
    clickedFeature,
    rasterTooltipDataCache,
    // Functions
    handleLayerClick,
    toggleBaseLayer,
    getMap,
    getMapSources,
    getCurrentMapPosition,
    getTooltip,
    setMapCenter,
    clearMapLayers,
    removeLayers,
    createVectorFeatureMapLayers,
    createRasterFeatureMapLayers,
    createVectorTileSource,
    createRasterTileSource,
    addLayerFrameToMap,
    cacheRasterData,
    sourceIdFromMapLayerId,
    parseSourceString,
    parseLayerString,
    sourceIdFromLayerFrame,
    uniqueLayerIdFromLayer,
  }
});

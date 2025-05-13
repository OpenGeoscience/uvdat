import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { LngLatBoundsLike, Source } from "maplibre-gl";
import { Dataset, Layer, LayerFrame, Network, RasterData, RasterDataValues, Style, VectorData } from '@/types';
import { getDefaultColor, setMapLayerStyle } from '@/layerStyles';
import { getRasterDataValues, getVectorDataBounds } from '@/api/rest';
import { baseURL } from '@/api/auth';
import proj4 from 'proj4';
import { useMapStore } from './map';
import { availableNetworks } from '@/store';

interface SourceDBObjects {
  dataset?: Dataset,
  layer?: Layer,
  frame?: LayerFrame,
  vector?: VectorData,
  raster?: RasterData,
  network?: Network,
}


export const useLayerStore = defineStore('layer', () => {
  const selectedLayers = ref<Layer[]>([]);
  const selectedLayerStyles = ref<Record<string, Style>>({});
  const rasterTooltipDataCache = ref<Record<number, RasterDataValues | undefined>>({});

  // Sibling store imports
  const mapStore = useMapStore();


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
        DBObjects.network = availableNetworks.value.find((n) => n.vector_data == DBObjects.vector?.id)
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

  function createVectorFeatureMapLayers(source: Source) {
    const map = mapStore.getMap();
    const sourceIdentifiers = source.id.split('.');
    const metadata = {
      layer_id: sourceIdentifiers[0],
      layer_copy_id: sourceIdentifiers[1],
      frame_id: sourceIdentifiers[2],
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
    // Filtered to point geometries. If not filtered,
    // this will add a circle at the vertices of all lines.
    // This should be added LAST, as it has click priority over the other layer types.
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

    map.on("click", source.id + '.fill', mapStore.handleLayerClick);
    map.on("click", source.id + '.line', mapStore.handleLayerClick);
    map.on("click", source.id + '.circle', mapStore.handleLayerClick);
  }


  function createVectorTileSource(vector: VectorData, sourceId: string): Source | undefined {
    const map = mapStore.getMap();
    const vectorSourceId = sourceId + '.vector.' + vector.id
    map.addSource(vectorSourceId, {
      type: "vector",
      tiles: [`${baseURL}vectors/${vector.id}/tiles/{z}/{x}/{y}/`],
    });
    const source = map.getSource(vectorSourceId);
    if (source) {
      createVectorFeatureMapLayers(source);
      return source;
    }
  }
  function createRasterFeatureMapLayers(tileSource: Source, boundsSource: Source) {
    const map = mapStore.getMap();
    const sourceIdentifiers = tileSource.id.split('.');
    const metadata = {
      layer_id: sourceIdentifiers[0],
      layer_copy_id: sourceIdentifiers[1],
      frame_id: sourceIdentifiers[2],
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
    });

    map.on("click", boundsSource.id + '.mask', mapStore.handleLayerClick);
  }

  async function cacheRasterData(raster: RasterData) {
    if (rasterTooltipDataCache.value[raster.id] !== undefined) {
      return;
    }
    const data = await getRasterDataValues(raster.id);
    rasterTooltipDataCache.value[raster.id] = data;
  }

  function createRasterTileSource(raster: RasterData, sourceId: string): Source | undefined {
    const map = mapStore.getMap();

    const params = {
      projection: 'EPSG:3857'
    }
    const tileParamString = new URLSearchParams(params).toString();
    const tilesSourceId = sourceId + '.raster.' + raster.id;
    map.addSource(tilesSourceId, {
      type: "raster",
      tiles: [`${baseURL}rasters/${raster.id}/tiles/{z}/{x}/{y}.png/?${tileParamString}`],
    });
    const tileSource = map.getSource(tilesSourceId);

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
      createRasterFeatureMapLayers(tileSource, boundsSource);
      cacheRasterData(raster);
      return tileSource;
    }
  }

  function addFrame(frame: LayerFrame, sourceId: string) {
    if (!mapStore.mapSources[sourceId]) {
      if (frame.vector) {
        const vector = createVectorTileSource(frame.vector, sourceId);
        if (vector) mapStore.mapSources[sourceId] = vector;

      }
      if (frame.raster) {
        const raster = createRasterTileSource(frame.raster, sourceId);
        if (raster) mapStore.mapSources[sourceId] = raster;
      }
    }
  }

  // Add this layer to selectedLayers, which will then trigger updateLayersShown to add it to the map
  function addLayer(layer: Layer) {
    let name = layer.name;
    let copy_id = 0;
    const existing = Object.keys(mapStore.mapSources).filter((sourceId) => {
      const [layerId] = sourceId.split('.');
      return parseInt(layerId) === layer.id
    });
    if (existing.length) {
      copy_id = existing.length;
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

  return {
    // Data
    rasterTooltipDataCache,
    selectedLayers,
    selectedLayerStyles,
    // Functions
    updateLayersShown,
    addLayer,
    getDBObjectsForSourceID,
    getBoundsOfVisibleLayers,
  }
});

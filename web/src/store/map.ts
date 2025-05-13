import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { Map, Popup, Source } from "maplibre-gl";
import { ClickedFeatureData, Layer, LayerFrame, Project, RasterData, RasterDataValues, Style, VectorData } from '@/types';
import { getDefaultColor, setMapLayerStyle } from '@/layerStyles';
import { getRasterDataValues } from '@/api/rest';
import { baseURL } from '@/api/auth';
import proj4 from 'proj4';
import { handleLayerClick } from '@/layers';


export const useMapStore = defineStore('map', () => {
  const map = ref<Map>();
  const mapSources = ref<Record<string, Source>>({});
  const showMapBaseLayer = ref(true);
  const tooltipOverlay = ref<Popup>();
  const clickedFeature = ref<ClickedFeatureData>();
  const selectedLayers = ref<Layer[]>([]);
  const selectedLayerStyles = ref<Record<string, Style>>({});
  const rasterTooltipDataCache = ref<Record<number, RasterDataValues | undefined>>({});

  function createVectorFeatureMapLayers(source: Source) {
    const map = getMap();
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

    map.on("click", source.id + '.fill', handleLayerClick);
    map.on("click", source.id + '.line', handleLayerClick);
    map.on("click", source.id + '.circle', handleLayerClick);
}

function createRasterFeatureMapLayers(tileSource: Source, boundsSource: Source) {
    const map = getMap();
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

    map.on("click", boundsSource.id + '.mask', handleLayerClick);
}


  function createVectorTileSource(vector: VectorData, sourceId: string): Source | undefined {
    const map = getMap();
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

  function createRasterTileSource(raster: RasterData, sourceId: string): Source | undefined {
    const map = getMap();

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
    let {xmin, xmax, ymin, ymax, srs} = bounds;
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
    if (!mapSources.value[sourceId]) {
      if (frame.vector) {
        const vector = createVectorTileSource(frame.vector, sourceId);
        if (vector) mapSources.value[sourceId] = vector;

      }
      if (frame.raster) {
        const raster = createRasterTileSource(frame.raster, sourceId);
        if (raster) mapSources.value[sourceId] = raster;
      }
    }
  }

  // Add this layer to selectedLayers, which will then trigger updateLayersShown to add it to the map
  function addLayer(layer: Layer) {
    let name = layer.name;
    let copy_id = 0;
    const existing = Object.keys(mapSources.value).filter((sourceId) => {
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

  async function cacheRasterData(raster: RasterData) {
    if (rasterTooltipDataCache.value[raster.id] !== undefined) {
      return;
    }
    const data = await getRasterDataValues(raster.id);
    rasterTooltipDataCache.value[raster.id] = data;
}

  return {
    // Data
    map,
    mapSources,
    showMapBaseLayer,
    tooltipOverlay,
    clickedFeature,
    selectedLayers,
    selectedLayerStyles,
    rasterTooltipDataCache,
    // Functions
    addLayer,
    updateLayersShown,
    toggleBaseLayer,
    getMap,
    getCurrentMapPosition,
    getTooltip,
    setMapCenter,
    clearMapLayers,
    cacheRasterData,
  }
});

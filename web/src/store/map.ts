import { defineStore } from 'pinia';
import { ref, shallowRef, watch } from 'vue';
import { Map, MapLayerMouseEvent, Popup, Source } from "maplibre-gl";
import { ClickedFeatureData, Project, RasterData, RasterDataValues, VectorData, LayerFrame, MapLibreLayerWithMetadata, MapLibreLayerMetadata } from '@/types';
import { getRasterDataValues } from '@/api/rest';
import { baseURL } from '@/api/auth';
import proj4 from 'proj4';
import { useStyleStore } from './style';

function getLayerIsVisible(layer: MapLibreLayerWithMetadata) {
  if (layer.paint === undefined) {
    throw new Error("Layer paint property is undefined");
  }

  const opacityKeys = Object.keys(layer.paint).filter((key) => key.endsWith('-opacity'));
  const opaque = opacityKeys.every((key) => layer.paint![key as keyof MapLibreLayerWithMetadata["paint"]] > 0);

  return opaque;
}

export const useMapStore = defineStore('map', () => {
  const map = shallowRef<Map>();
  const mapSources = ref<Record<string, Source>>({});
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

  function createVectorFeatureMapLayers(source: Source, multiFrame: boolean) {
    const map = getMap();
    const sourceIdentifiers = source.id.split('.');
    const metadata: MapLibreLayerMetadata = {
      layer_id: sourceIdentifiers[0],
      layer_copy_id: sourceIdentifiers[1],
      frame_id: sourceIdentifiers[2],
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
    const sourceIdentifiers = tileSource.id.split('.');
    const metadata: MapLibreLayerMetadata = {
      layer_id: sourceIdentifiers[0],
      layer_copy_id: sourceIdentifiers[1],
      frame_id: sourceIdentifiers[2],
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
    const vectorSourceId = sourceId + '.vector.' + vector.id
    map.addSource(vectorSourceId, {
      type: "vector",
      tiles: [`${baseURL}vectors/${vector.id}/tiles/{z}/{x}/{y}/`],
    });
    const source = map.getSource(vectorSourceId);
    if (source) {
      createVectorFeatureMapLayers(source, multiFrame);
      return source;
    }
  }

  function createRasterTileSource(raster: RasterData, sourceId: string, multiFrame: boolean): Source | undefined {
    const map = getMap();

    const tilesSourceId = sourceId + '.raster.' + raster.id;
    const [layerId, layerCopyId] = sourceId.split('.');
    const styleSpec = styleStore.selectedLayerStyles[`${layerId}.${layerCopyId}`];
    const query = new URLSearchParams({
      projection: 'epsg:3857',
      style: JSON.stringify(styleStore.getRasterTilesQuery(styleSpec))
    })
    map.addSource(tilesSourceId, {
      type: "raster",
      tiles: [`${baseURL}rasters/${raster.id}/tiles/{z}/{x}/{y}.png/?${query}`],
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
      createRasterFeatureMapLayers(tileSource, boundsSource, multiFrame);
      cacheRasterData(raster);
      return tileSource;
    }
  }

  function addLayerFrameToMap(frame: LayerFrame, sourceId: string, multiFrame: boolean) {
    if (!mapSources.value[sourceId]) {
      if (frame.vector) {
        const vector = createVectorTileSource(frame.vector, sourceId, multiFrame);
        if (vector) mapSources.value[sourceId] = vector;
      }
      if (frame.raster) {
        const raster = createRasterTileSource(frame.raster, sourceId, multiFrame);
        if (raster) mapSources.value[sourceId] = raster;
      }
    }
  }

  return {
    // Data
    map,
    mapSources,
    showMapBaseLayer,
    tooltipOverlay,
    clickedFeature,
    rasterTooltipDataCache,
    // Functions
    handleLayerClick,
    toggleBaseLayer,
    getMap,
    getCurrentMapPosition,
    getTooltip,
    setMapCenter,
    clearMapLayers,
    createVectorFeatureMapLayers,
    createRasterFeatureMapLayers,
    createVectorTileSource,
    createRasterTileSource,
    addLayerFrameToMap,
    cacheRasterData,
  }
});

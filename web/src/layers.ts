import MVT from "ol/format/MVT";
import TileLayer from "ol/layer/Tile";
import XYZSource from "ol/source/XYZ.js";
import VectorTileLayer from "ol/layer/VectorTile";
import { DataDrivenPropertyValueSpecification, RasterTileSource, TypedStyleLayer, VectorTileSource } from 'maplibre-gl'
import { Circle, Stroke, Style } from "ol/style";
import { Map } from 'maplibre-gl'
import { Feature } from "ol";

import { ref } from "vue";
import {
  Dataset,
  DerivedRegion,
  RasterMapLayer,
  isRasterMapLayer,
  VectorMapLayer,
  isVectorMapLayer,
} from "./types";
import { getMapLayer } from "./api/rest";
import { getMap } from "./storeFunctions";
import { baseURL } from "@/api/auth";
import { cacheRasterData, createStyle, randomColor } from "./utils";
import {
  availableDatasets,
  currentDataset,
  availableDerivedRegions,
  currentNetworkGCC,
  selectedDatasets,
  selectedMapLayers,
  showMapBaseLayer,
  deactivatedNodes,
  availableMapLayers,
  selectedDerivedRegions,
  map,
} from "./store";
import CircleStyle from "ol/style/Circle";

const _mapLayerManager = ref<(VectorMapLayer | RasterMapLayer)[]>([]);


const defaultAnnotationColor = 'black';
const getAnnotationColor = () => {
  const result = [];
  result.push('case');

  // Check if the 'colors' field exists and use the first color
  result.push(['has', 'colors']);
  result.push([
    'let',
    'firstColor',
    ['slice', ['get', 'colors'], 0, 7], // assuming each color is in the format '#RRGGBB'
    ['to-color', ['var', 'firstColor']]
  ]);

  // Check if the 'color' field exists and match specific values
  result.push(['has', 'color']);
  result.push([
    'match',
    ['get', 'color'],
    'light blue', '#ADD8E6',
    'dark blue', '#00008B',
    // add other color mappings here
    ['get', 'color'] // if the color is already in a valid format
  ]);

  // Default annotation color if none of the above conditions are met
  result.push(defaultAnnotationColor);

  return result as DataDrivenPropertyValueSpecification<string>;
};

export function generateMapLayerId(mapLayer: VectorMapLayer | RasterMapLayer, type: string): string {
  if (isVectorMapLayer(mapLayer)) {
    return `map-layer-${mapLayer.id}-vector-tile-${type}`;
  }

  if (isRasterMapLayer(mapLayer)) {
    return `map-layer-${mapLayer.id}-raster-tile`;
  }

  throw new Error('Unsupported map layer type');
}


export function createMapLayer(mapLayer: VectorMapLayer | RasterMapLayer) {
  let layer: TypedStyleLayer;

  if (isVectorMapLayer(mapLayer)) {
    layer = createVectorTileLayer(map.value!, mapLayer);
  } else if (isRasterMapLayer(mapLayer)) {
    layer = createRasterTileLayer(map.value!, mapLayer);
    mapLayer.openlayer = layer;
    styleRasterOpenLayer(mapLayer.openlayer, {});
    cacheRasterData(mapLayer.id);
  } else {
    throw new Error("Unsupported map layer type.");
  }

  // layer.setZIndex(selectedMapLayers.value.length);

  // Check for existing layer
  const existingLayer = _mapLayerManager.value.find(
    (l) => l.id === mapLayer.id && l.type === mapLayer.type
  );
  if (!existingLayer) {
    _mapLayerManager.value.push(mapLayer);
  }

  return layer;
}

export async function getOrCreateLayerFromID(
  mapLayerId: number | undefined,
  mapLayerType: string | undefined
): Promise<VectorMapLayer | RasterMapLayer | undefined> {
  if (mapLayerId === undefined || mapLayerType === undefined) {
    throw new Error(`Could not get or create openLayer for undefined layer`);
  }

  const cachedMapLayer = _mapLayerManager.value.find((l) => {
    return l.id === mapLayerId && l.type === mapLayerType;
  });
  if (cachedMapLayer) return cachedMapLayer;

  // Grab map layer from available or by fetching
  let mapLayer = availableMapLayers.value.find(
    (l) => l.id === mapLayerId && l.type === mapLayerType
  );
  if (!mapLayer) {
    mapLayer = await getMapLayer(mapLayerId, mapLayerType);
  }

  // Create open layer and return
  mapLayer.openlayer = createMapLayer(mapLayer);
  return mapLayer;
}

export function createVectorTileLayer(map: Map, mapLayer: VectorMapLayer) {
  const defaultColors = `${randomColor()},#ffffff`;

  const sourceId = `vector-tile-source-${mapLayer.id}`;
  map.addSource(sourceId, {
    type: 'vector',
    tiles: [`${baseURL}vectors/${mapLayer.id}/tiles/{z}/{x}/{y}/`],
  })

  const layerId = generateMapLayerId(mapLayer, 'line');
  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    "source-layer": 'default',
    metadata: {
      id: mapLayer.id,
      type: mapLayer.type,
    },
    paint: {
      "line-color": getAnnotationColor(),
    },
  });

  const layerId2 = generateMapLayerId(mapLayer, 'circle');
  map.addLayer({
    id: layerId2,
    type: "circle",
    source: sourceId,
    "source-layer": "default",
    paint: {
      'circle-color': getAnnotationColor(),
    }
  });



  console.log("-sss--", map.getLayer(layerId));
  return map.getLayer(layerId) as TypedStyleLayer;
}

export function styleVectorOpenLayer(
  mapLayer: VectorMapLayer,
  options: {
    showGCC?: boolean;
    translucency?: string;
  } = {}
) {
  const { openlayer } = mapLayer;
  if (openlayer) {
    const layerStyleFunction = openlayer.getStyle();
    openlayer.setStyle((feature: Feature) => {
      const oldStyle = layerStyleFunction(feature);
      let newStyle = oldStyle;
      if (options.showGCC && currentNetworkGCC.value) {
        const featureProps = feature.getProperties();
        const { node_id, from_node_id, to_node_id } = featureProps;
        let highlight = false;
        let translucent = false;
        if (node_id) {
          if (deactivatedNodes.value.includes(node_id)) translucent = true;
          if (currentNetworkGCC.value.includes(node_id)) highlight = true;
        } else if (from_node_id && to_node_id) {
          if (
            currentNetworkGCC.value.includes(from_node_id) ||
            currentNetworkGCC.value.includes(to_node_id)
          ) {
            highlight = true;
          }
        }

        if (translucent) {
          newStyle = oldStyle.map((s: Style) => {
            const stroke = s.getStroke();
            const image = s.getImage();
            const circle = image as CircleStyle;

            let strokeColor = stroke?.getColor()?.toString().substring(0, 7);
            let circleColor = circle
              ?.getFill()
              ?.getColor()
              ?.toString()
              .substring(0, 7);
            if (translucent && options.translucency) {
              if (strokeColor) strokeColor += options.translucency;
              if (circleColor) circleColor += options.translucency;
            } else {
              if (strokeColor) strokeColor += "ff";
              if (circleColor) circleColor += "ff";
            }
            if (strokeColor) stroke.setColor(strokeColor);
            if (circleColor) circle.getFill().setColor(circleColor);
            return s;
          });
        }

        if (highlight) {
          const highlightStroke = new Stroke({
            color: "yellow",
            width: 8,
          });
          newStyle.push(
            new Style({
              zIndex: 0,
              stroke: highlightStroke,
              image: new Circle({
                stroke: highlightStroke,
                radius: 8,
              }),
            })
          );
        }
      }

      return newStyle;
    });
  }
}

export function createRasterTileLayer(map: Map, mapLayer: RasterMapLayer) {
  const sourceId = `raster-tile-source-${mapLayer.id}`;
  map.addSource(sourceId, {
    type: 'raster',
    tiles: [],
  })

  const layerId = generateMapLayerId(mapLayer, 'raster');
  map.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
    // "source-layer": 'default',
    metadata: {
      id: mapLayer.id,
      type: mapLayer.type,
      default_style: mapLayer.default_style,
    },
  });

  return map.getLayer(layerId) as TypedStyleLayer;
}

export function styleRasterOpenLayer(
  openLayer: TypedStyleLayer,
  options: {
    colormap?: {
      palette?: string;
      range?: number[];
    };
    nodata?: number;
  }
) {
  const layerProperties = openLayer.metadata as Record<string, unknown>
  const defaultStyle = layerProperties.default_style as Record<string, unknown> | undefined;
  const colormapPalette =
    (options?.colormap?.palette || defaultStyle?.palette || "terrain") as string;
  const colormapRange = options?.colormap?.range || defaultStyle?.data_range;
  const nodataValue = options.nodata || defaultStyle?.transparency_threshold;

  const tileParams: Record<string, string> = {
    projection: "EPSG:3857",
    band: "1",
  };
  if (colormapPalette) {
    tileParams.palette = colormapPalette;
  }
  if (colormapRange?.length == 2) {
    tileParams.min = colormapRange[0];
    tileParams.max = colormapRange[1];
  }
  if (nodataValue) {
    tileParams.nodata = nodataValue;
  }
  // openLayer.setProperties(Object.assign(openLayer.getProperties(), tileParams));
  const tileParamString = new URLSearchParams(tileParams).toString();

  const source = map.value!.getSource(openLayer.source) as RasterTileSource;
  source.setTiles([`${baseURL}rasters/${layerProperties.id}/tiles/{z}/{x}/{y}.png/?${tileParamString}`])
}

export function findExistingLayer(
  mapLayer: VectorMapLayer | RasterMapLayer | undefined
) {
  if (mapLayer === undefined) {
    throw new Error(`Could not find existing openlayer for undefined layer`);
  }

  // const layerId = generateMapLayerId(mapLayer, 'line');

  // Find existing on map
  return getMap()
    .getLayers()
    .getArray()
    .find((l) => {
      return l.getProperties().id === mapLayer.id;
    });
}

export function isMapLayerVisible(
  mapLayer: VectorMapLayer | RasterMapLayer | undefined
): boolean {
  if (mapLayer === undefined) {
    throw new Error(`Could not determine visibility of undefined layer`);
  }

  const existing = findExistingLayer(mapLayer);
  if (!existing) return false;
  return existing.getVisible();
}

export function toggleMapLayer(
  mapLayer: VectorMapLayer | RasterMapLayer | undefined
) {
  if (mapLayer === undefined) {
    throw new Error(`Could not toggle undefined layer`);
  }

  const existing = findExistingLayer(mapLayer);
  if (existing) {
    // map.getLayer(layerId)!.setLayoutProperty('visibility', 'none');
    existing.setVisible(!existing.getVisible());
  } else {
    getMap().addLayer(mapLayer.openlayer);
  }

  if (isVectorMapLayer(mapLayer) && mapLayer.metadata?.network) {
    styleVectorOpenLayer(mapLayer, { showGCC: true, translucency: "55" });
  }
  updateVisibleMapLayers();
}

export function getDataObjectForMapLayer(
  mapLayer: VectorMapLayer | RasterMapLayer | undefined
): Dataset | DerivedRegion | undefined {
  // Data Object refers to the original object for which this map layer was created.
  // Can either be a Dataset or a DerivedRegion.
  if (mapLayer === undefined) {
    throw new Error(`Could not get data object for undefined layer`);
  }

  if (mapLayer.derived_region_id) {
    return availableDerivedRegions.value?.find(
      (r) => r.id === mapLayer.derived_region_id
    );
  } else if (mapLayer.dataset_id) {
    const dataset = availableDatasets.value?.find(
      (d) => d.id === mapLayer.dataset_id
    );
    if (dataset) {
      dataset.current_layer_index =
        dataset?.map_layers?.find(({ id }) => id === mapLayer.id)?.index || 0;
    }
    return dataset;
  }
  return undefined;
}

export async function getMapLayerForDataObject(
  dataObject: Dataset | DerivedRegion | undefined,
  layerIndex = 0
): Promise<VectorMapLayer | RasterMapLayer | undefined> {
  // Data Object refers to the original object for which this map layer was created.
  // Can either be a Dataset or a DerivedRegion.
  if (dataObject === undefined) {
    throw new Error(`Could not get map layer for undefined data object`);
  }
  const mapLayer = dataObject.map_layers?.find(
    ({ index }) => index === layerIndex
  );
  if (!mapLayer) {
    throw new Error(
      `No map layer with index ${layerIndex} exists for ${dataObject}.`
    );
  }
  dataObject.current_layer_index = layerIndex;
  return await getOrCreateLayerFromID(mapLayer.id, mapLayer.type);
}

export function updateVisibleMapLayers() {
  selectedMapLayers.value = _mapLayerManager.value.filter(isMapLayerVisible);

  selectedMapLayers.value.sort(
    (a, b) => b.openlayer.getZIndex() - a.openlayer.getZIndex()
  );

  if (!availableDatasets.value) {
    selectedDatasets.value = [];
  } else {
    selectedDatasets.value = availableDatasets.value.filter((d) => {
      return selectedMapLayers.value.some(
        (l) => getDataObjectForMapLayer(l) === d
      );
    });
  }

  // Set selected derived regions
  const available = availableDerivedRegions.value || [];
  selectedDerivedRegions.value = available.filter((d) => {
    return selectedMapLayers.value.some(
      (l) => getDataObjectForMapLayer(l) === d
    );
  });
}

export function updateBaseLayer() {
  getMap()
    .getLayers()
    .getArray()
    .forEach((l) => {
      if (l.getProperties().id === undefined) {
        l.setVisible(showMapBaseLayer.value);
      }
    });
}

export function clearMapLayers() {
  getMap()
    .getLayers()
    .getArray()
    .forEach((l) => {
      // only applies to layers with ids, i.e. not the base layer
      if (l.getProperties().id) {
        l.setVisible(false);
      }
    });
  currentDataset.value = undefined;
  updateVisibleMapLayers();
}

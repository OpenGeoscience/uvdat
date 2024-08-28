import MVT from "ol/format/MVT";
import TileLayer from "ol/layer/Tile";
import XYZSource from "ol/source/XYZ.js";
import VectorTileLayer from "ol/layer/VectorTile";
import { DataDrivenPropertyValueSpecification, LayerSpecification, RasterTileSource, TypedStyleLayer } from 'maplibre-gl'
import { Circle, Stroke, Style } from "ol/style";
import { Map } from 'maplibre-gl'
import { Feature } from "ol";

import { ref } from "vue";
import {
  Dataset,
  DerivedRegion,
  RasterDatasetLayer,
  isRasterDatasetLayer,
  VectorDatasetLayer,
  isVectorDatasetLayer,
} from "./types";
import { getDatasetLayer } from "./api/rest";
import { getMap } from "./storeFunctions";
import { baseURL } from "@/api/auth";
import { cacheRasterData, createStyle, randomColor } from "./utils";
import {
  availableDatasets,
  currentDataset,
  availableDerivedRegions,
  currentNetworkGCC,
  selectedDatasets,
  selectedDatasetLayers,
  showMapBaseLayer,
  deactivatedNodes,
  availableDatasetLayers,
  selectedDerivedRegions,
  map,
} from "./store";
import CircleStyle from "ol/style/Circle";

const _datasetLayerManager = ref<(VectorDatasetLayer | RasterDatasetLayer)[]>([]);


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
const getLineWidth = () => {
  const result = [];
  result.push('interpolate');
  result.push(['linear']);
  result.push(['zoom']);
  result.push(5); result.push(10);
  result.push(7); result.push(5);
  result.push(10); result.push(5);
  result.push(14); result.push(2);

  return result as DataDrivenPropertyValueSpecification<number>;

};

export function generateMapLayerId(datasetLayer: VectorDatasetLayer | RasterDatasetLayer, type: LayerSpecification['type']): string {
  if (isVectorDatasetLayer(datasetLayer)) {
    return `map-layer-${datasetLayer.id}-vector-tile-${type}`;
  }

  if (isRasterDatasetLayer(datasetLayer)) {
    return `map-layer-${datasetLayer.id}-raster-tile`;
  }

  throw new Error('Unsupported map layer type');
}


export function createMapLayer(datasetLayer: VectorDatasetLayer | RasterDatasetLayer) {
  let layer: TypedStyleLayer;

  if (isVectorDatasetLayer(datasetLayer)) {
    layer = createVectorTileLayer(map.value!, datasetLayer);
  } else if (isRasterDatasetLayer(datasetLayer)) {
    layer = createRasterTileLayer(map.value!, datasetLayer);
    datasetLayer.openlayer = layer;
    styleRasterMapLayer(datasetLayer.openlayer, {});
    cacheRasterData(datasetLayer.id);
  } else {
    throw new Error("Unsupported map layer type.");
  }

  // layer.setZIndex(selectedDatasetLayers.value.length);

  // Check for existing layer
  const existingLayer = _datasetLayerManager.value.find(
    (l) => l.id === datasetLayer.id && l.type === datasetLayer.type
  );
  if (!existingLayer) {
    _datasetLayerManager.value.push(datasetLayer);
  }

  return layer;
}

export async function getOrCreateLayerFromID(
  datasetLayerId: number | undefined,
  datasetLayerType: string | undefined
): Promise<VectorDatasetLayer | RasterDatasetLayer | undefined> {
  if (datasetLayerId === undefined || datasetLayerType === undefined) {
    throw new Error(`Could not get or create openLayer for undefined layer`);
  }

  const cachedDatasetLayer = _datasetLayerManager.value.find((l) => {
    return l.id === datasetLayerId && l.type === datasetLayerType;
  });
  if (cachedDatasetLayer) return cachedDatasetLayer;

  // Grab map layer from available or by fetching
  let datasetLayer = availableDatasetLayers.value.find(
    (l) => l.id === datasetLayerId && l.type === datasetLayerType
  );
  if (!datasetLayer) {
    datasetLayer = await getDatasetLayer(datasetLayerId, datasetLayerType);
  }

  // Create open layer and return
  datasetLayer.openlayer = createMapLayer(datasetLayer);
  return datasetLayer;
}

export function createVectorTileLayer(map: Map, datasetLayer: VectorDatasetLayer) {
  const defaultColors = `${randomColor()},#ffffff`;

  const sourceId = `vector-tile-source-${datasetLayer.id}`;
  map.addSource(sourceId, {
    type: 'vector',
    tiles: [`${baseURL}vectors/${datasetLayer.id}/tiles/{z}/{x}/{y}/`],
  })

  const layerId = generateMapLayerId(datasetLayer, 'line');
  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    "source-layer": 'default',
    metadata: {
      id: datasetLayer.id,
      type: datasetLayer.type,
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: 'visible',
    },
    paint: {
      "line-color": getAnnotationColor(),
      "line-width": getLineWidth(),
    },
  });

  const layerId2 = generateMapLayerId(datasetLayer, 'circle');
  map.addLayer({
    id: layerId2,
    type: "circle",
    source: sourceId,
    metadata: {
      id: datasetLayer.id,
      type: datasetLayer.type,
    },
    "source-layer": "default",
    paint: {
      'circle-color': getAnnotationColor(),
    },
    layout: {
      visibility: 'visible',
    },
  });

  // TODO: Return all layers
  const layer = map.getLayer(layerId)!;
  return layer;
}

export function styleVectorOpenLayer(
  datasetLayer: VectorDatasetLayer,
  options: {
    showGCC?: boolean;
    translucency?: string;
  } = {}
) {
  const { openlayer } = datasetLayer;
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

export function createRasterTileLayer(map: Map, datasetLayer: RasterDatasetLayer) {
  const sourceId = `raster-tile-source-${datasetLayer.id}`;
  map.addSource(sourceId, {
    type: 'raster',
    tiles: [],
  })

  const layerId = generateMapLayerId(datasetLayer, 'raster');
  map.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
    // "source-layer": 'default',
    metadata: {
      id: datasetLayer.id,
      type: datasetLayer.type,
      default_style: datasetLayer.default_style,
    },
  });

  return map.getLayer(layerId) as TypedStyleLayer;
}

export function styleRasterMapLayer(
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

export function findExistingMapLayers(datasetLayer: VectorDatasetLayer | RasterDatasetLayer) {
  if (datasetLayer === undefined) {
    throw new Error(`Could not find existing openlayer for undefined layer`);
  }

  const isDefined = (value: unknown): value is {} | null => value !== undefined;

  // Find existing on map
  const map = getMap();

  // TODO: Try to improve on forced non-null assertion, maplibre's types don't make this easy
  const layers = map.getLayersOrder().map((id: string) => map.getLayer(id)!);

  return layers.filter(
    (layer) => (
      isDefined(layer.metadata)
      && layer.metadata !== null
      && 'id' in layer.metadata
      && layer.metadata.id === datasetLayer.id
    )
  );
}

export function isDatasetLayerVisible(
  datasetLayer: VectorDatasetLayer | RasterDatasetLayer | undefined
): boolean {
  if (datasetLayer === undefined) {
    throw new Error(`Could not determine visibility of undefined layer`);
  }

  const mapLayers = findExistingMapLayers(datasetLayer);
  if (!mapLayers.length) {
    return false;
  }

  // TODO: This is tricky as it's not longer a binary value
  return mapLayers.some((layer) => layer.getLayoutProperty('visibility') !== 'none')
}


export function toggleDatasetLayerVisibility(datasetLayer: VectorDatasetLayer | RasterDatasetLayer) {
  const mapLayers = findExistingMapLayers(datasetLayer);
  mapLayers.forEach((layer) => {
    const enabled = layer.getLayoutProperty('visibility') !== 'none'
    const value = enabled ? 'none' : 'visible';

    // Use map.setLayoutProperty to ensure redraw of map
    getMap().setLayoutProperty(layer.id, 'visibility', value);
  });
}

export function toggleDatasetLayer(
  datasetLayer: VectorDatasetLayer | RasterDatasetLayer | undefined
) {
  if (datasetLayer === undefined) {
    throw new Error(`Could not toggle undefined layer`);
  }

  const existingDatasetLayer = _datasetLayerManager.value.find(
    (l) => l.id === datasetLayer.id && l.type === datasetLayer.type
  );

  // If layer doesn't exist, create map layer and update visible layers, to ensure it's stored in state correctly.
  if (!existingDatasetLayer) {
    createMapLayer(datasetLayer);
    updateVisibleMapLayers();
    return;
  }

  // Only call this if the layer already exists, as otherwise it will have the opposite effect
  toggleDatasetLayerVisibility(datasetLayer);
}

export function getDataObjectForDatasetLayer(
  datasetLayer: VectorDatasetLayer | RasterDatasetLayer | undefined
): Dataset | DerivedRegion | undefined {
  // Data Object refers to the original object for which this map layer was created.
  // Can either be a Dataset or a DerivedRegion.
  if (datasetLayer === undefined) {
    throw new Error(`Could not get data object for undefined layer`);
  }

  if (datasetLayer.derived_region_id) {
    return availableDerivedRegions.value?.find(
      (r) => r.id === datasetLayer.derived_region_id
    );
  } else if (datasetLayer.dataset_id) {
    const dataset = availableDatasets.value?.find(
      (d) => d.id === datasetLayer.dataset_id
    );
    if (dataset) {
      dataset.current_layer_index =
        dataset?.map_layers?.find(({ id }) => id === datasetLayer.id)?.index || 0;
    }
    return dataset;
  }
  return undefined;
}

export async function getDatasetLayerForDataObject(
  dataObject: Dataset | DerivedRegion | undefined,
  layerIndex = 0
): Promise<VectorDatasetLayer | RasterDatasetLayer | undefined> {
  // Data Object refers to the original object for which this map layer was created.
  // Can either be a Dataset or a DerivedRegion.
  if (dataObject === undefined) {
    throw new Error(`Could not get map layer for undefined data object`);
  }
  const datasetLayer = dataObject.map_layers?.find(
    ({ index }) => index === layerIndex
  );
  if (!datasetLayer) {
    throw new Error(
      `No dataset layer with index ${layerIndex} exists for ${dataObject}.`
    );
  }
  dataObject.current_layer_index = layerIndex;
  return await getOrCreateLayerFromID(datasetLayer.id, datasetLayer.type);
}

export function updateVisibleMapLayers() {
  selectedDatasetLayers.value = _datasetLayerManager.value.filter(isDatasetLayerVisible);

  selectedDatasetLayers.value.sort(
    (a, b) => b.openlayer.getZIndex() - a.openlayer.getZIndex()
  );

  if (!availableDatasets.value) {
    selectedDatasets.value = [];
  } else {
    selectedDatasets.value = availableDatasets.value.filter((d) => {
      return selectedDatasetLayers.value.some(
        (l) => getDataObjectForDatasetLayer(l) === d
      );
    });
  }

  // Set selected derived regions
  const available = availableDerivedRegions.value || [];
  selectedDerivedRegions.value = available.filter((d) => {
    return selectedDatasetLayers.value.some(
      (l) => getDataObjectForDatasetLayer(l) === d
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

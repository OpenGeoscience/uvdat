import { CircleLayerSpecification, DataDrivenPropertyValueSpecification, LayerSpecification, LineLayerSpecification, MapGeoJSONFeature, MapLayerMouseEvent, RasterTileSource } from 'maplibre-gl'
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
  isNonNullObject,
  isUserLayer,
  UserLayer,
} from "./types";
import { getDatasetLayer } from "./api/rest";
import { getMap } from "./storeFunctions";
import { baseURL } from "@/api/auth";
import { cacheRasterData, createStyle, setRasterTooltipValue, randomColor, rasterTooltipDataCache, valueAtCursor } from "./utils";
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
  clickedFeature,
  showMapTooltip,
  tooltipOverlay,
  rasterTooltipValue,
  clickedDatasetLayer,
  clickedFeatureCandidates,
} from "./store";
import CircleStyle from "ol/style/Circle";

const _datasetLayerManager = ref<(VectorDatasetLayer | RasterDatasetLayer)[]>([]);


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
  result.push(randomColor());

  return result as DataDrivenPropertyValueSpecification<string>;
};

const getCircleRadius = () => {
  const result = [];
  result.push('interpolate');
  result.push(['linear']);
  result.push(['zoom']);

  // Static until zoom 7, that increases as you zoom in past there
  result.push(1); result.push(5);
  result.push(7); result.push(5);
  result.push(22); result.push(10);

  return result as DataDrivenPropertyValueSpecification<number>;
}

function getCircleStyle() {
  const style: CircleLayerSpecification['paint'] = {};

  // TODO: Set fallback opacity to existing value
  style['circle-opacity'] = [
    "case",
    ["in", ["get", "node_id"], ["literal", deactivatedNodes.value]],
    0.2,
    1,
  ];
  style['circle-stroke-opacity'] = [
    "case",
    ["in", ["get", "node_id"], ["literal", deactivatedNodes.value]],
    0.2,
    1,
  ];

  const gcc = currentNetworkGCC.value || [];
  style['circle-stroke-color'] = [
    "case",
    // If node is part of GCC, set its stroke color to yellow
    ["in", ["get", "node_id"], ["literal", gcc]],
    'yellow',

    // else, set it to its normal color
    [
      "case",
      ['has', 'colors'],
      [
        'let',
        'firstColor',
        ['slice', ['get', 'colors'], 0, 7], // assuming each color is in the format '#RRGGBB'
        ['to-color', ['var', 'firstColor']]
      ],
      'black' // fallback if no color is specified on feature
    ]
  ];
  return style;
}

function getLineStyle() {
  const style: LineLayerSpecification['paint'] = {};
  const gcc = currentNetworkGCC.value || [];

  style['line-color'] = [
    "case",
    [
      "all",
      // If node is part of GCC, set its stroke color to yellow
      ["in", ["get", "from_node_id"], ["literal", gcc]],
      ["in", ["get", "to_node_id"], ["literal", gcc]],
    ],
    'yellow',

    // else, set it to its normal color
    [
      "case",
      ['has', 'colors'],
      [
        'let',
        'firstColor',
        ['slice', ['get', 'colors'], 0, 7], // assuming each color is in the format '#RRGGBB'
        ['to-color', ['var', 'firstColor']]
      ],
      'black' // fallback if no color is specified on feature
    ]
  ]

  return style;
}

const getLineWidth = () => {
  const result = [];
  result.push('interpolate');
  result.push(['linear']);
  result.push(['zoom']);

  // Large stroke width zoomed out, that decreases as you zoom in
  result.push(5); result.push(10);
  result.push(7); result.push(5);
  result.push(10); result.push(5);

  return result as DataDrivenPropertyValueSpecification<number>;

};

const getRegionLineWidth = () => {
  const result = [];
  result.push('interpolate');
  result.push(['linear']);
  result.push(['zoom']);

  // Small stroke width zoomed out, that increases as you zoom in
  result.push(1); result.push(1);
  result.push(10); result.push(1);
  result.push(14); result.push(2);
  result.push(22); result.push(10);

  return result as DataDrivenPropertyValueSpecification<number>;
};

export function generateMapLayerId(datasetLayer: VectorDatasetLayer | RasterDatasetLayer, type: LayerSpecification['type'], suffix: string = ''): string {
  const suffixStr = suffix ? `-${suffix}` : '';
  if (isVectorDatasetLayer(datasetLayer)) {
    return `map-layer-${datasetLayer.id}-vector-tile-${type}${suffixStr}`;
  }

  if (isRasterDatasetLayer(datasetLayer)) {
    return `map-layer-${datasetLayer.id}-raster-tile-${type}${suffixStr}`;
  }

  throw new Error('Unsupported map layer type');
}


export async function createMapLayer(datasetLayer: VectorDatasetLayer | RasterDatasetLayer) {
  if (isVectorDatasetLayer(datasetLayer)) {
    createVectorTileLayer(datasetLayer);
  } else if (isRasterDatasetLayer(datasetLayer)) {
    createRasterTileLayer(map.value!, datasetLayer);
    styleRasterDatasetLayer(datasetLayer, {});
    cacheRasterData(datasetLayer);
  } else {
    throw new Error("Unsupported map layer type.");
  }

  // Check for existing layer
  const existingLayer = _datasetLayerManager.value.find(
    (l) => l.id === datasetLayer.id && l.type === datasetLayer.type
  );
  if (!existingLayer) {
    _datasetLayerManager.value.push(datasetLayer);
  }
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
  createMapLayer(datasetLayer);
  return datasetLayer;
}


export function handleLayerClick(e: MapLayerMouseEvent) {
  if (!e.features) {
    return;
  }

  // While multiple features may be clicked in the same layer, just choose the first one.
  // Our functions operate at the granularity of a single layer, so it would make no difference.
  const feature = e.features[0];
  clickedFeatureCandidates.push({
    feature,
    pos: e.lngLat,
  });
}


export function createVectorTileLayer(datasetLayer: VectorDatasetLayer) {
  const defaultColors = `${randomColor()},#ffffff`;

  const map = getMap();

  const sourceId = `vector-tile-source-${datasetLayer.id}`;
  map.addSource(sourceId, {
    type: 'vector',
    tiles: [`${baseURL}vectors/${datasetLayer.id}/tiles/{z}/{x}/{y}/`],
  });

  const startingOpacity = ['region', 'flood'].includes(datasetLayer.dataset_category) ? 0.6 : 1;

  // Add fill layer, filtered to polygon geometries
  const fillLayerId = generateMapLayerId(datasetLayer, 'fill');
  map.addLayer({
    id: fillLayerId,
    type: 'fill',
    source: sourceId,
    "source-layer": 'default',
    "filter": ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
    metadata: {
      id: datasetLayer.id,
      type: datasetLayer.type,
    },
    layout: {
      visibility: 'visible',
    },
    paint: {
      "fill-color": getAnnotationColor(),
      "fill-opacity": startingOpacity,
    },
  });

  // Add line layer
  const lineLayerId = generateMapLayerId(datasetLayer, 'line');
  map.addLayer({
    id: lineLayerId,
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
      "line-width": datasetLayer.dataset_category === "region" ? getRegionLineWidth() : getLineWidth(),
      "line-opacity": startingOpacity,
    },
  });


  // Add circle layer, filtered to point geometries. If not filtered,
  // this will add a circle at the vertices of all lines.
  // This should be added LAST, as it has click priority over the other layer types.
  const circleLayerId = generateMapLayerId(datasetLayer, 'circle');
  map.addLayer({
    id: circleLayerId,
    type: "circle",
    source: sourceId,
    metadata: {
      id: datasetLayer.id,
      type: datasetLayer.type,
    },
    "source-layer": "default",
    "filter": ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
    paint: {
      'circle-color': getAnnotationColor(),
      'circle-opacity': startingOpacity,
      'circle-stroke-color': getAnnotationColor(),
      'circle-stroke-opacity': startingOpacity,
      'circle-stroke-width': 2,
      'circle-radius': getCircleRadius(),
    },
    layout: {
      visibility: 'visible',
    },
  });

  // Add events to map
  map.on('click', fillLayerId, handleLayerClick);
  map.on('click', lineLayerId, handleLayerClick);
  map.on('click', circleLayerId, handleLayerClick);
}

export function styleNetworkVectorTileLayer(
  datasetLayer: VectorDatasetLayer,
  options: {
    showGCC?: boolean;
    translucency?: string;
  } = {}
) {
  const mapLayers = findExistingMapLayers(datasetLayer);
  if (!mapLayers.length) {
    throw new Error(`No map layers found for dataset layer ${datasetLayer.id}`);
  }

  const circleLayer = mapLayers.find((l) => l.type === 'circle');
  const lineLayer = mapLayers.find((l) => l.type === 'line');
  if (!circleLayer || !lineLayer) {
    throw new Error(`line and circle layers not found in dataset layer ${datasetLayer.id}`);
  }

  const map = getMap();

  // Set circle layer style
  const circleStyle = getCircleStyle();
  Object.entries(circleStyle).forEach(([key, value]) => {
    map.setPaintProperty(circleLayer.id, key, value);
  });

  // Set line layer style
  const newLineStyle = getLineStyle();
  Object.entries(newLineStyle).forEach(([key, value]) => {
    map.setPaintProperty(lineLayer.id, key, value);
  });
}

export function createRasterTileLayer(map: Map, datasetLayer: RasterDatasetLayer) {
  const sourceId = `raster-tile-source-${datasetLayer.id}`;
  map.addSource(sourceId, {
    type: 'raster',
    tiles: [],  // tile source is set later
  });

  const layerId = generateMapLayerId(datasetLayer, 'raster');
  map.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
    metadata: {
      id: datasetLayer.id,
      type: datasetLayer.type,
      default_style: datasetLayer.default_style,
    },
  });
}

export function createRasterLayerPolygonMask(rasterLayer: RasterDatasetLayer) {
  const cached = rasterTooltipDataCache[rasterLayer.id];
  if (!cached) {
    throw new Error("DATA NOT FOUND");
  }

  const { sourceBounds } = cached;
  const { xmin, xmax, ymin, ymax } = sourceBounds;
  const sourceId2 = `raster-tile-source-${rasterLayer.id}-invisible-bounds`

  const map = getMap();
  map.addSource(sourceId2, {
    type: 'geojson',
    data: {
      type: 'Polygon',
      coordinates: [
        [
          [xmin, ymin],  // same coordinate to close the polygon
          [xmin, ymax],
          [xmax, ymax],
          [xmax, ymin],
          [xmin, ymin],  // same coordinate to close the polygon
        ]
      ]
    }
  });

  const layerId = generateMapLayerId(rasterLayer, 'raster', 'polygon-mask');
  map.addLayer({
    id: layerId,
    type: 'fill',
    source: sourceId2,
    paint: {
      "fill-opacity": 0,
    },
  });

  // If moving over layer, display tooltip
  map.on("mousemove", layerId, (e) => {
    setRasterTooltipValue(e, rasterLayer.id);
  });

  // If layer is left, remove it
  map.on("mouseleave", layerId, (e) => {
    rasterTooltipValue.value = undefined;

    // Only disable the map tooltip if there's not a feature currently being shown
    if (!clickedFeature.value) {
      showMapTooltip.value = false;
    }
  });
}

export function styleRasterDatasetLayer(
  rasterLayer: RasterDatasetLayer,
  options: {
    colormap?: {
      palette?: string;
      range?: number[];
    };
    nodata?: number;
  }
) {
  const layerProperties = rasterLayer.metadata as Record<string, unknown>
  const defaultStyle = rasterLayer.default_style as Record<string, unknown> | undefined;
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
  if (Array.isArray(colormapRange) && colormapRange?.length == 2) {
    tileParams.min = colormapRange[0];
    tileParams.max = colormapRange[1];
  }
  if (typeof nodataValue === 'string') {
    tileParams.nodata = nodataValue;
  }
  // openLayer.setProperties(Object.assign(openLayer.getProperties(), tileParams));
  const tileParamString = new URLSearchParams(tileParams).toString();

  const mapLayers = findExistingMapLayers(rasterLayer);
  if (!mapLayers.length) {
    throw new Error(`No map layers found for raster dataset layer ${rasterLayer.id}`);
  }

  // Set source tiles url
  const sourceLayerId = mapLayers[0].source;
  const source = map.value!.getSource(sourceLayerId) as RasterTileSource;
  source.setTiles([`${baseURL}rasters/${rasterLayer.id}/tiles/{z}/{x}/{y}.png/?${tileParamString}`])
}

export function findExistingMapLayers(datasetLayer: VectorDatasetLayer | RasterDatasetLayer) {
  const map = getMap();

  // Use non-null assertion, since we know layers returned from getLayersOrder will be found
  const layers = map.getLayersOrder().map((id: string) => map.getLayer(id)!);
  const filtered = layers.filter(
    (layer) => (
      isUserLayer(layer)
      && layer.metadata.id === datasetLayer.id
      && layer.metadata.type === datasetLayer.type
    )
  );

  return filtered as UserLayer[];
}

export function datasetLayerFromMapLayerID(id: string): VectorDatasetLayer | RasterDatasetLayer | undefined {
  const map = getMap();
  const layer = map.getLayer(id);
  if (layer === undefined) {
    throw new Error(`Map layer with ID ${id} not found!`);
  }

  if (!isUserLayer(layer)) {
    throw new Error(`Map layer with ID ${id} missing user layer properties!`);
  }

  return selectedDatasetLayers.value.find(
    (dsl) => dsl.id === layer.metadata.id && dsl.type === layer.metadata.type
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


export function toggleDatasetLayerVisibility(datasetLayer: VectorDatasetLayer | RasterDatasetLayer, moveLayer: boolean = true) {
  const mapLayers = findExistingMapLayers(datasetLayer);
  const map = getMap();
  mapLayers.forEach((layer) => {
    const enable = layer.getLayoutProperty('visibility') === 'none'
    const value = enable ? 'visible' : 'none';

    // Move layer to top of layers if it's being enabled
    if (enable && moveLayer) {
      map.moveLayer(layer.id);
    }

    // Use map.setLayoutProperty to ensure redraw of map
    map.setLayoutProperty(layer.id, 'visibility', value);
  });
}

export async function toggleDatasetLayer(
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
    await createMapLayer(datasetLayer);
  } else {
    // Only call this if the layer already exists, as otherwise it will have the opposite effect
    toggleDatasetLayerVisibility(datasetLayer);
  }

  // This must be called to update selectedDatasetLayers
  updateVisibleMapLayers();
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

/**
 * TODO: Clean up this function and separate out concerns, because it's awful
 * First, this function is being used to pick up changes in _datasetLayerManager and propogate them to selectedDatasetLayers. This needs to be fixed.
 * Second, it's being used to set selectedDatasets and selectedDerivedRegions. Also fix this.
 * Third, it's being used to set the order of `selectedDatasetLayers` from the map data. This is the most okay thing here,
 *    but it should really be the other way around. The map layers should be set from the selected dataset layers.
 */
export function updateVisibleMapLayers() {
  selectedDatasetLayers.value = _datasetLayerManager.value.filter(isDatasetLayerVisible);

  // Separate dataset map layers from background layers provided by map tiler.
  const datasetMapLayers = getMap().getLayersOrder().map((id) => getMap().getLayer(id)!).filter((layer) => isUserLayer(layer));

  // Create mapping from dataset layer ID to it's highest map index (the highest index of any of its layers)
  const indexMap = datasetMapLayers.reduce((acc, cur, index) => ({ ...acc, [cur.metadata.id]: index }), {}) as Record<number, number>;

  // Because
  selectedDatasetLayers.value.sort((a, b) => indexMap[b.id] - indexMap[a.id])

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
  const map = getMap();
  map.getLayersOrder().forEach((id) => {
    const layer = map.getLayer(id);

    // Operate only on base layers
    if (layer === undefined || isUserLayer(layer)) {
      return;
    }

    const visibility = showMapBaseLayer.value ? 'visible' : 'none';
    map.setLayoutProperty(layer.id, 'visibility', visibility);
  });
}

export function clearMapLayers() {
  const map = getMap();
  map.getLayersOrder().forEach((id) => {
    const layer = map.getLayer(id);

    // Operate only on user layers
    if (layer === undefined || !isUserLayer(layer)) {
      return;
    }

    // Set layer to not visible
    map.setLayoutProperty(layer.id, 'visibility', 'none');
  });

  // Set current dataset to none and update layers
  currentDataset.value = undefined;
  updateVisibleMapLayers();
}

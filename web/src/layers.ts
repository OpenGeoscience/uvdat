import GeoJSON from "ol/format/GeoJSON.js";
import TileLayer from "ol/layer/Tile";
import XYZSource from "ol/source/XYZ.js";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import { TileCoord } from "ol/tilecoord";
import { Circle, Stroke, Style } from "ol/style";
import { Feature } from "ol";

import { ref } from "vue";
import {
  Dataset,
  DerivedRegion,
  RasterMapLayer,
  isRasterMapLayer,
  VectorMapLayer,
  isVectorMapLayer,
  AbstractMapLayer,
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
} from "./store";
import CircleStyle from "ol/style/Circle";

const _mapLayerManager = ref<(VectorMapLayer | RasterMapLayer)[]>([]);

export async function getOrCreateLayerFromID(
  mapLayerId: number | undefined,
  mapLayerType: string | undefined
): Promise<VectorMapLayer | RasterMapLayer | undefined> {
  if (mapLayerId === undefined || mapLayerType === undefined) {
    throw new Error(`Could not get or create openLayer for undefined layer`);
  }

  let cachedMapLayer = _mapLayerManager.value.find((l) => {
    return l.id === mapLayerId && l.type === mapLayerType;
  });
  if (cachedMapLayer) return cachedMapLayer;

  const mapLayer = await getMapLayer(mapLayerId, mapLayerType);
  if (isVectorMapLayer(mapLayer)) {
    mapLayer.openlayer = createVectorOpenLayer(mapLayer);
  } else if (isRasterMapLayer(mapLayer)) {
    mapLayer.openlayer = createRasterOpenLayer(mapLayer);
    styleRasterOpenLayer(mapLayer.openlayer, {});
    cacheRasterData(mapLayerId);
  }
  mapLayer.openlayer.setZIndex(selectedMapLayers.value.length);

  // since this is an async context, check again for existing layer before pushing.
  cachedMapLayer = _mapLayerManager.value.find((l) => {
    return l.id === mapLayerId && l.type === mapLayerType;
  });
  if (!cachedMapLayer) {
    _mapLayerManager.value.push(mapLayer);
  }
  return mapLayer;
}

export function createVectorOpenLayer(mapLayer: VectorMapLayer) {
  const defaultColors = `${randomColor()},#ffffff`;
  return new VectorTileLayer({
    properties: {
      id: mapLayer.id,
      type: mapLayer.type,
    },
    style: (feature) =>
      createStyle({
        type: feature.getGeometry()?.getType(),
        colors: feature.getProperties().colors || defaultColors,
      }),
    source: new VectorTileSource({
      maxZoom: Math.max(
        ...Object.keys(mapLayer.tile_extents).map((z) => Number(z))
      ),
      format: new GeoJSON(),
      tileUrlFunction: (tileCoord: TileCoord) => {
        const [z, x, y] = tileCoord;
        const entry = mapLayer.tile_extents[z];
        if (!entry) {
          return undefined;
        }

        // Ensure current x/y is within zoom level extent
        const { min_x, min_y, max_x, max_y } = entry;
        if (!(min_x <= x && x <= max_x && min_y <= y && y <= max_y)) {
          return undefined;
        }

        return `${baseURL}vectors/${mapLayer.id}/tiles/${z}/${x}/${y}/`;
      },
    }),
  });
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
              .getColor()
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

export function createRasterOpenLayer(mapLayer: RasterMapLayer) {
  return new TileLayer({
    properties: {
      id: mapLayer.id,
      type: mapLayer.type,
      default_style: mapLayer.default_style,
    },
    source: new XYZSource(),
  });
}

export function styleRasterOpenLayer(
  openLayer: TileLayer<XYZSource>,
  options: {
    colormap?: {
      palette?: string;
      range?: number[];
    };
    nodata?: number;
  }
) {
  const layerProperties = openLayer.getProperties();
  const defaultStyle = layerProperties.default_style;
  const colormapPalette =
    options?.colormap?.palette || defaultStyle.palette || "terrain";
  const colormapRange = options?.colormap?.range || defaultStyle.data_range;
  const nodataValue = options.nodata || defaultStyle.transparency_threshold;

  const tileParams: Record<string, string> = {
    projection: "EPSG:3857",
    band: "1",
  };
  if (colormapPalette) tileParams.palette = colormapPalette;
  if (colormapRange?.length == 2) {
    tileParams.min = colormapRange[0];
    tileParams.max = colormapRange[1];
  }
  if (nodataValue) tileParams.nodata = nodataValue;
  openLayer.setProperties(Object.assign(openLayer.getProperties(), tileParams));
  const tileParamString = new URLSearchParams(tileParams).toString();
  openLayer
    .getSource()
    ?.setUrl(
      `${baseURL}rasters/${layerProperties.id}/tiles/{z}/{x}/{y}.png/?${tileParamString}`
    );
}

export function findExistingOpenLayer(mapLayer: AbstractMapLayer | undefined) {
  if (mapLayer === undefined) {
    throw new Error(`Could not find existing openlayer for undefined layer`);
  }

  // Find existing on map
  return getMap()
    .getLayers()
    .getArray()
    .find((l) => {
      return l.getProperties().id === mapLayer.id;
    });
}

export function isMapLayerVisible(
  mapLayer: AbstractMapLayer | undefined
): boolean {
  if (mapLayer === undefined) {
    throw new Error(`Could not determine visibility of undefined layer`);
  }

  const existing = findExistingOpenLayer(mapLayer);
  if (!existing) return false;
  return existing.getVisible();
}

export function toggleMapLayer(mapLayer: AbstractMapLayer | undefined) {
  if (mapLayer === undefined) {
    throw new Error(`Could not toggle undefined layer`);
  }

  const existing = findExistingOpenLayer(mapLayer);
  if (existing) {
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
        dataset?.map_layers.find(({ id }) => id === mapLayer.id)?.index || 0;
    }
    return dataset;
  }
  return undefined;
}

export async function getMapLayerForDataObject(
  dataObject: Dataset | DerivedRegion | undefined,
  layerIndex = 0
): Promise<AbstractMapLayer | undefined> {
  // Data Object refers to the original object for which this map layer was created.
  // Can either be a Dataset or a DerivedRegion.
  if (dataObject === undefined) {
    throw new Error(`Could not get map layer for undefined data object`);
  }
  const mapLayer = dataObject.map_layers.find(
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

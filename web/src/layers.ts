import { Layer } from "ol/layer";
import { getUid } from "ol/util";
import VectorLayer from "ol/layer/Vector";
import TileLayer from "ol/layer/Tile";
import VectorSource from "ol/source/Vector";
import type UrlTileSource from "ol/source/UrlTile";
import GeoJSON from "ol/format/GeoJSON.js";
import XYZSource from "ol/source/XYZ.js";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile.js";
import Feature from "ol/Feature";
import { LineString, Point } from "ol/geom";
import { fromLonLat } from "ol/proj";

import {
  activeMapLayerIds,
  networkVis,
  showMapBaseLayer,
  availableDataSourcesTable,
  getMap,
} from "@/store";
import { createStyle, cacheRasterData, getNetworkFeatureStyle } from "@/utils";
import { baseURL } from "@/api/auth";
import type { Dataset, NetworkNode } from "@/types";
import type { MapDataSource } from "@/data";
import BaseLayer from "ol/layer/Base";

export function getMapLayerById(layerId: string): BaseLayer | undefined {
  return getMap()
    .getLayers()
    .getArray()
    .find((layer) => getUid(layer) === layerId);
}

export function getDataSourceFromLayerId(
  layerId: string
): MapDataSource | undefined {
  const layer = getMapLayerById(layerId);
  const dsId: string | undefined = layer?.get("dataSourceId");
  if (dsId === undefined) {
    throw new Error(`Data Source ID not present on layer ${layerId}`);
  }

  return availableDataSourcesTable.value.get(dsId);
}

export function getMapLayerFromDataSource(
  source: MapDataSource
): BaseLayer | undefined {
  return getMap()
    .getLayers()
    .getArray()
    .find((layer) => layer.get("dataSourceId") === source.uid);
}

/** Returns if a layer should be enabled based on showMapBaseLayer, activeMapLayerIds, and networkVis */
export function getLayerEnabled(layer: BaseLayer) {
  // Check if layer is map base layer
  if (layer.getProperties().baseLayer) {
    return showMapBaseLayer.value;
  }

  // Check if layer is enabled
  const layerId = getUid(layer);
  let layerEnabled = activeMapLayerIds.value.includes(layerId);

  // Ensure that if networkVis is enabled, only the network layer is shown (not the original layer)
  const layerDatasetId = getDataSourceFromLayerId(layerId)?.dataset?.id;
  if (networkVis.value && networkVis.value.id === layerDatasetId) {
    layerEnabled = layerEnabled && layer.get("network");
  }

  return layerEnabled;
}

/**
 * Shows/hides layers based on the getLayerEnabled function.
 *
 * Note: This only modifies layer visibility. It does not actually enable or disable any map layers directly.
 * */
export function updateVisibleLayers() {
  const layerState = {
    shown: [] as BaseLayer[],
    hidden: [] as BaseLayer[],
  };
  const allLayers = getMap().getLayers()?.getArray();
  if (!allLayers) {
    return layerState;
  }

  allLayers.forEach((layer) => {
    const layerEnabled = getLayerEnabled(layer);
    if (!layerEnabled) {
      layer.setVisible(false);
      layerState.hidden.push(layer);
      return;
    }

    // Set layer visible and z-index
    layer.setVisible(true);
    layerState.shown.push(layer);
    const layerId = getUid(layer);
    const layerIndex = activeMapLayerIds.value.findIndex(
      (id) => id === layerId
    );
    layer.setZIndex(
      layerIndex > -1 ? activeMapLayerIds.value.length - layerIndex : 0
    );
  });

  return layerState;
}

function randomColor() {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
      .slice(0, 6)
  );
}

function getObjectProperty(
  object: Record<string, unknown>,
  selector: string
): unknown {
  return selector
    .split(".")
    .filter((x) => x !== "")
    .reduce((acc, cur) => acc && (acc[cur] as Record<string, unknown>), object);
}

type VectorLayerProps = { colors?: string };
export function createVectorLayer(
  url: string,
  props?: VectorLayerProps
): Layer {
  const defaultColors = `${randomColor()},#ffffff`;
  return new VectorLayer({
    style: (feature) =>
      createStyle({
        type: feature.getGeometry()?.getType(),
        colors: props?.colors
          ? getObjectProperty(feature.getProperties(), props.colors)
          : defaultColors,
      }),
    source: new VectorSource({
      url,
      format: new GeoJSON(),
    }),
  });
}

export function createVectorTileLayer(dataset: Dataset): Layer {
  return new VectorTileLayer({
    source: new VectorTileSource({
      format: new GeoJSON(),
      url: `${baseURL}datasets/${dataset.id}/vector-tiles/{z}/{x}/{y}/`,
    }),
    style: (feature) =>
      createStyle({
        type: feature.getGeometry()?.getType(),
        colors: feature.get("colors"),
      }),
    opacity: dataset.style?.opacity || 1,
  });
}

interface RasterLayerOptions {
  palette?: string;
  min?: number;
  max?: number;
  nodata?: number;
}
interface TileParams extends RasterLayerOptions {
  band: number;
  projection: "EPSG:3857";
}

export function setRasterLayerStyle(
  layer: Layer,
  dataset: Dataset,
  options: RasterLayerOptions
) {
  let tileParams: TileParams = {
    projection: "EPSG:3857",
    band: 1,
    palette: "terrain",
  };

  // Prefill with existing source before setting new values
  const currentSource = layer.getSource() as UrlTileSource | null;
  if (currentSource === null) {
    throw new Error(`No source found on layer ${getUid(layer)}`);
  }

  // Prefill options from existing sourceUrl, if it exists
  const sourceUrl = currentSource.getUrls()?.[0];
  if (sourceUrl) {
    tileParams = {
      ...tileParams,
      ...Object.fromEntries(new URL(sourceUrl).searchParams.entries()),
    };
  }

  // Filter out undefined options
  const optionKeys = Object.keys(options) as Array<keyof RasterLayerOptions>;
  const filteredOptions: RasterLayerOptions = optionKeys
    .filter((key) => options[key] !== undefined)
    .reduce((acc, key) => ({ ...acc, [key]: options[key] }), {});

  // Combine defaults and new options
  tileParams = {
    ...tileParams,
    ...filteredOptions,
  };

  // Create query string from params object, removing any undefined values
  const tileParamString = Object.keys(tileParams)
    .filter((key) => !!tileParams[key as keyof TileParams])
    .map(
      (key) =>
        encodeURIComponent(key) +
        "=" +
        encodeURIComponent(
          tileParams[key as keyof TileParams] as string | number
        )
    )
    .join("&");

  // Set new source URL
  currentSource.setUrl(
    `${baseURL}datasets/${dataset.id}/tiles/{z}/{x}/{y}.png/?${tileParamString}`
  );
}

export function createRasterLayer(dataset: Dataset): Layer {
  cacheRasterData(dataset.id);
  const layer = new TileLayer({
    source: new XYZSource(),
    opacity: dataset.style?.opacity || 1,
  });

  // Set style
  setRasterLayerStyle(layer, dataset, {
    palette: dataset.style?.colormap,
    min: dataset.style?.colormap_range?.[0],
    max: dataset.style?.colormap_range?.[1],
    nodata: dataset.style?.options?.transparency_threshold,
  });

  return layer;
}

// TODO: Roll into addDatasetLayerToMap
export function addNetworkLayerToMap(dataset: Dataset, nodes: NetworkNode[]) {
  const source = new VectorSource();
  const features: Feature[] = [];
  const visitedNodes: number[] = [];
  nodes.forEach((node) => {
    // Add point for each node
    features.push(
      new Feature(
        Object.assign(node.properties, {
          name: node.name,
          id: node.id,
          node: true,
          geometry: new Point(fromLonLat(node.location.slice().reverse())),
        })
      )
    );

    // Add edges between adjacent nodes
    node.adjacent_nodes.forEach((adjId) => {
      if (!visitedNodes.includes(adjId)) {
        const adjNode = nodes.find((n) => n.id === adjId);
        if (adjNode === undefined) {
          return;
        }

        features.push(
          new Feature({
            connects: [node.id, adjId],
            edge: true,
            geometry: new LineString([
              fromLonLat(node.location.slice().reverse()),
              fromLonLat(adjNode.location.slice().reverse()),
            ]),
          })
        );
      }
    });
    visitedNodes.push(node.id);
  });
  source.addFeatures(features);

  const layer = new VectorLayer({
    properties: {
      // This property only exists on the manually added node network layer
      network: true,
    },
    zIndex: 99,
    style: getNetworkFeatureStyle(),
    source,
  });
  getMap().addLayer(layer);
  return layer;
}

export function addDataSourceLayerToMap(dataSource: MapDataSource) {
  let layer: Layer | undefined;
  const { dataset, derivedRegion } = dataSource;
  if (derivedRegion) {
    layer = createVectorLayer(
      `${baseURL}derived_regions/${derivedRegion.id}/as_feature/`
    );
  } else if (dataset) {
    if (dataset.category === "region") {
      layer = createVectorLayer(
        `${baseURL}datasets/${dataSource.dataset?.id}/regions`,
        { colors: "properties.colors" }
      );
    } else if (dataset.vector_tiles_file) {
      layer = createVectorTileLayer(dataset);
    } else if (dataset.geodata_file) {
      layer = createVectorLayer(dataset.geodata_file, { colors: "colors" });
    } else if (dataset.raster_file) {
      layer = createRasterLayer(dataset);
    }
  }

  if (layer === undefined) {
    throw new Error("Could not add data source to map");
  }

  // Add this to link layers to data sources
  layer.setProperties({ dataSourceId: dataSource.uid });
  getMap().addLayer(layer);
  return layer;
}

export function removeLayerFromMap(layer: BaseLayer) {
  getMap().removeLayer(layer);
  activeMapLayerIds.value = activeMapLayerIds.value.filter(
    (layerId) => layerId !== getUid(layer)
  );
}

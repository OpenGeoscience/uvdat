import { Layer } from "ol/layer";
import { getUid } from "ol/util";
import VectorLayer from "ol/layer/Vector";
import TileLayer from "ol/layer/Tile";
import VectorSource from "ol/source/Vector";
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
import type { Dataset, DerivedRegion, NetworkNode } from "@/types";
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

export function addDerivedRegionLayerToMap(region: DerivedRegion): Layer {
  const colors = `${randomColor()},#ffffff`;
  const layer = new VectorLayer({
    style: (feature) =>
      createStyle({
        type: feature.getGeometry()?.getType(),
        colors,
      }),
    source: new VectorSource({
      format: new GeoJSON(),
      url: `${baseURL}derived_regions/${region.id}/as_feature/`,
    }),
  });

  // Add to map
  getMap().addLayer(layer);
  return layer;
}

export function addDatasetLayerToMap(dataset: Dataset, zIndex: number): Layer {
  if (dataset.processing) {
    throw new Error("Cannot add un-processed dataset to map!");
  }

  let layer;

  // Add raster data
  if (dataset.raster_file) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tileParams: Record<string, any> = {
      projection: "EPSG:3857",
      band: 1,
      palette: dataset.style?.colormap || "terrain",
    };
    if (
      !dataset.style?.colormap_range !== undefined &&
      dataset.style?.colormap_range.length === 2
    ) {
      tileParams.min = dataset.style.colormap_range[0];
      tileParams.max = dataset.style.colormap_range[1];
    }
    if (dataset.style?.options?.transparency_threshold !== undefined) {
      tileParams.nodata = dataset.style.options.transparency_threshold;
    }
    const tileParamString = Object.keys(tileParams)
      .map((key) => key + "=" + tileParams[key])
      .join("&");
    layer = new TileLayer({
      source: new XYZSource({
        url: `${baseURL}datasets/${dataset.id}/tiles/{z}/{x}/{y}.png/?${tileParamString}`,
      }),
      opacity: dataset.style?.opacity || 1,
      zIndex,
    });

    cacheRasterData(dataset.id);
  } else if (dataset.geodata_file) {
    // Use VectorLayer if dataset category is "region"
    if (dataset.category === "region") {
      layer = new VectorLayer({
        zIndex,
        style: (feature) =>
          createStyle({
            type: feature.getGeometry()?.getType(),
            colors: feature.get("properties").colors,
          }),
        source: new VectorSource({
          format: new GeoJSON(),
          url: `${baseURL}datasets/${dataset.id}/regions`,
        }),
      });
    } else {
      // Use vector tiles
      layer = new VectorTileLayer({
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
        zIndex,
      });
    }
  }

  if (layer === undefined) {
    throw new Error("layer was not set!");
  }

  // Add to map
  getMap().addLayer(layer);
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
  let layer: Layer;
  if (dataSource.dataset) {
    layer = addDatasetLayerToMap(
      dataSource.dataset,
      activeMapLayerIds.value.length - 1
    );
  } else if (dataSource.derivedRegion) {
    layer = addDerivedRegionLayerToMap(dataSource.derivedRegion);
  } else {
    throw new Error("Could not add data source to map");
  }

  // Add this to link layers to data sources
  layer.setProperties({ dataSourceId: dataSource.uid });
  return layer;
}

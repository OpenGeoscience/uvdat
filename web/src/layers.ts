import { clickedFeature, mapSources, selectedLayers, showMapBaseLayer, theme } from "./store";
import { getMap } from "./storeFunctions";
import { Dataset, Layer, LayerFrame, RasterData, VectorData } from './types';
import { MapLayerMouseEvent, Source } from "maplibre-gl";
import { baseURL } from "@/api/auth";
import { THEMES } from "./themes";
import { cacheRasterData } from "./utils";
import proj4 from "proj4";

// ------------------
// Exported functions
// ------------------

export interface SourceDBObjects {
    dataset?: Dataset,
    layer?: Layer,
    frame?: LayerFrame,
    vector?: VectorData,
    raster?: RasterData,
}

export function getDBObjectsForSourceID(sourceId: string) {
    const DBObjects:  SourceDBObjects = {}
    const [
        layerId, layerCopyId, frameId, type
    ] = sourceId.split('.');
    selectedLayers.value.forEach((layer) => {
        if (layer.id === parseInt(layerId) && layer.copy_id === parseInt(layerCopyId)) {
            DBObjects.dataset = layer.dataset;
            DBObjects.layer = layer;
            layer.frames.forEach((frame) => {
                if (frame.id === parseInt(frameId)) {
                    DBObjects.frame = frame;
                    if (frame.vector && sourceId.includes("vector")) DBObjects.vector = frame.vector;
                    if (frame.raster && sourceId.includes("raster")) DBObjects.raster = frame.raster;
                }
            })
        }
    })
    return DBObjects
}

export function updateLayersShown () {
    const map = getMap();
    // reverse selected layers list for first on top
    selectedLayers.value.toReversed().forEach((layer) => {
        if (!mapSources.value[layer.id]) {
            mapSources.value[layer.id] = {}
        }
        if (!mapSources.value[layer.id][layer.copy_id]) {
            mapSources.value[layer.id][layer.copy_id] = {}
        }
        layer.frames.forEach((frame) => {
            const sourceIDPrefix = `${layer.id}.${layer.copy_id}.${frame.id}`
            if (!mapSources.value[layer.id][layer.copy_id][frame.id]) {
                const sources: Source[] = []
                if (frame.vector) {
                    const source = createVectorTileSource(frame.vector, sourceIDPrefix + '.vector')
                    if (source) sources.push(source)
                }
                if (frame.raster) {
                    const source = createRasterTileSource(frame.raster, sourceIDPrefix + '.raster')
                    if (source) sources.push(source)
                }
                mapSources.value[layer.id][layer.copy_id][frame.id] = sources
            }

            map.getLayersOrder().forEach((id) => {
                if (id !== 'base-tiles') {
                    const identifiers = id.split('.').map((s) => parseInt(s));
                    if (
                        identifiers[0] === layer.id &&
                        identifiers[1] === layer.copy_id &&
                        identifiers[2] === frame.id
                    ) {
                        map.moveLayer(id);  // handles reordering
                        map.setLayoutProperty(
                            id,
                            "visibility",
                            layer.visible && layer.current_frame === frame.index ? "visible" : "none"
                        );
                    }
                }
            });
        })
    })
    // hide any removed layers
    map.getLayersOrder().forEach((id) => {
        if (id !== 'base-tiles') {
            const identifiers = id.split('.').map((s) => parseInt(s));
            if (!selectedLayers.value.map((l) => l.id).includes(identifiers[0])) {
                map.setLayoutProperty(id, "visibility", "none");
            }
        }
    });
}

export function updateBaseLayer () {
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
}

export function clearMapLayers () {
    const map = getMap();
    map.getLayersOrder().forEach((id) => {
        if (id !== 'base-tiles') {
            map.setLayoutProperty(id, "visibility", "none");
        }
    });
}

export function datasetLayerFromMapLayerID (id: string | number) {
    const layers: Layer[] = []
    return layers;
}

export function styleNetworkVectorTileLayer (layer: Layer) {
}

export function createRasterLayerPolygonMask (raster: RasterData) {
}

export function isDatasetLayerVisible (Layer: Layer | undefined) {
    return false;
}

export function toggleDatasetLayer (Layer: Layer | undefined) {
}

// ------------------
// Internal functions
// ------------------

function createVectorTileSource(vector: VectorData, sourceId: string): Source | undefined {
    const map = getMap();
    map.addSource(sourceId, {
        type: "vector",
        tiles: [`${baseURL}vectors/${vector.id}/tiles/{z}/{x}/{y}/`],
    });
    const source = map.getSource(sourceId);
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
    map.addSource(sourceId, {
        type: "raster",
        tiles: [`${baseURL}rasters/${raster.id}/tiles/{z}/{x}/{y}.png?${tileParamString}`],
    });
    const tileSource = map.getSource(sourceId);

    const bounds = raster.metadata.bounds;
    const boundsSourceId = sourceId + '.bounds';
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
            "fill-color": getDefaultColor(),
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
            "line-color": getDefaultColor(),
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
            "circle-color": getDefaultColor(),
            "circle-opacity": 1,
            "circle-stroke-color": getDefaultColor(),
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

function handleLayerClick(e: MapLayerMouseEvent) {
    if (!e.features?.length) {
      return;
    }

    // While multiple features may be clicked in the same layer, just choose the first one.
    // Our functions operate at the granularity of a single layer, so it would make no difference.
    const feature = e.features[0];
    if (feature) {
        clickedFeature.value = {
            feature,
            pos: e.lngLat,
        };
    }
}

function getDefaultColor() {
    if (theme.value === 'dark') {
        return THEMES.dark.colors.primary;
    } else return THEMES.light.colors.primary;
}

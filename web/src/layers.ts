import {
    availableNetworks,
    rasterTooltipDataCache,
} from "./store";

import { useMapStore } from "@/store/map";
import { Dataset, Layer, LayerFrame, Network, RasterData, VectorData } from './types';
import { LngLatBoundsLike, MapLayerMouseEvent, MapMouseEvent, Source } from "maplibre-gl";
import { baseURL } from "@/api/auth";
import { getRasterDataValues, getVectorDataBounds } from "./api/rest";
import { setMapLayerStyle } from "./layerStyles";
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
    network?: Network,
}

export function getDBObjectsForSourceID(sourceId: string) {
    const DBObjects:  SourceDBObjects = {}
    const [
        layerId, layerCopyId, frameId
    ] = sourceId.split('.');
    useMapStore().selectedLayers.forEach((layer) => {
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

export function updateLayerStyles(layer: Layer) {
    const map = useMapStore().getMap();
    map.getLayersOrder().forEach((mapLayerId) => {
        if (mapLayerId !== 'base-tiles') {
            const [layerId, layerCopyId, frameId] = mapLayerId.split('.');
            if (parseInt(layerId) === layer.id && parseInt(layerCopyId) === layer.copy_id) {
                const currentStyle = useMapStore().selectedLayerStyles[`${layerId}.${layerCopyId}`];
                const frame = layer.frames.find((f) => f.id === parseInt(frameId))
                currentStyle.visible = false;
                if (frame) {
                    currentStyle.visible = layer.visible && layer.current_frame === frame.index
                }
                setMapLayerStyle(mapLayerId, currentStyle);
            }
        }
    });
}

export async function getBoundsOfVisibleLayers(): Promise<LngLatBoundsLike | undefined> {
    const mapStore = useMapStore();

    let xMinGlobal, xMaxGlobal, yMinGlobal, yMaxGlobal = undefined;
    for (let index = 0; index < mapStore.selectedLayers.length; index++) {
        const layer = mapStore.selectedLayers[index];
        if (layer.visible) {
            const currentFrame = layer.frames[layer.current_frame]
            let xmin, xmax, ymin, ymax, srs = undefined;
            if (currentFrame.raster) {
                const bounds = currentFrame.raster.metadata.bounds;
                ({xmin, xmax, ymin, ymax, srs} = bounds);
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

// ------------------
// Internal functions
// ------------------

export function createVectorTileSource(vector: VectorData, sourceId: string): Source | undefined {
    const map = useMapStore().getMap();
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

export function createRasterTileSource(raster: RasterData, sourceId: string): Source | undefined {
    const map = useMapStore().getMap();
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

function createVectorFeatureMapLayers(source: Source) {
    const map = useMapStore().getMap();
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
    const map = useMapStore().getMap();
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

async function cacheRasterData(raster: RasterData) {
    if (rasterTooltipDataCache.value[raster.id] !== undefined) {
      return;
    }
    const data = await getRasterDataValues(raster.id);
    rasterTooltipDataCache.value[raster.id] = data;
}

function handleLayerClick(e: MapLayerMouseEvent) {
    const map = useMapStore().getMap();
    const clickedFeatures = map.queryRenderedFeatures(e.point);
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
    if (feature !== useMapStore().clickedFeature?.feature) {
        useMapStore().clickedFeature = {
            feature,
            pos: e.lngLat,
        };
    }
}

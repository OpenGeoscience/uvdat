import { availableNetworks } from "./store";

import { useMapStore } from "@/store/map";
import { Dataset, Layer, LayerFrame, Network, RasterData, VectorData } from './types';
import { LngLatBoundsLike, MapLayerMouseEvent } from "maplibre-gl";
import { getVectorDataBounds } from "./api/rest";
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

export function handleLayerClick(e: MapLayerMouseEvent) {
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

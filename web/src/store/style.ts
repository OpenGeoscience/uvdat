import { defineStore } from 'pinia';
import { ref } from 'vue';
import { RasterTileSource } from "maplibre-gl";
import { Layer, MapLibreLayerMetadata, MapLibreLayerWithMetadata, Network, Style } from "@/types";
import { THEMES } from "@/themes";

import {
    useMapStore,
    useLayerStore,
    useAppStore,
} from '.';


const rasterColormaps = [
    "terrain",
    "plasma",
    "viridis",
    "magma",
    "cividis",
    "rainbow",
    "jet",
    "spring",
    "summer",
    "autumn",
    "winter",
    "coolwarm",
    "cool",
    "hot",
    "seismic",
    "twilight",
    "tab20",
    "hsv",
    "gray",
];

interface NetworkStyle {
    inactive?: number | string,
    deactivate?: number | string,
    activate?: number | string,
    gcc?: number | string,
    selected?: number | string,
    default: number | string,
}

function getRasterTilesQuery(style: Style) {
    const query: Record<string, string> = {
        projection: "EPSG:3857",
    }
    if (style.colormap) {
        query.palette = style.colormap;
        query.band = "1";
    }
    if (Array.isArray(style.colormap_range) && style.colormap_range?.length === 2) {
        query.min = style.colormap_range[0].toString();
        query.max = style.colormap_range[1].toString();
    }
    return query;
}

export const useStyleStore = defineStore('style', () => {
    const selectedLayerStyles = ref<Record<string, Style>>({});

    const mapStore = useMapStore();
    const appStore = useAppStore();
    const layerStore = useLayerStore();

    function getNextDefaultColor() {
        let colorList = THEMES.light.colors;
        if (appStore.theme === 'dark') {
            colorList = THEMES.dark.colors;
        }
        const colorNames = ['info', 'success', 'error'];
        const colors = Object.values(Object.fromEntries(
            Object.entries(colorList)
                .filter(([name,]) => colorNames.includes(name))
                .toSorted(([name,]) => colorNames.indexOf(name))
        ))
        const i = Object.keys(mapStore.mapSources).length % colors.length;
        return colors[i];
    }

    function getDefaultStyle(): Style {
        return {
            color: getNextDefaultColor(),
            opacity: 1,
            visible: true,
        }
    }

    function updateLayerStyles(layer: Layer) {
        const map = mapStore.getMap();
        map.getLayersOrder().forEach((mapLayerId) => {
            if (mapLayerId !== 'base-tiles') {
                const [layerId, layerCopyId, frameId] = mapLayerId.split('.');
                if (parseInt(layerId) === layer.id && parseInt(layerCopyId) === layer.copy_id) {
                    const currentStyle = selectedLayerStyles.value[`${layerId}.${layerCopyId}`];
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

    function setMapLayerStyle(mapLayerId: string, style: Style) {
        const map = mapStore.getMap();
        const sourceId = mapLayerId.split('.').slice(0, -1).join('.')
        const { network } = layerStore.getDBObjectsForSourceID(sourceId)
        
        const mapLayer = map.getLayer(mapLayerId) as MapLibreLayerWithMetadata | undefined;
        if (mapLayer === undefined) {
            return;
        }
        
        // Opacity can be zero, so must check for undefined explicitly
        let opacity = style.opacity;
        if (opacity === undefined) {
            opacity = 1;
        }
        
        // MultiFrame uses opacity for visibility (with visibility always set to 'visible'), while single-frame uses 'visibility'
        const { multiFrame } = mapLayer.metadata;
        if (!multiFrame) {
            map.setLayoutProperty(mapLayerId, 'visibility', style.visible ? 'visible' : 'none');
        } else if (!style.visible) {
            opacity = 0;
        }

        let color = style.color;
        if (mapLayerId.includes("fill")) {
            map.setPaintProperty(mapLayerId, 'fill-opacity', opacity / 2);
            map.setPaintProperty(mapLayerId, 'fill-color', color);
        } else if (mapLayerId.includes("line")) {
            map.setPaintProperty(mapLayerId, 'line-opacity', opacity);
            map.setPaintProperty(mapLayerId, 'line-color', color);
        } else if (mapLayerId.includes("circle")) {
            map.setPaintProperty(mapLayerId, 'circle-opacity', opacity);
            map.setPaintProperty(mapLayerId, 'circle-stroke-opacity', opacity);
            map.setPaintProperty(mapLayerId, 'circle-color', color);
            map.setPaintProperty(mapLayerId, 'circle-stroke-color', color);
        } else if (mapLayerId.includes("raster")) {
            map.setPaintProperty(mapLayerId, "raster-opacity", opacity)
            let source = map.getSource(mapLayer.source) as RasterTileSource;
            if (source?.tiles?.length) {
                const oldQuery = new URLSearchParams(source.tiles[0].split('?')[1])
                const newQuery = new URLSearchParams(getRasterTilesQuery(style));
                if (newQuery.toString() !== oldQuery.toString()) {
                    source.setTiles(source.tiles.map((url) => url.split('?')[0] + '?' + newQuery))
                }
            }
        }
        if (network?.gcc && opacity) styleNetwork(network)
    }

    function styleNetwork(network: Network) {
        const vectorId = network.vector_data;
        const gccColor = "#f7e059";
        const selectedColor = "#ffffff";
        const deactivateColor = "#7b3294";
        const activateColor = "#008837";

        const map = mapStore.getMap();
        map.getLayersOrder().forEach((mapLayerId) => {
            if (mapLayerId.includes(".vector." + vectorId)) {
                const [layerId, layerCopyId] = mapLayerId.split('.');
                const currentStyle = selectedLayerStyles.value[`${layerId}.${layerCopyId}`];
                let defaultColor = currentStyle.color || 'black'
                const colorStyle: NetworkStyle = {
                    deactivate: deactivateColor,
                    activate: activateColor,
                    gcc: gccColor,
                    selected: selectedColor,
                    default: defaultColor,
                }
                const opacityStyle = {
                    inactive: 0.4,
                    default: 1,
                }
                const featureStyles: Record<string, NetworkStyle> = {
                    'circle-opacity': opacityStyle,
                    'circle-stroke-opacity': opacityStyle,
                    'line-opacity': opacityStyle,
                    'circle-color': colorStyle,
                    'circle-stroke-color': colorStyle,
                    'line-color': colorStyle,
                }
                Object.entries(featureStyles).forEach(([styleName, style]) => {
                    const featureType = styleName.split('-')[0]
                    if (mapLayerId.includes("." + featureType)) {
                        const defaultValue = style.default;
                        const selectedValue = style.selected || style.default;
                        const gccValue = style.gcc || style.default;
                        const inactiveValue = style.inactive || style.default;
                        const deactivateValue = style.deactivate || style.default;
                        const activateValue = style.activate || style.default;
                        const deactivate = network.changes?.deactivate_nodes || [];
                        const activate = network.changes?.activate_nodes || [];
                        const inactive = network.deactivated?.nodes.filter((n) => (
                            !deactivate?.includes(n) && !activate?.includes(n)
                        )) || [];
                        let gcc = network.gcc || []
                        if (
                            !inactive.length &&
                            !deactivate.length &&
                            !activate.length &&
                            gcc.length === network.nodes.length
                        ) {
                            // Network default state; don't show GCC
                            gcc = []
                        }
                        map.setPaintProperty(
                            mapLayerId,
                            styleName,
                            [
                                "case",
                                [
                                    "any",
                                    ["in", ["get", "node_id"], ["literal", network.selected?.nodes || []]],
                                    ["in", ["get", "edge_id"], ["literal", network.selected?.edges || []]],
                                ],
                                selectedValue,
                                [
                                    "any",
                                    ["in", ["get", "node_id"], ["literal", deactivate]],
                                    ["in", ["get", "from_node_id"], ["literal", deactivate]],
                                    ["in", ["get", "to_node_id"], ["literal", deactivate]],
                                ],
                                deactivateValue,
                                [
                                    "any",
                                    ["in", ["get", "node_id"], ["literal", activate]],
                                    ["in", ["get", "from_node_id"], ["literal", activate]],
                                    ["in", ["get", "to_node_id"], ["literal", activate]],
                                ],
                                activateValue,
                                [
                                    "any",
                                    ["in", ["get", "node_id"], ["literal", inactive]],
                                    ["in", ["get", "from_node_id"], ["literal", inactive]],
                                    ["in", ["get", "to_node_id"], ["literal", inactive]],
                                ],
                                inactiveValue,
                                [
                                    "any",
                                    ["in", ["get", "node_id"], ["literal", gcc]],
                                    ["in", ["get", "from_node_id"], ["literal", gcc]],
                                    ["in", ["get", "to_node_id"], ["literal", gcc]],
                                ],
                                gccValue,
                                defaultValue,
                            ],
                        )
                    }
                })
            }
        });
    }

    return {
        selectedLayerStyles,
        getDefaultStyle,
        updateLayerStyles,
        setMapLayerStyle,
        styleNetwork,
        rasterColormaps,
    }
});

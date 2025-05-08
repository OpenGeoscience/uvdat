import { RasterTileSource } from "maplibre-gl";
import { getMap } from "./storeFunctions";
import { Network, Style } from "./types";
import { THEMES } from "./themes";
import { mapSources, selectedLayerStyles, theme } from "./store";
import { getDBObjectsForSourceID } from "./layers";

// ------------------
// Exported functions
// ------------------

export const rasterColormaps = [
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

export function getDefaultColor() {
    let colorList = THEMES.light.colors;
    if (theme.value === 'dark') {
        colorList = THEMES.dark.colors;
    }
    const colorNames = ['info', 'success', 'error'];
    const colors = Object.values(Object.fromEntries(
        Object.entries(colorList)
        .filter(([name,]) => colorNames.includes(name))
        .toSorted(([name,]) => colorNames.indexOf(name))
    ))
    const i = Object.keys(mapSources.value).length % colors.length;
    return colors[i];
}

export function setMapLayerStyle(mapLayerId: string, style: Style) {
    const map = getMap();
    const sourceId = mapLayerId.split('.').slice(0, -1).join('.')
    const { network } = getDBObjectsForSourceID(sourceId)
    let opacity = style.opacity;
    let color = style.color;
    if (!style.visible) {
        // use opacity to control visibility
        // toggling layout.visibility causes tiles to reload when layer becomes visible again
        // opacity has a smooth transition, too.
        opacity = 0;
    }
    if (opacity === undefined) opacity = 1

    const mapLayer = map.getLayer(mapLayerId);
    if (mapLayer === undefined) {
        return;
    }

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
            if(newQuery.toString() !== oldQuery.toString()) {
                source.setTiles(source.tiles.map((url) => url.split('?')[0] + '?' + newQuery))
            }
        }
    }
    if (network?.gcc && opacity) styleNetwork(network)
}

interface NetworkStyle {
    inactive?: number | string,
    deactivate?: number | string,
    activate?: number | string,
    gcc?: number | string,
    selected?: number | string,
    default: number | string,
}

export function styleNetwork(network: Network) {
    const vectorId = network.vector_data;
    const map = getMap();
    const gccColor = "#f7e059";
    const selectedColor = "#ffffff";
    const deactivateColor = "#7b3294";
    const activateColor = "#008837";
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
                if (mapLayerId.includes("."+featureType)) {
                    const defaultValue = style.default;
                    const selectedValue = style.selected || style.default;
                    const gccValue = style.gcc || style.default;
                    const inactiveValue = style.inactive || style.default;
                    const deactivateValue = style.deactivate || style.default;
                    const activateValue = style.activate || style.default;

                    const deactivate = Array.from(network.changes?.deactivate_nodes || []);
                    const activate = Array.from(network.changes?.activate_nodes || []);
                    const inactive = Array.from(network.deactivated?.nodes || []).filter((n) => (
                        !network.changes?.deactivate_nodes?.has(n) &&
                        !network.changes?.activate_nodes?.has(n)
                    ));
                    let gcc = Array.from(network.gcc || []);
                    if (
                        !inactive.length &&
                        !deactivate.length &&
                        !activate.length &&
                        gcc.length === network.nodes.size
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
                                ["in", ["get", "node_id"], ["literal", Array.from(network.selected?.nodes || [])]],
                                ["in", ["get", "edge_id"], ["literal", Array.from(network.selected?.edges || [])]],
                            ],
                            selectedValue,
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

// ------------------
// Internal functions
// ------------------

function getRasterTilesQuery(style: Style) {
    const query:  Record<string, string> = {
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

import { RasterTileSource } from "maplibre-gl";
import { getMap } from "./storeFunctions";
import { Network, Style } from "./types";
import { THEMES } from "./themes";
import { mapSources, theme } from "./store";
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
    const colorNames = ['info', 'success', 'warning', 'error'];
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
    if (network?.gcc && opacity) showGCC(network)
}

export function showGCC(network: Network) {
    const vectorId = network.vector_data;
    const map = getMap();
    const gccColor = theme.value === 'dark' ? 'white' : 'yellow';
    map.getLayersOrder().forEach((mapLayerId) => {
        if (mapLayerId.includes(".vector." + vectorId)) {
            if (mapLayerId.includes(".circle")) {
                let defaultColor = map.getPaintProperty(mapLayerId, "circle-stroke-color");
                if (Array.isArray(defaultColor)) {
                    defaultColor = defaultColor[defaultColor.length - 1]
                }
                if (network.deactivated?.nodes.length) {
                    ["circle-opacity", "circle-stroke-opacity"].forEach((key: string) => {
                        map.setPaintProperty(
                            mapLayerId,
                            key,
                            [
                                "case",
                                ["in", ["get", "node_id"], ["literal",
                                    network.deactivated?.nodes.filter((n) => !network.changes?.deactivate_nodes.includes(n))
                                ]],
                                0.4,
                                1,
                            ]
                        )
                    });
                    map.setPaintProperty(
                        mapLayerId,
                        "circle-color",
                        [
                            "case",
                            // If node is part of GCC, set to gccColor
                            ["in", ["get", "node_id"], ["literal", network.gcc]],
                            gccColor,
                            [
                                "case",
                                // If deactivating node, set to red
                                ["in", ["get", "node_id"], ["literal", network.changes?.deactivate_nodes]],
                                "red",
                                [
                                    "case",
                                    // If activating node, set to green
                                    ["in", ["get", "node_id"], ["literal", network.changes?.activate_nodes]],
                                    "green",
                                    // else, set to default color
                                    defaultColor,
                                ]
                            ]
                        ]
                    )
                } else {
                    ["circle-opacity", "circle-stroke-opacity"].forEach((key) => {
                        map.setPaintProperty(mapLayerId, key, 1)
                    })
                    map.setPaintProperty(
                        mapLayerId, "circle-color", defaultColor,
                    )
                }
            } else if (mapLayerId.includes(".line")) {
                let defaultLineColor = map.getPaintProperty(mapLayerId, "line-color");
                if (Array.isArray(defaultLineColor)) {
                    defaultLineColor = defaultLineColor[defaultLineColor.length - 1]
                }
                if (network.deactivated?.nodes.length) {
                    map.setPaintProperty(
                        mapLayerId,
                        'line-opacity',
                        [
                            "case",
                            [
                                "all",
                                // If nodes are deactivated, lower opacity
                                ["in", ["get", "from_node_id"], ["literal", network.deactivated?.nodes]],
                                ["in", ["get", "to_node_id"], ["literal", network.deactivated?.nodes]],
                            ],
                            0.4,
                            1,
                        ]
                    )
                    map.setPaintProperty(
                        mapLayerId,
                        "line-color",
                        [
                            "case",
                            [
                                "all",
                                // If node is part of GCC, set its stroke color to gccColor
                                ["in", ["get", "from_node_id"], ["literal", network.gcc]],
                                ["in", ["get", "to_node_id"], ["literal", network.gcc]],
                            ],
                            gccColor,
                            // else, set it to its normal color
                            defaultLineColor,
                        ]
                    )
                } else {
                    map.setPaintProperty(mapLayerId, "line-color", defaultLineColor)
                }
            }
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

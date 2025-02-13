import { RasterTileSource } from "maplibre-gl";
import { getMap } from "./storeFunctions";
import { Style } from "./types";
import { THEMES } from "./themes";
import { mapSources, theme } from "./store";


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
    let opacity = style.opacity;
    if (!style.visible) {
        // use opacity to control visibility
        // toggling layout.visibility causes tiles to reload when layer becomes visible again
        // opacity has a smooth transition, too.
        opacity = 0;
    }

    const mapLayer = map.getLayer(mapLayerId);
    if (mapLayer) {
        if (mapLayerId.includes("fill")) {
            if (opacity === undefined) opacity = 0.5;
            map.setPaintProperty(mapLayerId, 'fill-opacity', opacity);
        } else if (mapLayerId.includes("line")) {
            if (opacity === undefined) opacity = 1;
            map.setPaintProperty(mapLayerId, 'line-opacity', opacity);
        } else if (mapLayerId.includes("circle")) {
            if (opacity === undefined) opacity = 1;
            map.setPaintProperty(mapLayerId, 'circle-opacity', opacity);
            map.setPaintProperty(mapLayerId, 'circle-stroke-opacity', opacity);
        } else if (mapLayerId.includes("tiles")) {
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

    }
}

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

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { RasterTileSource } from "maplibre-gl";
import { ColorMap, Layer, MapLibreLayerWithMetadata, Network, StyleSpec } from "@/types";
import { THEMES } from "@/themes";
import colormap from 'colormap'

import { useMapStore, useLayerStore } from '.';
import { getVectorDataSummary } from '@/api/rest';


const getColormap = (name: string, nshades: number) => colormap({
    nshades,
    colormap: name === 'terrain' ? 'earth' : name.toLowerCase(),
    format: 'hex',
    alpha: 1
})

const colormaps: ColorMap[] = [
    'terrain', 'viridis', 'plasma', 'inferno', 'magma',
    'greys', 'greens', 'bone', 'copper', 'rainbow', 'jet', 'hsv',
    'spring', 'summer', 'autumn', 'winter', 'cool', 'hot',
].map((name) => {
    const colors = getColormap(name, 30)
    return {
        name,
        markers: colors.map((color: string, index: number) => ({
            color,
            value: index / (colors.length - 1)
        }))
    }
})

interface NetworkStyle {
    inactive?: number | string,
    deactivate?: number | string,
    activate?: number | string,
    gcc?: number | string,
    selected?: number | string,
    default: number | string,
}

function colormapMarkersSubsample(colormap: ColorMap) {
    if (colormap.discrete && colormap.n_colors) {
        const elements = [colormap.markers[0]];
        const totalItems = colormap.markers.length - 1;
        const interval = Math.floor(totalItems/(colormap.n_colors - 1));
        for (let i = 1; i < colormap.n_colors - 1; i++) {
            elements.push(colormap.markers[i * interval]);
        }
        elements.push(colormap.markers[colormap.markers.length - 1]);
        return elements;
    }
    return colormap.markers
}

function getRasterTilesQuery(styleSpec: StyleSpec) {
    let query: Record<string, any> = {}
    styleSpec.colors.forEach((colorSpec) => {
        if (colorSpec.colormap) {
            const colorQuery: Record<string, any> = {
                projection: "EPSG:3857",
            }
            if (colorSpec.colormap.range) {
                colorQuery.min = colorSpec.colormap.range[0];
                colorQuery.max = colorSpec.colormap.range[1];
            }
            if (colorSpec.colormap.discrete) {
                colorQuery.scheme = 'discrete'
            }
            colorQuery.palette = colormapMarkersSubsample(colorSpec.colormap).map((marker) => marker.color)

            if (colorSpec.name === 'all') {
                query = {...query, ...colorQuery}
            } else {
                colorQuery.band = colorSpec.name.replace('Band ', '')
                if (!query.bands) query.bands = []
                query.bands.push(colorQuery)
            }
        }
    })
    return query;
}

function getVectorColormapPaintProperty(colormap: ColorMap, propsSpec: Record<string, any>[]) {
    const colorByProp = propsSpec.find((p) => p.name === colormap?.color_by)
    if (!colorByProp) return undefined
    let interpType: any[] = ['match']
    let fallback = ['#000']
    const markers = colormapMarkersSubsample(colormap)
    const sortedValues = colorByProp.values.sort((a: any, b: any) => a - b)
    const valueColorList: any[] = [];
    if (
        !colormap.discrete &&
        sortedValues.every((v: any) => typeof(v) === 'number') &&
        sortedValues.length > markers.length
    ) {
        markers.forEach((marker: Record<string, any>, i: number) => {
            valueColorList.push(
                sortedValues[Math.floor(i / markers.length * sortedValues.length)]
            )
            valueColorList.push(marker.color)
        })
        interpType = ['interpolate', ['linear']]
        fallback = []
    } else {
        sortedValues.forEach((v: any, i: number) => {
            valueColorList.push(v),
            valueColorList.push(
                markers[Math.floor(i / sortedValues.length * markers.length)].color
            )
        })
    }
    return [
        ...interpType,
        ['get', colormap.color_by],
        ...valueColorList,
        ...fallback,
    ]
}

export const useStyleStore = defineStore('style', () => {
    const selectedLayerStyles = ref<Record<string, StyleSpec>>({});
    const selectedLayerVectorProperties = ref<Record<string, Record<string, any>>>({});

    const mapStore = useMapStore();
    const layerStore = useLayerStore();

    function getDefaultColor() {
        return THEMES.light.colors.primary;
    }

    function getDefaultStyleSpec(): StyleSpec {
        return {
            opacity: 1,
            default_frame: 0,
            colors: [
                {
                    name: 'all',
                    single_color: getDefaultColor(),
                }
            ],
            sizes: [
                {name: 'all', zoom_scaling: true, single_size: 5}
            ],
            filters: [],
        }
    }

    function updateLayerStyles(layer: Layer) {
        const map = mapStore.getMap();
        map.getLayersOrder().forEach((mapLayerId) => {
            if (mapLayerId !== 'base-tiles') {
                const [layerId, layerCopyId, frameId] = mapLayerId.split('.');
                if (parseInt(layerId) === layer.id && parseInt(layerCopyId) === layer.copy_id) {
                    const styleKey = `${layer.id}.${layer.copy_id}`
                    const currentStyleSpec: StyleSpec = selectedLayerStyles.value[styleKey];
                    const frame = layer.frames.find((f) => f.id === parseInt(frameId))
                    let visible = false;
                    if (frame) {
                        visible = layer.visible && layer.current_frame === frame.index
                    }
                    if (!selectedLayerVectorProperties.value[styleKey]) {
                        fetchVectorProperties(layer).then(() => {
                            setMapLayerStyle(mapLayerId, currentStyleSpec, visible);
                        })
                    }
                    setMapLayerStyle(mapLayerId, currentStyleSpec, visible);
                }
            }
        });
    }

    function setMapLayerStyle(mapLayerId: string, styleSpec: StyleSpec, visible: boolean) {
        const map = mapStore.getMap();
        const sourceId = mapLayerId.split('.').slice(0, -1).join('.')
        const [layerId, layerCopyId] = sourceId.split('.');
        const styleKey = `${layerId}.${layerCopyId}`
        const { network } = layerStore.getDBObjectsForSourceID(sourceId)

        const mapLayer = map.getLayer(mapLayerId) as MapLibreLayerWithMetadata | undefined;
        if (mapLayer === undefined) {
            return;
        }

        // Opacity can be zero, so must check for undefined explicitly
        let opacity = styleSpec.opacity;
        if (opacity === undefined) {
            opacity = 1;
        }

        // MultiFrame uses opacity for visibility (with visibility always set to 'visible'), while single-frame uses 'visibility'
        const { multiFrame } = mapLayer.metadata;
        if (!multiFrame) {
            map.setLayoutProperty(mapLayerId, 'visibility', visible ? 'visible' : 'none');
        } else if (!visible) {
            opacity = 0;
        }

        const vectorProperties = selectedLayerVectorProperties.value[styleKey]
        if (mapLayerId.includes("fill")) {
            map.setPaintProperty(mapLayerId, 'fill-opacity', opacity / 2);
            const propsSpec = vectorProperties?.polygons
            const colorSpec = styleSpec.colors.find((c) => ['polygons', 'all'].includes(c.name))
            if (colorSpec?.single_color) {
                map.setPaintProperty(mapLayerId, 'fill-color', colorSpec?.single_color);
            } else if (colorSpec?.colormap?.color_by && propsSpec) {
                map.setPaintProperty(mapLayerId, 'fill-color', getVectorColormapPaintProperty(colorSpec.colormap, propsSpec));
            }
        } else if (mapLayerId.includes("line")) {
            map.setPaintProperty(mapLayerId, 'line-opacity', opacity);
            const propsSpec = vectorProperties?.lines
            const colorSpec = styleSpec.colors.find((c) => ['lines', 'all'].includes(c.name))
            if (colorSpec?.single_color) {
                map.setPaintProperty(mapLayerId, 'line-color', colorSpec?.single_color);
            } else if (colorSpec?.colormap?.color_by && propsSpec) {
                map.setPaintProperty(mapLayerId, 'line-color', getVectorColormapPaintProperty(colorSpec.colormap, propsSpec));
            }
        } else if (mapLayerId.includes("circle")) {
            map.setPaintProperty(mapLayerId, 'circle-opacity', opacity);
            map.setPaintProperty(mapLayerId, 'circle-stroke-opacity', opacity);
            const propsSpec = vectorProperties?.points
            const colorSpec = styleSpec.colors.find((c) => ['points', 'all'].includes(c.name))
            if (colorSpec?.single_color) {
                map.setPaintProperty(mapLayerId, 'circle-color', colorSpec?.single_color);
                map.setPaintProperty(mapLayerId, 'circle-stroke-color', colorSpec?.single_color);
            } else if (colorSpec?.colormap?.color_by && propsSpec) {
                const paintProperty = getVectorColormapPaintProperty(colorSpec.colormap, propsSpec)
                map.setPaintProperty(mapLayerId, 'circle-color', paintProperty);
                map.setPaintProperty(mapLayerId, 'circle-stroke-color', paintProperty);
            }
        } else if (mapLayerId.includes("raster")) {
            map.setPaintProperty(mapLayerId, "raster-opacity", opacity)
            let source = map.getSource(mapLayer.source) as RasterTileSource;
            if (source?.tiles?.length) {
                const oldQuery = new URLSearchParams(source.tiles[0].split('?')[1])
                const newQuery = new URLSearchParams({
                    projection: 'epsg:3857',
                    style: JSON.stringify(getRasterTilesQuery(styleSpec))
                })
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
                // TODO: put this back when types are consistent
                // let defaultColor = currentStyle.color || 'black'
                let defaultColor = 'black'
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

    async function fetchVectorProperties(layer: Layer) {
        const styleKey = `${layer.id}.${layer.copy_id}`
        if (layer.frames.length) {
            const currentFrame = layer.frames[layer.current_frame]
            if (currentFrame.vector) {
                const summary: Record<string, Record<string, any>> = await getVectorDataSummary(currentFrame.vector.id)
                selectedLayerVectorProperties.value[styleKey] = Object.fromEntries(
                    Object.entries(summary).map(([rowName, properties]) => {
                        return [rowName, Object.entries(properties).map(([name, values]) => {
                            values = values.filter((v: any) => v)
                            let sampleLabel;
                            let range;
                            if (values.every((v: any) => typeof v === 'number')) {
                                range = [Math.min(...values), Math.max(...values)]
                                sampleLabel = `[${range[0].toFixed(1)} - ${range[1].toFixed(1)}]`
                            } else {
                                let sample = values.slice(0, 3).map((v: any) => {
                                    let str = v.toString()
                                    if (str.length > 10) return str.slice(0,5) + '...'
                                    return str
                                })
                                if (values.length > sample.length) {
                                    sample.push('...')
                                }
                                sampleLabel = `[${sample.join(', ')}]`
                            }
                            return {
                                name,
                                sampleLabel,
                                range,
                                values,
                            }
                        })]
                    })
                )
            }
        }
    }

    return {
        colormaps,
        selectedLayerStyles,
        selectedLayerVectorProperties,
        getRasterTilesQuery,
        colormapMarkersSubsample,
        getDefaultColor,
        getDefaultStyleSpec,
        updateLayerStyles,
        setMapLayerStyle,
        styleNetwork,
    }
});

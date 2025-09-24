import { defineStore } from 'pinia';
import { ref } from 'vue';
import { RasterTileSource } from "maplibre-gl";
import {
    ColorMap,
    Layer,
    LayerFrame,
    LayerStyle,
    MapLibreLayerWithMetadata,
    Network,
    PropertySummary,
    RasterData,
    StyleFilter,
    StyleSpec,
    VectorData,
} from "@/types";
import { THEMES } from "@/themes";
import colormap from 'colormap'

import { useMapStore, useLayerStore } from '.';


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
        null_color: 'transparent',
        discrete: false,
        n_colors: 5,
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

function colormapMarkersSubsample(
    colormap: ColorMap, n: number | undefined = undefined
) {
    if (!n && colormap.discrete && colormap.n_colors && colormap.markers) n = colormap.n_colors
    if (n && colormap.markers) {
        const elements = [colormap.markers[0]];
        const totalItems = colormap.markers.length - 1;
        const interval = Math.floor(totalItems / (n - 1));
        for (let i = 1; i < n - 1; i++) {
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
        const colorQuery: Record<string, any> = {}
        if (colorSpec.colormap?.markers) {
            if (colorSpec.colormap.range) {
                colorQuery.min = colorSpec.colormap.range[0];
                colorQuery.max = colorSpec.colormap.range[1];
            }
            if (colorSpec.colormap.discrete) {
                colorQuery.scheme = 'discrete'
            }
            if (colorSpec.colormap.clamp === false) {
                colorQuery.clamp = false
            }
            colorQuery.palette = colormapMarkersSubsample(colorSpec.colormap)?.map((marker) => marker.color)
        }
        if (colorSpec.name === 'all') {
            if (colorSpec.colormap && colorSpec.visible) query = colorQuery
        } else {
            if (!query.bands) query.bands = []
            colorQuery.band = colorSpec.name.replace('Band ', '')
            if (colorSpec.colormap && colorSpec.visible) query.bands.push(colorQuery)
        }
    })
    styleSpec.filters.forEach((f) => {
        if (f.apply && f.filter_by && f.include && f.list?.length === 1) {
            query[f.filter_by] = f.list[0]
        }
    })
    if (!Object.keys(query).length) return undefined
    return query;
}

function getVectorColorPaintProperty(styleSpec: StyleSpec, groupName: string, propsSpec: Record<string, PropertySummary>) {
    const colorSpec = styleSpec.colors.find((c) => [groupName, 'all'].includes(c.name))
    let baseColor: any = '#000'
    if (colorSpec?.single_color) {
        baseColor = colorSpec.single_color;
    } else if (colorSpec?.colormap?.color_by && propsSpec) {
        const colorByProp = propsSpec[colorSpec.colormap.color_by]
        if (!colorByProp) return undefined
        const range = colorByProp.range
        let nColors = colorSpec.colormap.n_colors
        if (!nColors) return undefined
        if (range && range[1] - range[0] < nColors) nColors = range[1] - range[0];
        const markers = colormapMarkersSubsample(colorSpec.colormap, nColors)
        if (!markers) return undefined
        if (range) {
            const [min, max] = range
            const valueColors = markers.map((marker) => [
                Math.round(marker.value * (max - min) + min),
                marker.color
            ])
            if (colorSpec.colormap.discrete) {
                const cases: any[] = []
                valueColors.forEach(([v, c]) => {
                    cases.push(
                        ['<=', ['get', colorSpec.colormap?.color_by], v]
                    )
                    cases.push(c)
                })
                baseColor = [
                    'case',
                    ...cases,
                    baseColor,
                ]
            } else {
                baseColor = [
                    'interpolate', ['linear'],
                    ['get', colorSpec.colormap.color_by],
                    ...valueColors.flat(),
                ]
            }
        } else {
            const valueSet = Array.from(new Set(colorByProp.value_set.filter((v) => v)))
            const sortedValues = valueSet.sort((a: any, b: any) => a - b)
            const valueColors = sortedValues.map((v, i) => {
                if (markers) {
                    return [
                        v,
                        markers[Math.ceil((i + 1) / sortedValues.length * markers.length) - 1]?.color
                    ]
                }
            }).flat()
            baseColor = [
                'match',
                ['get', colorSpec.colormap.color_by],
                ...valueColors,
                baseColor,
            ]
        }
        let nullColor = colorSpec.colormap.null_color
        if (colorSpec.colormap.null_color === 'transparent') nullColor = '#00000000'
        baseColor = [
            'case',
            ['==', ['get', colorSpec.colormap?.color_by], null],
            nullColor,
            ['==', ['get', colorSpec.colormap?.color_by], ''],
            nullColor,
            baseColor,
        ]
    }
    return baseColor;
}

function getVectorSizePaintProperty(styleSpec: StyleSpec, groupName: string, propsSpec: Record<string, PropertySummary>) {
    const zoomScalingConstant = 500;
    const sizeSpec = styleSpec.sizes.find((c) => [groupName, 'all'].includes(c.name))
    let baseSize: any = 5;
    let zoomedSize: any = undefined;
    if (sizeSpec?.single_size) {
        baseSize = sizeSpec.single_size
        if (sizeSpec.zoom_scaling) zoomedSize = baseSize * zoomScalingConstant
    } else if (sizeSpec?.size_range?.size_by && propsSpec) {
        const sizeByProp = propsSpec[sizeSpec.size_range.size_by]
        if (!sizeByProp?.range) return undefined
        const [min, max] = sizeByProp.range
        baseSize = [
            'interpolate',
            ['linear'],
            ['get', sizeSpec.size_range.size_by],
            min, sizeSpec.size_range.minimum,
            max, sizeSpec.size_range.maximum,
        ]
        if (sizeSpec.zoom_scaling) {
            zoomedSize = [...baseSize]
            zoomedSize[4] *= zoomScalingConstant
            zoomedSize[6] *= zoomScalingConstant
        }
        if (sizeSpec.size_range.null_size && !sizeSpec.size_range.null_size.transparency) {
            const nullSize = sizeSpec.size_range.null_size.size
            baseSize = [
                'case',
                ['==', ['get', sizeSpec.size_range.size_by], null],
                nullSize,
                baseSize,
            ]
            zoomedSize = [
                'case',
                ['==', ['get', sizeSpec.size_range.size_by], null],
                nullSize,
                baseSize * zoomScalingConstant,
            ]
        }
    }
    if (zoomedSize) {
        return [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            12, baseSize,
            24, zoomedSize,
        ]
    } else return baseSize
}

function getVectorVisibilityPaintProperty(styleSpec: StyleSpec, groupName: string) {
    let filters: any[] = []
    const colorSpec = styleSpec.colors.find((c) => [groupName, 'all'].includes(c.name))
    if (colorSpec && !colorSpec.visible) {
        return 0
    }
    const sizeSpec = styleSpec.sizes.find((c) => [groupName, 'all'].includes(c.name))
    if (sizeSpec?.size_range?.null_size?.transparency && sizeSpec.size_range.size_by) {
        filters.push(["==", ["get", sizeSpec.size_range.size_by], null])
        filters.push(0)
    }
    styleSpec.filters.forEach((f) => {
        if (f.apply) {
            let filter;
            if (f.list) {
                filter = ["in", ["get", f.filter_by], ["literal", f.list]]
            } else if (f.range) {
                filter = [
                    "all",
                    [">=", ["get", f.filter_by], f.range[0]],
                    ["<=", ["get", f.filter_by], f.range[1]],
                ]
            }

            if (filter) {
                if (f.include) filter = ['!', filter]
                filters.push(filter)
                filters.push(0)
            }
        }
    })
    const defaultOpacity = styleSpec.opacity;
    if (filters.length) return [
        "case",
        ...filters,
        groupName === 'polygons' ? defaultOpacity / 2 : defaultOpacity
    ]
}

export const useStyleStore = defineStore('style', () => {
    const selectedLayerStyles = ref<Record<string, LayerStyle>>({});

    const mapStore = useMapStore();
    const layerStore = useLayerStore();

    function getDefaultColor() {
        return THEMES.light.colors.primary;
    }

    function getDefaultStyleSpec(raster: RasterData | null | undefined): StyleSpec {
        let range: [number, number] | undefined;
        let absMin: number | undefined, absMax: number | undefined;
        if (raster) {
            Object.values(raster.metadata.bands).forEach(({ min, max }) => {
                if (!absMin || min < absMin) absMin = min;
                if (!absMax || max < absMax) absMax = max;
            })
        }
        if (absMin !== undefined && absMax !== undefined) {
            range = [Math.floor(absMin), Math.ceil(absMax)] as [number, number];
        }
        return {
            opacity: 1,
            default_frame: 0,
            colors: [
                {
                    name: 'all',
                    visible: true,
                    single_color: raster ? undefined : getDefaultColor(),
                    colormap: raster ? { range, color_by: 'value' } : undefined,
                }
            ],
            sizes: [
                { name: 'all', zoom_scaling: true, single_size: 5 }
            ],
            filters: [],
        }
    }

    function updateLayerStyles(layer: Layer) {
        const map = mapStore.getMap();
        const frames = layerStore.layerFrames(layer)
        const currentFrame = frames.find((f) => f.index === layer.current_frame_index)
        if (!currentFrame) return
        mapStore.getUserMapLayers().forEach((mapLayerId) => {
            const { layerId, layerCopyId, frameId } = mapStore.parseLayerString(mapLayerId);
            if (layerId === layer.id && layerCopyId === layer.copy_id) {
                if (frameId === currentFrame.id) {
                    map.setLayoutProperty(mapLayerId, 'visibility', layer.visible ? 'visible' : 'none');
                    const styleKey = `${layer.id}.${layer.copy_id}`
                    const currentStyleSpec: StyleSpec | undefined = selectedLayerStyles.value[styleKey].style_spec;
                    if (currentStyleSpec) {
                        setMapLayerStyle(
                            mapLayerId,
                            currentStyleSpec,
                            currentFrame,
                            currentFrame.vector,
                        );
                    }
                } else {
                    map.setLayoutProperty(mapLayerId, 'visibility', 'none');
                }
            }
        });
    }

    function setMapLayerStyle(
        mapLayerId: string,
        styleSpec: StyleSpec,
        frame: LayerFrame | undefined,
        vector: VectorData | null
    ) {
        const map = mapStore.getMap();
        const sourceId = mapStore.sourceIdFromMapLayerId(mapLayerId);
        const { network } = layerStore.getDBObjectsForSourceID(sourceId)

        let filters: StyleFilter[] = styleSpec.filters
        if (frame?.source_filters) {
            filters = [
                ...styleSpec.filters,
                ...Object.entries(frame.source_filters).map(([k, v]) => ({
                    filter_by: k,
                    list: [v],
                    include: true,
                    transparency: true,
                    apply: true,
                }))
            ]
        }

        const mapLayer = map.getLayer(mapLayerId) as MapLibreLayerWithMetadata | undefined;
        if (mapLayer === undefined) {
            return;
        }

        // Opacity can be zero, so must check for undefined explicitly
        let opacity = styleSpec.opacity;
        if (opacity === undefined) {
            opacity = 1;
        }

        const propsSpec = vector?.summary?.properties
        if (mapLayerId.includes("fill") && propsSpec) {
            map.setPaintProperty(mapLayerId, 'fill-opacity', opacity / 2);
            const color = getVectorColorPaintProperty(styleSpec, 'polygons', propsSpec)
            if (color) map.setPaintProperty(mapLayerId, 'fill-color', color)
            const visibility = getVectorVisibilityPaintProperty({ ...styleSpec, filters }, 'polygons')
            if (visibility !== undefined) map.setPaintProperty(mapLayerId, 'fill-opacity', visibility)
        } else if (mapLayerId.includes("line") && propsSpec) {
            map.setPaintProperty(mapLayerId, 'line-opacity', opacity);
            const color = getVectorColorPaintProperty(styleSpec, 'lines', propsSpec)
            if (color) map.setPaintProperty(mapLayerId, 'line-color', color)
            const size = getVectorSizePaintProperty(styleSpec, 'lines', propsSpec)
            if (size) map.setPaintProperty(mapLayerId, 'line-width', size)
            const visibility = getVectorVisibilityPaintProperty({ ...styleSpec, filters }, 'lines')
            if (visibility !== undefined) map.setPaintProperty(mapLayerId, 'line-opacity', visibility)
        } else if (mapLayerId.includes("circle") && propsSpec) {
            map.setPaintProperty(mapLayerId, 'circle-opacity', opacity);
            map.setPaintProperty(mapLayerId, 'circle-stroke-opacity', opacity);
            const color = getVectorColorPaintProperty(styleSpec, 'points', propsSpec)
            if (color) {
                map.setPaintProperty(mapLayerId, 'circle-color', color)
                map.setPaintProperty(mapLayerId, 'circle-stroke-color', color)
            }
            const size = getVectorSizePaintProperty(styleSpec, 'points', propsSpec)
            if (size) map.setPaintProperty(mapLayerId, 'circle-radius', size)
            const visibility = getVectorVisibilityPaintProperty({ ...styleSpec, filters }, 'points')
            if (visibility !== undefined) {
                map.setPaintProperty(mapLayerId, 'circle-opacity', visibility)
                map.setPaintProperty(mapLayerId, 'circle-stroke-opacity', visibility)
            }
        } else if (mapLayerId.includes("raster")) {
            const rasterTilesQuery = getRasterTilesQuery({...styleSpec, filters})
            if (rasterTilesQuery?.bands && !rasterTilesQuery.bands.length) opacity = 0
            map.setPaintProperty(mapLayerId, "raster-opacity", opacity)
            let source = map.getSource(mapLayer.source) as RasterTileSource;
            if (source?.tiles?.length) {
                const oldQuery = new URLSearchParams(source.tiles[0].split('?')[1])
                const newQueryParams: { projection: string, style?: string } = { projection: 'epsg:3857' }
                if (rasterTilesQuery) newQueryParams.style = JSON.stringify(rasterTilesQuery)
                const newQuery = new URLSearchParams(newQueryParams)
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
        mapStore.getUserMapLayers().forEach((mapLayerId) => {
            if (mapLayerId.includes(".vector." + vectorId)) {
                const { layerId, layerCopyId } = mapStore.parseLayerString(mapLayerId);
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

    return {
        colormaps,
        selectedLayerStyles,
        getRasterTilesQuery,
        colormapMarkersSubsample,
        getDefaultColor,
        getDefaultStyleSpec,
        updateLayerStyles,
        setMapLayerStyle,
        styleNetwork,
    }
});

<script setup lang="ts">
import _ from 'lodash';
import { computed, ref, watch } from 'vue';
import { ColorMap, Layer, LayerStyle, StyleFilter, StyleSpec } from '@/types';
import { createLayerStyle, getLayerStyles, updateLayerStyle } from '@/api/rest';
import ColormapPreview from './ColormapPreview.vue';

import { useStyleStore, useProjectStore, usePanelStore } from '@/store';
const styleStore = useStyleStore();
const projectStore = useProjectStore();
const panelStore = usePanelStore();


const props = defineProps<{
  layer: Layer;
}>();

const showMenu = ref(false);
const newNameMode = ref<'create' | 'update' | undefined>();
const newName = ref();
const tab = ref('color')
const availableStyles = ref<LayerStyle[]>();
const currentLayerStyle = ref<LayerStyle>({name: 'Default', is_default: true});
const currentStyleSpec = ref<StyleSpec>();
const rasterBands = ref<Record<number, Record<string, number | string>>>();
const currentVectorFilter = ref<StyleFilter>({include: true, transparency: true});
const currentVectorFilterProperty = ref<Record<string, any>>();

// for correct typing in template, assign to local var
const colormaps: ColorMap[] = styleStore.colormaps;

const styleKey = computed(() => {
    return `${props.layer.id}.${props.layer.copy_id}`;
})

const showRasterOptions = computed(() => {
    return props.layer.frames.some((frame) => frame.raster)
})

const showVectorOptions = computed(() => {
    return props.layer.frames.some((frame) => frame.vector)
})

const vectorProperties = computed(() => {
    return styleStore.selectedLayerVectorProperties[styleKey.value]
})

const currentVectorFilterBy = computed(() => currentVectorFilter.value.filter_by)

const dataRange = computed(() => {
    let absMin: number | undefined, absMax: number | undefined;
    props.layer.frames.forEach((frame) => {
        if (frame.raster) {
            Object.values(frame.raster.metadata.bands).forEach(({min, max}) => {
                if (!absMin || min < absMin) absMin = min;
                if (!absMax || max < absMax) absMax = max;
            })
        }
    })
    if(absMin && absMax){
        return [Math.floor(absMin), Math.ceil(absMax)] as [number, number];
    }
})

async function init() {
    if (!availableStyles.value) availableStyles.value = await getLayerStyles(props.layer.id)
    if (props.layer.default_style?.style_spec && Object.keys(props.layer.default_style.style_spec).length) {
        currentLayerStyle.value = {...props.layer.default_style};
        currentStyleSpec.value = {...props.layer.default_style.style_spec}
    } else currentStyleSpec.value = {...styleStore.selectedLayerStyles[styleKey.value]};
    fetchRasterBands()
}

function selectStyle(style: LayerStyle) {
    currentStyleSpec.value = style.style_spec
}

function getVectorPropertyValues (groupName: string, propertyName: string) {
    if (!vectorProperties.value) return
    const property = vectorProperties.value[groupName].find((p: Record<string, string>) => p.name === propertyName);
    return property?.values
}

function fetchRasterBands() {
    if (!currentStyleSpec.value) return
    if (showRasterOptions.value) {
        setRowColorMode('all', 'colormap')
        if (props.layer.frames.length) {
            const currentFrame = props.layer.frames[currentStyleSpec.value.default_frame]
            if (currentFrame.raster) {
                rasterBands.value = currentFrame.raster.metadata.bands;
            }
        }
    }
}

function setColorRows(different: boolean | null) {
    if (!currentStyleSpec.value) return
    if (different) {
        if (showRasterOptions.value && rasterBands.value) {
            const all = currentStyleSpec.value.colors.find((row) => row.name === 'all')
            const bandNames = Object.keys(rasterBands.value).map((name) => `Band ${name}`)
            currentStyleSpec.value.colors = bandNames.map((name) => {
                return { ...all, name }
            })
            bandNames.forEach((name) => setRowColorMode(name, 'colormap'))
        } else if (showVectorOptions.value) {
            const all = currentStyleSpec.value.colors.find((row) => row.name === 'all')
            currentStyleSpec.value.colors = ['polygons', 'lines', 'points'].map((name) => {
                return {  ...all, name }
            })
        }
    } else {
        currentStyleSpec.value.colors = [...styleStore.getDefaultStyleSpec().colors]
        if (showRasterOptions) setRowColorMode('all', 'colormap')
    }
}

function setRowColorMode(rowName: string, colorMode: string) {
    if (!currentStyleSpec.value) return
    currentStyleSpec.value.colors = currentStyleSpec.value.colors.map(
        (c) => {
            if (c.name === rowName) {
                if (colorMode === 'colormap') {
                    const terrain = colormaps.find((colormap: ColorMap) => colormap.name === 'terrain')
                    if (terrain && !c.colormap) return {
                        ...c,
                        colormap: {
                            ...terrain,
                            discrete: false,
                            range: dataRange.value,
                            null_color: 'transparent',
                            color_by: showRasterOptions.value ? 'value' : undefined
                        },
                        single_color: undefined,
                    }
                } else if (!c.single_color) {
                    return {...c, colormap: undefined, single_color: styleStore.getDefaultColor()}
                }
            }
            return c
        }
    )
}

function setRowColorMap(rowName: string, colormap: ColorMap) {
    if (!currentStyleSpec.value) return
    currentStyleSpec.value.colors = currentStyleSpec.value.colors.map(
        (c) => {
            if (c.name === rowName) {
                return {
                    ...c,
                    colormap: {
                        ...colormap,
                        discrete: false,
                        range: dataRange.value,
                        color_by: showRasterOptions.value ? 'value' : undefined,
                        null_color: 'transparent',
                    },
                    single_color: undefined
                }
            }
            return c
        }
    )
}

function setSizeRows(different: boolean | null) {
    if (!currentStyleSpec.value) return
    if (different) {
        if (showVectorOptions.value) {
            const all = currentStyleSpec.value.sizes.find((row) => row.name === 'all')
            if (all) {
                currentStyleSpec.value.sizes = ['polygons', 'lines', 'points'].map((name) => {
                    return {  ...all, name }
                })
            }
        }
    } else {
        currentStyleSpec.value.sizes = [...styleStore.getDefaultStyleSpec().sizes]
    }
}

function setRowSizeMode(rowName: string, sizeMode: string) {
    if (!currentStyleSpec.value) return
    currentStyleSpec.value.sizes = currentStyleSpec.value.sizes.map(
        (s) => {
            if (s.name === rowName) {
                if (sizeMode === 'single_size') {
                    return {...s, single_size: 2, size_range: undefined}
                } else if (sizeMode === 'range') {
                    return { ...s, size_range: {
                        minimum: 1,
                        maximum: 10,
                        null_size: {
                            transparency: true,
                            size: 0
                        }
                    }, single_size: undefined}
                }
            }
            return s
        }
    )
}

function updateCurrentFilterProperty() {
    if (
        vectorProperties.value &&
        vectorProperties.value['all'] &&
        currentVectorFilter.value.filter_by
    ) {
        const property = vectorProperties.value['all'].find(
            (p: Record<string, any>) => p.name === currentVectorFilter.value.filter_by
        )
        currentVectorFilter.value.list = undefined
        currentVectorFilter.value.range = undefined
        if (property?.range) currentVectorFilter.value.range = property.range
        currentVectorFilterProperty.value = property
    }
}

function applyCurrentFilter() {
    if (!currentStyleSpec.value) return
    currentStyleSpec.value.filters = [
        ...currentStyleSpec.value.filters,
        {...currentVectorFilter.value}
    ]
}

function removeFilter(filter: StyleFilter) {
    if (!currentStyleSpec.value) return
    currentStyleSpec.value.filters = currentStyleSpec.value.filters.filter(
        (f) => (
            !(f.filter_by === filter.filter_by &&
            f.include === filter.include &&
            f.list === filter.list &&
            f.range === filter.range)
        )
    )
}

function getInputWidth(value: number) {
    // With a minimum of 40 pixels, add 10 pixels for each digit shown in the input
    let width = 40;
    width += Math.round(value).toString().length * 10;
    return width + 'px';
}

function cancel() {
    if (currentLayerStyle.value.style_spec) {
        styleStore.selectedLayerStyles[styleKey.value] = currentLayerStyle.value.style_spec
    } else {
        styleStore.selectedLayerStyles[styleKey.value] = {...styleStore.getDefaultStyleSpec()}
    }
    showMenu.value = false;
}

function save() {
    if (!currentLayerStyle.value?.id || !currentStyleSpec.value) return;
    updateLayerStyle(
        currentLayerStyle.value.id,
        {
            name: newName.value || currentLayerStyle.value.name,
            is_default: currentLayerStyle.value.is_default,
            style_spec: currentStyleSpec.value,
        }
    ).then((style) => {
        currentLayerStyle.value = style;
        newName.value = undefined;
        newNameMode.value = undefined;
        // update other styles in case default overriden
        getLayerStyles(props.layer.id).then((styles) => availableStyles.value = styles)
    })
}

function saveAsNew() {
    if (!projectStore.currentProject || !currentStyleSpec.value) return;
    createLayerStyle({
        ...currentLayerStyle.value,
        name: newName.value,
        layer: props.layer.id,
        project: projectStore.currentProject.id,
        style_spec: currentStyleSpec.value,
    }).then((style: LayerStyle) => {
        currentLayerStyle.value = style;
        newName.value = undefined;
        newNameMode.value = undefined;
        // update other styles in case default overriden
        getLayerStyles(props.layer.id).then((styles) => availableStyles.value = styles)
    })
}

watch(panelStore.draggingPanel, () => {
    showMenu.value = false;
})

watch(currentStyleSpec, _.debounce(() => {
    styleStore.selectedLayerStyles[styleKey.value] = currentStyleSpec.value
    styleStore.updateLayerStyles(props.layer)
}, 100), {deep: true})

watch(showMenu, init)

watch(currentVectorFilterBy, updateCurrentFilterProperty)
</script>

<template>
    <v-menu v-model="showMenu" location="end center" :close-on-content-click="false">
        <template v-slot:activator="{ props }">
            <v-icon
                v-bind="props"
                icon="mdi-cog"
            />
        </template>
        <v-card v-if="currentStyleSpec" class="layer-style-card mt-5" color="background" width="450">
            <v-card-subtitle class="pa-2" style="background-color: rgb(var(--v-theme-surface));">
                Create or Edit Layer Style
                <span class="secondary-text">(Layer: {{ layer.name }})</span>

                <v-icon
                    icon="mdi-close"
                    style="float:right"
                    @click="cancel"
                />
            </v-card-subtitle>

            <v-card-text class="pa-2">
                <div class="d-flex mb-4" style="align-items: center; column-gap: 5px;">
                    <v-select
                        v-model="currentLayerStyle"
                        :items="availableStyles"
                        item-value="id"
                        :item-props="(item) => ({title: item.is_default ? item.name + ' (default)' : item.name})"
                        label="Layer Style"
                        density="compact"
                        no-data-text="No saved styles exist yet."
                        return-object
                        hide-details
                        @update:model-value="selectStyle"
                    ></v-select>
                    <v-icon icon="mdi-pencil" @click="newNameMode = 'update'"/>
                </div>

                <div class="d-flex mx-2">
                    <v-label>Set as default style</v-label>
                    <v-checkbox-btn v-model="currentLayerStyle.is_default" class="ml-2" />
                </div>

                <v-slider
                    v-if="props.layer.frames.length > 1"
                    :model-value="currentStyleSpec.default_frame + 1"
                    label="Default frame"
                    :max="props.layer.frames.length"
                    min="1"
                    step="1"
                    color="primary"
                    thumb-size="15"
                    track-size="8"
                    hide-details
                    type="number"
                    @update:model-value="(value: number) => {if (!currentStyleSpec) return; currentStyleSpec.default_frame = value - 1}"
                >
                    <template v-slot:append>
                        <v-text-field
                            :model-value="currentStyleSpec.default_frame + 1"
                            :max="props.layer.frames.length"
                            min="1"
                            step="1"
                            density="compact"
                            class="number-input"
                            style="width: 60px"
                            type="number"
                            hide-details
                            single-line
                            @update:model-value="(value: string) => {if (!currentStyleSpec) return; currentStyleSpec.default_frame = parseInt(value) - 1}"
                        >
                        </v-text-field>
                    </template>
                </v-slider>

                <v-slider
                    v-model="currentStyleSpec.opacity"
                    label="Opacity"
                    max="1"
                    min="0"
                    step="0.1"
                    color="primary"
                    thumb-size="15"
                    track-size="8"
                    hide-details
                    type="number"
                >
                    <template v-slot:append>
                        <v-text-field
                            :model-value="currentStyleSpec.opacity"
                            max="1"
                            min="0"
                            step="0.1"
                            density="compact"
                            class="number-input"
                            style="width: 60px"
                            type="number"
                            hide-details
                            single-line
                            @update:model-value="(v) => {if (currentStyleSpec) currentStyleSpec.opacity = parseFloat(v)}"
                        >
                        </v-text-field>
                    </template>
                </v-slider>

                <v-tabs v-model="tab" align-tabs="center" fixed-tabs density="compact">
                    <v-tab value="color">
                        <v-icon icon="mdi-palette" class="mr-1"/>
                        Color
                    </v-tab>
                    <v-tab value="size">
                        <span class="material-symbols-outlined mr-1">
                            straighten
                        </span>
                        Size
                    </v-tab>
                    <v-tab value="filters">
                        <v-icon icon="mdi-filter" class="mr-1"/>
                        Filters
                    </v-tab>
                </v-tabs>

                <v-window v-model="tab">
                    <v-window-item value="color" class="pa-2">
                        <div v-if="showRasterOptions">
                            <v-card-subtitle>Raster Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                            <v-checkbox
                                label="Different colors for each band"
                                :model-value="Array.from(currentStyleSpec.colors.keys()).length > 1"
                                density="compact"
                                class="px-5 py-0"
                                hide-details
                                @update:model-value="setColorRows"
                            />
                            <div v-for="row in currentStyleSpec.colors">
                                <v-card-subtitle class="mt-3">{{ (row.name + (row.name === 'all' ? ' bands' : '')).toUpperCase() }}</v-card-subtitle>
                                <div
                                    class="px-4 d-flex"
                                    style="flex-direction: column; row-gap: 10px;"
                                >
                                    <v-btn-toggle
                                        v-if="row.colormap"
                                        :model-value="row.colormap.discrete ? 'discrete' : 'continuous'"
                                        density="compact"
                                        color="primary"
                                        variant="outlined"
                                        divided
                                        mandatory
                                        @update:model-value="(value: string) => {if (row.colormap) row.colormap.discrete = value === 'discrete'}"
                                    >
                                        <v-btn :value="'discrete'">Discrete</v-btn>
                                        <v-btn :value="'continuous'">Continuous</v-btn>
                                    </v-btn-toggle>
                                    <v-select
                                        v-if="row.colormap"
                                        v-model="row.colormap"
                                        :items="colormaps"
                                        item-title="name"
                                        label="Colormap"
                                        density="compact"
                                        hide-details
                                        return-object
                                        @update:model-value="(v) => setRowColorMap(row.name, v)"
                                    >
                                        <template v-slot:item="{ props, item }">
                                            <v-list-item v-bind="props">
                                                <template v-slot:append>
                                                    <colormap-preview
                                                        :colormap="item.raw"
                                                        :discrete="row.colormap.discrete || false"
                                                        :nColors="-1"
                                                    />
                                                </template>
                                            </v-list-item>
                                        </template>
                                        <template v-slot:selection="{ item }">
                                            <span class="pr-15">{{ item.title }}</span>
                                            <colormap-preview
                                                :colormap="item.raw"
                                                :discrete="row.colormap.discrete || false"
                                                :nColors="-1"
                                            />
                                        </template>
                                    </v-select>
                                    <v-range-slider
                                        v-if="row.colormap && dataRange"
                                        v-model="row.colormap.range"
                                        color="primary"
                                        :min="dataRange[0]"
                                        :max="dataRange[1]"
                                        step="1"
                                        strict
                                    >
                                        <template v-slot:prepend>
                                            <v-text-field
                                                v-if="row.colormap.range"
                                                :model-value="row.colormap.range[0]"
                                                :min="dataRange[0]"
                                                :max="row.colormap.range[1]"
                                                :step="1"
                                                density="compact"
                                                class="number-input"
                                                :style="{'width': getInputWidth(row.colormap.range[0])}"
                                                type="number"
                                                hide-details
                                                single-line
                                                @update:model-value="(v) => {if (row.colormap?.range) row.colormap.range[0] = parseInt(v)}"
                                            >
                                            </v-text-field>
                                        </template>
                                        <template v-slot:append>
                                            <v-text-field
                                                v-if="row.colormap.range"
                                                :model-value="row.colormap.range[1]"
                                                :min="row.colormap.range[0]"
                                                :max="dataRange[1]"
                                                :step="1"
                                                density="compact"
                                                class="number-input"
                                                :style="{'width': getInputWidth(row.colormap.range[1])}"
                                                type="number"
                                                hide-details
                                                single-line
                                                @update:model-value="(v) => {if (row.colormap?.range) row.colormap.range[1] = parseInt(v)}"
                                            >
                                            </v-text-field>
                                        </template>
                                    </v-range-slider>
                                </div>
                            </div>
                        </div>
                        <div v-if="showVectorOptions">
                            <v-card-subtitle>Vector Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                            <v-checkbox
                                label="Different colors for each feature type"
                                :model-value="Array.from(currentStyleSpec.colors.keys()).length > 1"
                                density="compact"
                                class="px-5 py-0"
                                hide-details
                                @update:model-value="setColorRows"
                            />
                            <div v-for="row in currentStyleSpec.colors">
                                <v-card-subtitle class="mt-3">{{ (row.name + (row.name === 'all' ? ' feature types' : '')).toUpperCase() }}</v-card-subtitle>
                                <div
                                    class="px-4 d-flex"
                                    :style="row.single_color ? {alignItems: 'center'} : {flexDirection: 'column', rowGap: '10px'}"
                                >
                                    <v-btn-toggle
                                        :model-value="row.single_color ? 'single_color' : 'colormap'"
                                        density="compact"
                                        color="primary"
                                        variant="outlined"
                                        divided
                                        mandatory
                                        @update:model-value="(value: string) => setRowColorMode(row.name, value)"
                                    >
                                        <v-btn :value="'single_color'">Single Color</v-btn>
                                        <v-btn :value="'colormap'">Colormap</v-btn>
                                    </v-btn-toggle>
                                    <v-menu
                                        v-if="row.single_color"
                                        :close-on-content-click="false"
                                        open-on-hover
                                        location="end"
                                    >
                                        <template v-slot:activator="{ props }">
                                            <div
                                                v-bind="props"
                                                class="color-square"
                                                :style="{backgroundColor: row.single_color}"
                                            ></div>
                                        </template>
                                        <v-card>
                                            <v-color-picker
                                                v-model:model-value="row.single_color"
                                                mode="rgb"
                                            />
                                        </v-card>
                                    </v-menu>
                                    <v-btn-toggle
                                        v-if="row.colormap"
                                        :model-value="row.colormap.discrete ? 'discrete' : 'continuous'"
                                        density="compact"
                                        color="primary"
                                        variant="outlined"
                                        divided
                                        mandatory
                                        @update:model-value="(value: string) => {if (row.colormap) row.colormap.discrete = value === 'discrete'}"
                                    >
                                        <v-btn :value="'discrete'">Discrete</v-btn>
                                        <v-btn :value="'continuous'">Continuous</v-btn>
                                    </v-btn-toggle>
                                    <v-select
                                        v-if="row.colormap"
                                        v-model="row.colormap"
                                        :items="colormaps"
                                        item-title="name"
                                        label="Colormap"
                                        density="compact"
                                        hide-details
                                        return-object
                                        @update:model-value="(v) => setRowColorMap(row.name, v)"
                                    >
                                        <template v-slot:item="{ props, item }">
                                            <v-list-item v-bind="props">
                                                <template v-slot:append>
                                                    <colormap-preview
                                                        :colormap="item.raw"
                                                        :discrete="row.colormap.discrete || false"
                                                        :nColors="row.colormap.color_by ? getVectorPropertyValues(row.name, row.colormap.color_by)?.length : -1"
                                                    />
                                                </template>
                                            </v-list-item>
                                        </template>
                                        <template v-slot:selection="{ item }">
                                            <span class="pr-15">{{ item.title }}</span>
                                            <colormap-preview
                                                :colormap="item.raw"
                                                :discrete="row.colormap.discrete || false"
                                                :nColors="row.colormap.color_by ? getVectorPropertyValues(row.name, row.colormap.color_by)?.length : -1"
                                            />
                                        </template>
                                    </v-select>
                                    <v-select
                                        v-if="row.colormap && vectorProperties && vectorProperties[row.name]"
                                        v-model="row.colormap.color_by"
                                        :items="vectorProperties[row.name]"
                                        item-title="name"
                                        item-value="name"
                                        label="Color by Property"
                                        density="compact"
                                        hide-details
                                    >
                                        <template v-slot:item="{ props, item }">
                                            <v-list-item v-bind="props">
                                                <template v-slot:append>
                                                    <v-chip size="small" v-if="(item.raw as Record<string, any>).sampleLabel">{{ (item.raw as Record<string, any>).sampleLabel }}</v-chip>
                                                </template>
                                            </v-list-item>
                                        </template>
                                    </v-select>
                                    <div
                                        v-if="row.colormap && row.colormap.color_by"
                                        class="px-4 d-flex"
                                        style="align-items: center;"
                                    >
                                        <v-btn-toggle
                                            :model-value="row.colormap.null_color === 'transparent' ? 'transparent' : '#000000'"
                                            density="compact"
                                            color="primary"
                                            variant="outlined"
                                            divided
                                            mandatory
                                            @update:model-value="(value: string) => {if (row.colormap) row.colormap.null_color = value}"
                                        >
                                            <v-btn :value="'transparent'">Transparent</v-btn>
                                            <v-btn :value="'#000000'">Single Color</v-btn>
                                        </v-btn-toggle>
                                        <v-menu
                                            v-if="row.colormap.null_color !== 'transparent'"
                                            :close-on-content-click="false"
                                            open-on-hover
                                            location="end"
                                        >
                                            <template v-slot:activator="{ props }">
                                                <div
                                                    v-bind="props"
                                                    class="color-square"
                                                    :style="{backgroundColor: row.colormap.null_color}"
                                                ></div>
                                            </template>
                                            <v-card>
                                                <v-color-picker
                                                    v-model:model-value="row.colormap.null_color"
                                                    mode="rgb"
                                                />
                                            </v-card>
                                        </v-menu>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-window-item>
                    <v-window-item value="size" class="pa-2">
                        <div v-if="showRasterOptions">
                            <v-card-subtitle>Raster Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                            <v-card-subtitle>Size options do not apply to raster data.</v-card-subtitle>
                        </div>
                        <div v-if="showVectorOptions">
                            <v-card-subtitle>Vector Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                            <v-checkbox
                                label="Different sizes for each feature type"
                                :model-value="Array.from(currentStyleSpec.sizes.keys()).length > 1"
                                density="compact"
                                class="px-5 py-0"
                                hide-details
                                @update:model-value="setSizeRows"
                            />
                            <div v-for="row in currentStyleSpec.sizes">
                                <div class="d-flex" style="align-items: baseline;">
                                    <v-card-subtitle class="mt-3">{{ (row.name + (row.name === 'all' ? ' feature types' : '')).toUpperCase() }}</v-card-subtitle>
                                    <v-icon
                                        v-if="row.name !== 'all'"
                                        icon="mdi-information-outline"
                                        color="primary"
                                        size="small"
                                        v-tooltip="row.name === 'polygons' ? 'Border thickness' : row.name === 'lines' ? 'Line thickness' : 'Point radius'"
                                    />
                                </div>
                                <div
                                    class="px-4 d-flex"
                                    :style="row.single_size ? {alignItems: 'center'} : {flexDirection: 'column', rowGap: '10px'}"
                                >
                                    <v-btn-toggle
                                        :model-value="row.single_size ? 'single_size' : 'range'"
                                        density="compact"
                                        color="primary"
                                        variant="outlined"
                                        divided
                                        mandatory
                                        @update:model-value="(value: string) => setRowSizeMode(row.name, value)"
                                    >
                                        <v-btn :value="'single_size'">Single Size</v-btn>
                                        <v-btn :value="'range'">Range of Sizes</v-btn>
                                    </v-btn-toggle>
                                    <v-text-field
                                        v-if="row.single_size"
                                        :model-value="row.single_size"
                                        :min="1"
                                        :max="10"
                                        :step="1"
                                        density="compact"
                                        :style="{'width': getInputWidth(row.single_size)}"
                                        type="number"
                                        hide-details
                                        single-line
                                        @update:model-value="(v) => row.single_size = parseInt(v)"
                                    />
                                    <v-range-slider
                                        v-if="row.size_range"
                                        :model-value="[row.size_range.minimum, row.size_range.maximum]"
                                        color="primary"
                                        :min="1"
                                        :max="10"
                                        step="1"
                                        strict
                                        @update:model-value="([min, max]) => {if (!row.size_range) return; row.size_range.minimum = min; row.size_range.maximum = max;}"
                                    >
                                        <template v-slot:prepend>
                                            <v-text-field
                                                v-if="row.size_range"
                                                :model-value="row.size_range.minimum"
                                                :min="1"
                                                :max="row.size_range.maximum"
                                                :step="1"
                                                density="compact"
                                                class="number-input"
                                                :style="{'width': getInputWidth(row.size_range.minimum)}"
                                                type="number"
                                                hide-details
                                                single-line
                                                @update:model-value="(v) => {if (row.size_range) row.size_range.minimum = parseInt(v)}"
                                            >
                                            </v-text-field>
                                        </template>
                                        <template v-slot:append>
                                            <v-text-field
                                                v-if="row.size_range"
                                                :model-value="row.size_range.maximum"
                                                :min="row.size_range.minimum"
                                                :max="10"
                                                :step="1"
                                                density="compact"
                                                class="number-input"
                                                :style="{'width': getInputWidth(row.size_range.maximum)}"
                                                type="number"
                                                hide-details
                                                single-line
                                                @update:model-value="(v) => {if (row.size_range) row.size_range.maximum = parseInt(v)}"
                                            >
                                            </v-text-field>
                                        </template>
                                    </v-range-slider>
                                    <v-select
                                        v-if="row.size_range && vectorProperties && vectorProperties[row.name]"
                                        v-model="row.size_range.size_by"
                                        :items="vectorProperties[row.name]"
                                        item-title="name"
                                        item-value="name"
                                        label="Size by Property"
                                        density="compact"
                                        hide-details
                                    >
                                        <template v-slot:item="{ props, item }">
                                            <v-list-item v-bind="props" :disabled="!(item.raw as Record<string, any>).range">
                                                <template v-slot:append>
                                                    <v-chip size="small" v-if="(item.raw as Record<string, any>).sampleLabel">{{ (item.raw as Record<string, any>).sampleLabel }}</v-chip>
                                                </template>
                                            </v-list-item>
                                        </template>
                                    </v-select>
                                    <div
                                        v-if="row.size_range && row.size_range.size_by"
                                        class="px-4 d-flex"
                                        style="align-items: center;"
                                    >
                                        <v-btn-toggle
                                            :model-value="row.size_range.null_size?.transparency ? 'transparent' : 2"
                                            density="compact"
                                            color="primary"
                                            variant="outlined"
                                            divided
                                            mandatory
                                            @update:model-value="(value: string | number) => {if (row.size_range) {
                                                if (value === 'transparent') {row.size_range.null_size = {transparency: true, size: 0}}
                                                else {row.size_range.null_size = {transparency: true, size: value as number}}
                                            }}"
                                        >
                                            <v-btn :value="'transparent'">Transparent</v-btn>
                                            <v-btn :value="2">Single Size</v-btn>
                                        </v-btn-toggle>
                                        <v-text-field
                                            v-if="row.size_range.null_size && !row.size_range.null_size.transparency"
                                            :model-value="row.size_range.null_size.size"
                                            :min="1"
                                            :max="10"
                                            :step="1"
                                            density="compact"
                                            :style="{'width': getInputWidth(row.size_range.null_size.size)}"
                                            type="number"
                                            hide-details
                                            single-line
                                            @update:model-value="(v) => {if (row.size_range?.null_size) row.size_range.null_size.size = parseInt(v)}"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-window-item>
                    <v-window-item value="filters" class="pa-2">
                        <div v-if="showRasterOptions">
                            <v-card-subtitle>Raster Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                            <v-checkbox
                                :model-value="currentStyleSpec.filters.length === 1"
                                label="Enable Clamping"
                                density="compact"
                                hide-details
                                @update:model-value="(value: boolean | null) => {if (!currentStyleSpec) return; currentStyleSpec.filters = value ? [{filter_by: 'value', include: true, transparency: true, range: dataRange}] : []}"
                            />
                            <v-range-slider
                                v-if="currentStyleSpec.filters.length === 1 && dataRange"
                                v-model="currentStyleSpec.filters[0].range"
                                color="primary"
                                :min="dataRange[0]"
                                :max="dataRange[1]"
                                step="1"
                                strict
                            >
                                <template v-slot:prepend>
                                    <v-text-field
                                        v-if="currentStyleSpec.filters[0].range"
                                        :model-value="currentStyleSpec.filters[0].range[0]"
                                        :min="dataRange[0]"
                                        :max="currentStyleSpec.filters[0].range[1]"
                                        :step="1"
                                        density="compact"
                                        class="number-input"
                                        :style="{'width': getInputWidth(currentStyleSpec.filters[0].range[0])}"
                                        type="number"
                                        hide-details
                                        single-line
                                        @update:model-value="(v) => {if (currentStyleSpec?.filters[0].range) currentStyleSpec.filters[0].range[0] = parseInt(v)}"
                                    >
                                    </v-text-field>
                                </template>
                                <template v-slot:append>
                                    <v-text-field
                                        v-if="currentStyleSpec.filters[0].range"
                                        :model-value="currentStyleSpec.filters[0].range[1]"
                                        :min="currentStyleSpec.filters[0].range[0]"
                                        :max="dataRange[1]"
                                        :step="1"
                                        density="compact"
                                        class="number-input"
                                        :style="{'width': getInputWidth(currentStyleSpec.filters[0].range[1])}"
                                        type="number"
                                        hide-details
                                        single-line
                                        @update:model-value="(v) => {if (currentStyleSpec?.filters[0].range) currentStyleSpec.filters[0].range[1] = parseInt(v)}"
                                    >
                                    </v-text-field>
                                </template>
                            </v-range-slider>
                            <v-btn-toggle
                                v-if="currentStyleSpec.filters.length === 1 && currentStyleSpec.filters[0].range"
                                :model-value="currentStyleSpec.filters[0].transparency ? 'transparent' : '#000000'"
                                density="compact"
                                color="primary"
                                variant="outlined"
                                divided
                                mandatory
                                @update:model-value="(value: string) => {if (currentStyleSpec?.filters[0]) currentStyleSpec.filters[0].transparency = value === 'transparent'}"
                            >
                                <v-btn :value="'transparent'">Transparent</v-btn>
                                <v-btn :value="'#000000'">Black</v-btn>
                            </v-btn-toggle>
                        </div>
                        <div v-if="showVectorOptions">
                            <v-card-subtitle>Vector Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                            <div v-if="currentStyleSpec && currentStyleSpec.filters.length" class="mb-3">
                                Filters ({{ currentStyleSpec.filters.length }})
                                <div>
                                    <v-chip
                                        v-for="filter, index in currentStyleSpec.filters"
                                        :key="index"
                                        color="primary"
                                        density="compact"
                                        class="mb-1"
                                    >
                                        <template v-slot>
                                            <div class="d-flex" style="column-gap: 5px; align-items: center;">
                                                {{ filter.filter_by }}
                                                <span class="font-weight-bold">{{ filter.include ? ' [is] ' : ' [is not] ' }}</span>
                                                {{ filter.list }}
                                                {{ filter.range ? filter.range[0] + ' - ' + filter.range[1] : '' }}
                                                <v-icon icon="mdi-close-circle" class="text-primary" @click="removeFilter(filter)"/>
                                            </div>
                                        </template>
                                    </v-chip>
                                </div>
                            </div>
                            <v-select
                                v-if="currentVectorFilter && vectorProperties"
                                v-model="currentVectorFilter.filter_by"
                                :items="vectorProperties['all']"
                                item-title="name"
                                item-value="name"
                                label="Filter by Property"
                                density="compact"
                                hide-details
                            >
                                <template v-slot:item="{ props, item }">
                                    <v-list-item v-bind="props">
                                        <template v-slot:append>
                                            <v-chip size="small" v-if="(item.raw as Record<string, any>).sampleLabel">{{ (item.raw as Record<string, any>).sampleLabel }}</v-chip>
                                        </template>
                                    </v-list-item>
                                </template>
                            </v-select>
                            <v-range-slider
                                v-if="currentVectorFilterProperty && currentVectorFilterProperty.range"
                                v-model="currentVectorFilter.range"
                                color="primary"
                                :min="currentVectorFilterProperty.range[0]"
                                :max="currentVectorFilterProperty.range[1]"
                                step="1"
                                strict
                            >
                                <template v-slot:prepend>
                                    <v-text-field
                                        v-if="currentVectorFilter.range"
                                        :model-value="currentVectorFilter.range[0]"
                                        :min="currentVectorFilterProperty.range[0]"
                                        :max="currentVectorFilter.range[1]"
                                        :step="1"
                                        density="compact"
                                        class="number-input"
                                        :style="{'width': getInputWidth(currentVectorFilter.range[0])}"
                                        type="number"
                                        hide-details
                                        single-line
                                        @update:model-value="(v) => {if (currentVectorFilter?.range) currentVectorFilter.range[0] = parseInt(v)}"
                                    >
                                    </v-text-field>
                                </template>
                                <template v-slot:append>
                                    <v-text-field
                                        v-if="currentVectorFilter.range"
                                        :model-value="currentVectorFilter.range[1]"
                                        :min="currentVectorFilter.range[0]"
                                        :max="currentVectorFilterProperty.range[1]"
                                        :step="1"
                                        density="compact"
                                        class="number-input"
                                        :style="{'width': getInputWidth(currentVectorFilter.range[1])}"
                                        type="number"
                                        hide-details
                                        single-line
                                        @update:model-value="(v) => {if (currentVectorFilter?.range) currentVectorFilter.range[1] = parseInt(v)}"
                                    >
                                    </v-text-field>
                                </template>
                            </v-range-slider>
                            <v-select
                                v-else-if="currentVectorFilterProperty"
                                label="Select values"
                                v-model="currentVectorFilter.list"
                                :items="currentVectorFilterProperty.values"
                                density="compact"
                                multiple
                                chips
                                closable-chips
                            />
                            <v-btn-toggle
                                :model-value="currentVectorFilter.include ? 'include' : 'exclude'"
                                density="compact"
                                color="primary"
                                variant="outlined"
                                divided
                                mandatory
                                @update:model-value="(value: string) => {currentVectorFilter.include = value === 'include'}"
                            >
                                <v-btn :value="'include'">Include</v-btn>
                                <v-btn :value="'exclude'">Exclude</v-btn>
                            </v-btn-toggle>
                            <v-btn color="primary" style="float: right" @click="applyCurrentFilter">
                                <v-icon icon="mdi-filter"/>
                                Filter
                            </v-btn>
                        </div>
                    </v-window-item>
                </v-window>

            </v-card-text>

            <v-card-actions style="float: right;">
                <v-btn class="secondary-button" @click="cancel">
                    <v-icon color="primary" class="mr-1">mdi-close-circle</v-icon>
                    Cancel
                </v-btn>
                <v-btn class="primary-button" @click="save" :disabled="!currentLayerStyle.id">
                    <v-icon color="button-text" class="mr-1">mdi-content-save</v-icon>
                    Save
                </v-btn>
                <v-btn class="primary-button" @click="newNameMode = 'create'">
                    <v-icon color="button-text" class="mr-1">mdi-plus-circle</v-icon>
                    Save As New
                </v-btn>
            </v-card-actions>

            <v-dialog
                contained
                :model-value="!!newNameMode"
                @update:model-value="(v) => {if (!v) {newNameMode = undefined; newName = undefined;}}"
            >
                <v-card color="background">
                    <v-card-subtitle class="pa-2" style="background-color: rgb(var(--v-theme-surface));">
                        {{ newNameMode === 'create' ? 'New' : 'Rename' }} Layer Style
                        <span v-if="newNameMode === 'update'" class="secondary-text">({{ currentLayerStyle.name }})</span>

                        <v-icon
                            icon="mdi-close"
                            style="float:right"
                            @click="newNameMode = undefined; newName = undefined"
                        />
                    </v-card-subtitle>

                    <v-card-text>
                        <v-text-field
                            label="Name"
                            v-model="newName"
                            autofocus
                            :placeholder="newNameMode === 'update' ? currentLayerStyle.name : ''"
                        />
                    </v-card-text>

                    <v-card-actions style="float: right;">
                        <v-btn class="secondary-button" @click="newNameMode = undefined; newName = undefined">
                            <v-icon color="primary" class="mr-1">mdi-close-circle</v-icon>
                            Cancel
                        </v-btn>
                        <v-btn class="primary-button" @click="() => {if (newNameMode === 'update') {save()} else {saveAsNew()}}">
                            <v-icon color="button-text" class="mr-1">mdi-content-save</v-icon>
                            {{ newNameMode === 'update' ? 'Rename' : 'Create' }}
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-card>
    </v-menu>
</template>

<style>
.layer-style-card  .v-label {
    font-size: 14px;
}
.color-square {
    height: 25px;
    width: 25px;
    display: inline-block;
    margin: 5px 15px;
    border: 1px solid rgb(var(--v-theme-on-surface-variant));
}
</style>

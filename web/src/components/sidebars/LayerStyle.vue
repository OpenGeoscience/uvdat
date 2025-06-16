<script setup lang="ts">
import _ from 'lodash';
import { computed, ref, watch } from 'vue';
import { ColorMap, Layer, LayerStyle, StyleFilter, StyleSpec } from '@/types';
import { createLayerStyle, deleteLayerStyle, getLayerStyles, updateLayerStyle, getDatasetLayers } from '@/api/rest';
import ColormapPreview from './ColormapPreview.vue';

import { useStyleStore, useProjectStore, usePanelStore, useLayerStore } from '@/store';
const styleStore = useStyleStore();
const projectStore = useProjectStore();
const panelStore = usePanelStore();
const layerStore = useLayerStore();


const props = defineProps<{
  layer: Layer;
}>();

const showMenu = ref(false);
const showEditOptions = ref(false);
const showDeleteConfirmation = ref(false);
const newNameMode = ref<'create' | 'update' | undefined>();
const newName = ref();
const tab = ref('color')
const availableStyles = ref<LayerStyle[]>();
const currentLayerStyle = ref<LayerStyle>({name: 'None', is_default: true});
const currentStyleSpec = ref<StyleSpec>();
const availableGroups = ref<Record<string, string[]>>({color: [], size: []});
const currentGroups = ref<Record<string, string | undefined>>({color: undefined, size: undefined});
const rasterBands = ref<Record<number, Record<string, number | string>>>();

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

const dataRange = computed(() => {
    let absMin: number | undefined, absMax: number | undefined;
    const raster = props.layer.frames[props.layer.current_frame].raster
    if (raster) {
        Object.values(raster.metadata.bands).forEach(({min, max}) => {
            if (!absMin || min < absMin) absMin = min;
            if (!absMax || max < absMax) absMax = max;
        })

    }
    if(absMin && absMax){
        return [Math.floor(absMin), Math.ceil(absMax)] as [number, number];
    }
})

async function init() {
    if (!showMenu.value) cancel()
    else{
        getLayerStyles(props.layer.id).then((styles) => availableStyles.value = styles)
        if (props.layer.default_style?.style_spec && Object.keys(props.layer.default_style.style_spec).length) {
            currentLayerStyle.value = JSON.parse(JSON.stringify(props.layer.default_style));  // deep copy
            currentStyleSpec.value = {...props.layer.default_style.style_spec}
        } else {
            currentLayerStyle.value = {name: 'None', is_default: true};
            currentStyleSpec.value = {...styleStore.selectedLayerStyles[styleKey.value]};
        }
        fetchRasterBands()
    }
}

function selectStyle(style: LayerStyle) {
    currentStyleSpec.value = style.style_spec
}

function fetchRasterBands() {
    if (!currentStyleSpec.value) return
    if (showRasterOptions.value) {
        setGroupColorMode('all', 'colormap')
        if (props.layer.frames.length) {
            const currentFrame = props.layer.frames[currentStyleSpec.value.default_frame]
            if (currentFrame.raster) {
                rasterBands.value = currentFrame.raster.metadata.bands;
            }
        }
    }
}

function setColorGroups(different: boolean | null) {
    if (!currentStyleSpec.value) return
    if (different) {
        if (showRasterOptions.value && rasterBands.value) {
            const all = currentStyleSpec.value.colors.find((group) => group.name === 'all')
            const bandNames = Object.keys(rasterBands.value).map((name) => `Band ${name}`)
            currentStyleSpec.value.colors = bandNames.map((name) => {
                return { ...all, visible: true, name }
            })
            bandNames.forEach((name) => setGroupColorMode(name, 'colormap'))
            availableGroups.value['color'] = bandNames;
        } else if (showVectorOptions.value) {
            const all = currentStyleSpec.value.colors.find((group) => group.name === 'all')
            availableGroups.value['color'] = ['polygons', 'lines', 'points']
            currentStyleSpec.value.colors = availableGroups.value['color'].map((name) => {
                return { ...all, visible: true, name }
            })
        }
        if (availableGroups.value['color']?.length) currentGroups.value['color'] = availableGroups.value['color'][0]
    } else {
        currentStyleSpec.value.colors = [...styleStore.getDefaultStyleSpec(
            props.layer.frames[props.layer.current_frame].raster
        ).colors]
        if (showRasterOptions) setGroupColorMode('all', 'colormap')
        availableGroups.value['color'] = []
        currentGroups.value['color'] = 'all'
    }
}

function setGroupColorMode(groupName: string, colorMode: string) {
    if (!currentStyleSpec.value) return
    currentStyleSpec.value.colors = currentStyleSpec.value.colors.map(
        (c) => {
            if (c.name === groupName) {
                if (colorMode === 'colormap') {
                    if (!c.colormap) return {
                        ...c,
                        colormap: {
                            discrete: false,
                            n_colors: 5,
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

function setGroupColorMap(groupName: string, colormap: ColorMap) {
    if (!currentStyleSpec.value) return
    currentStyleSpec.value.colors = currentStyleSpec.value.colors.map(
        (c) => {
            if (c.name === groupName) {
                return {
                    ...c,
                    colormap: {
                        ...c.colormap,
                        ...colormap,
                    },
                    single_color: undefined
                }
            }
            return c
        }
    )
}

function setSizeGroups(different: boolean | null) {
    if (!currentStyleSpec.value) return
    if (different) {
        if (showVectorOptions.value) {
            availableGroups.value['size'] = ['lines', 'points']
            currentGroups.value['size'] = 'points'
            const all = currentStyleSpec.value.sizes.find((group) => group.name === 'all')
            if (all) {
                currentStyleSpec.value.sizes = availableGroups.value['size'].map((name) => {
                    return {  ...all, name }
                })
            }
        }
    } else {
        currentStyleSpec.value.sizes = [...styleStore.getDefaultStyleSpec(
            props.layer.frames[props.layer.current_frame].raster
        ).sizes]
        availableGroups.value['size'] = []
        currentGroups.value['size'] = 'all'
    }
}

function setGroupSizeMode(groupName: string, sizeMode: string) {
    if (!currentStyleSpec.value) return
    currentStyleSpec.value.sizes = currentStyleSpec.value.sizes.map(
        (s) => {
            if (s.name === groupName) {
                if (sizeMode === 'single_size') {
                    return {...s, single_size: 5, size_range: undefined}
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

function cancel() {
    const defaultStyle = availableStyles.value?.find((s) => s.is_default)
    if (defaultStyle?.style_spec) {
        currentStyleSpec.value = {...defaultStyle.style_spec}
    }
    else if (currentLayerStyle.value.style_spec) {
        currentStyleSpec.value = {...currentLayerStyle.value.style_spec}
    } else {
        currentStyleSpec.value = {...styleStore.getDefaultStyleSpec(
            props.layer.frames[props.layer.current_frame].raster
        )}
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
        if (style) {
            currentLayerStyle.value = style;
            newName.value = undefined;
            newNameMode.value = undefined;
            // update other styles in case default overriden
            getLayerStyles(props.layer.id).then((styles) => availableStyles.value = styles)
            refreshLayer()
        }
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
        if (style) {
            currentLayerStyle.value = style;
            newName.value = undefined;
            newNameMode.value = undefined;
            // update other styles in case default overriden
            getLayerStyles(props.layer.id).then((styles) => availableStyles.value = styles)
            refreshLayer()
        }
    })
}

function deleteStyle() {
    if (!currentLayerStyle.value?.id) return;
    deleteLayerStyle(currentLayerStyle.value.id).then(() => {
        getLayerStyles(props.layer.id).then((styles) => {
            availableStyles.value = styles;
            const newDefault = styles.find((style) => style.is_default)
            if (newDefault) {
                currentLayerStyle.value = newDefault;
                currentStyleSpec.value = newDefault.style_spec;
            } else {
                currentLayerStyle.value = {name: 'None', is_default: true};
                currentStyleSpec.value = {...styleStore.getDefaultStyleSpec(
                    props.layer.frames[props.layer.current_frame].raster
                )}
            }
            refreshLayer()
            showDeleteConfirmation.value = false;
        })
    })
}

function refreshLayer() {
    // refresh layer in projectStore.availableDatasets
    // so any new layer copies will have the correct default style
    Promise.all(projectStore.availableDatasets.map(async (dataset: Dataset) => {
        if (dataset.id === props.layer.dataset.id) {
            dataset.layers = await getDatasetLayers(dataset.id);

            // refresh layer in layerStore.selectedLayers
            // so closing and opening the style menu will have the correct default style
            Promise.all(layerStore.selectedLayers.map(async (layer: Layer) => {
                if (layer.id === props.layer.id) {
                    const updated = dataset.layers.find((l) => l.id === props.layer.id)
                    if (updated) layer.default_style = updated.default_style
                }
                return layer
            })).then((layers) => layerStore.selectedLayers = layers)
        }
        return dataset;
    })).then((datasets) => projectStore.availableDatasets = datasets);
}

watch(() => panelStore.draggingPanel, () => {
    showMenu.value = false;
})

watch(currentStyleSpec, _.debounce(() => {
    if (currentStyleSpec.value) {
        styleStore.selectedLayerStyles[styleKey.value] = currentStyleSpec.value
        styleStore.updateLayerStyles(props.layer)
        availableGroups.value['color'] = currentStyleSpec.value.colors.map((c) => c.name)
        availableGroups.value['size'] = currentStyleSpec.value.sizes.map((c) => c.name)
        if (availableGroups.value['color'].length && !currentGroups.value['color']) {
            currentGroups.value['color'] = availableGroups.value['color'][0]
        }
        if (availableGroups.value['size'].length && !currentGroups.value['size']) {
            currentGroups.value['size'] = availableGroups.value['size'][0]
        }
    }
}, 100), {deep: true})

watch(showMenu, init)
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
            <v-card-subtitle class="pr-10 py-3" style="background-color: rgb(var(--v-theme-surface)); height: 40px">
                Edit Style
                <span class="secondary-text">(Layer: {{ layer.name }})</span>

                <v-icon
                    icon="mdi-close"
                    style="position: absolute; top: 10px; right: 5px;"
                    @click="cancel"
                />
            </v-card-subtitle>

            <v-card-text class="pa-2">
                <div class="d-flex mb-1" style="align-items: center; column-gap: 5px;">
                    <v-select
                        v-model="currentLayerStyle"
                        :items="availableStyles"
                        item-value="id"
                        :item-props="(item) => ({title: item.is_default ? item.name + ' (default)' : item.name})"
                        label="Layer Style"
                        density="compact"
                        variant="outlined"
                        no-data-text="No saved styles exist yet."
                        return-object
                        hide-details
                        @update:model-value="selectStyle"
                    ></v-select>
                    <v-menu v-model="showEditOptions" open-on-hover :close-on-content-click="false" location="start">
                        <template v-slot:activator="{ props }">
                            <v-icon v-bind="props" :disabled="!currentLayerStyle.id" icon="mdi-pencil"/>
                        </template>
                        <v-list v-if="currentLayerStyle.id">
                            <v-list-item @click="showEditOptions = false; newNameMode = 'update'">Rename</v-list-item>
                            <v-list-item @click="showEditOptions = false; showDeleteConfirmation = true">Delete</v-list-item>
                        </v-list>
                    </v-menu>
                </div>

                <div class="d-flex mx-2">
                    <v-checkbox
                        v-model="currentLayerStyle.is_default"
                        label="Set as default style"
                        class="primary-control"
                        density="compact"
                        hide-details
                    />
                </div>

                <table class="aligned-controls">
                    <tbody>
                        <tr v-if="props.layer.frames.length > 1">
                            <td><v-label>Default frame</v-label></td>
                            <td>
                                <v-slider
                                    :model-value="currentStyleSpec.default_frame + 1"
                                    :max="props.layer.frames.length"
                                    min="1"
                                    step="1"
                                    color="primary"
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
                            </td>
                        </tr>
                        <tr>
                            <td><v-label color="primary-text">Opacity</v-label></td>
                            <td>
                                <v-slider
                                    v-model="currentStyleSpec.opacity"
                                    max="1"
                                    min="0"
                                    step="0.1"
                                    color="primary"
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
                            </td>
                        </tr>
                    </tbody>
                </table>

                <v-tabs v-model="tab" align-tabs="center" fixed-tabs density="compact" color="primary">
                    <v-tab value="color">
                        <v-icon icon="mdi-palette" class="mr-1" :color="tab === 'color' ? 'primary' : 'gray'"/>
                        Color
                    </v-tab>
                    <v-tab value="size">
                        <span class="material-symbols-outlined mr-1" :style="tab === 'size' ? 'color: primary' : 'color: gray'">
                            straighten
                        </span>
                        Size
                    </v-tab>
                    <v-tab value="filters">
                        <v-icon icon="mdi-filter" class="mr-1" :color="tab === 'filters' ? 'primary' : 'gray'"/>
                        Filters
                    </v-tab>
                </v-tabs>

                <v-window v-model="tab" class="tab-contents">
                    <v-window-item value="color" class="pa-2">
                        <div v-if="showRasterOptions">
                            <v-label class="secondary-text px-3">Raster Options</v-label>
                            <v-divider class="mb-2"/>
                            <table class="aligned-controls">
                                <tbody>
                                    <tr>
                                        <td colspan="2">
                                            <v-checkbox
                                                label="Different color per band (multi-band images)"
                                                :model-value="Array.from(currentStyleSpec.colors.keys()).length > 1"
                                                density="compact"
                                                class="primary-control"
                                                hide-details
                                                @update:model-value="setColorGroups"
                                            />
                                        </td>
                                    </tr>
                                    <template v-for="group in currentStyleSpec.colors.filter((c) => c.name === currentGroups['color'])">
                                        <tr v-if="currentGroups['color'] !== 'all'">
                                            <td><v-label>Band</v-label></td>
                                            <td class="d-flex" style="align-items: center; column-gap: 10px;">
                                                <v-select
                                                    v-model="currentGroups['color']"
                                                    :items="availableGroups['color']"
                                                    density="compact"
                                                    variant="outlined"
                                                    hide-details
                                                ></v-select>
                                                <v-icon
                                                    :icon="group.visible ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
                                                    @click="group.visible = !group.visible"
                                                    size="large"
                                                />
                                            </td>
                                        </tr>
                                        <tr v-if="currentGroups['color'] !== 'all'">
                                            <td colspan="2">
                                                <v-label class="secondary-text py-2">Selected Band Options [{{ currentGroups['color'] }}]</v-label>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><v-label :class="group.visible ? '' : 'secondary-text'">Colormap</v-label></td>
                                            <td>
                                                <v-select
                                                    :model-value="group.colormap"
                                                    :items="colormaps"
                                                    item-title="name"
                                                    density="compact"
                                                    variant="outlined"
                                                    hide-details
                                                    return-object
                                                    :disabled="!group.visible"
                                                    @update:model-value="(v) => setGroupColorMap(group.name, v)"
                                                >
                                                    <template v-slot:item="{ props, item }">
                                                        <v-list-item v-bind="props">
                                                            <template v-slot:append>
                                                                <colormap-preview
                                                                    :colormap="item.raw"
                                                                    :discrete="group.colormap.discrete || false"
                                                                    :nColors="group.colormap.n_colors || -1"
                                                                />
                                                            </template>
                                                        </v-list-item>
                                                    </template>
                                                    <template v-slot:selection="{ item }">
                                                        <span class="pr-15" v-if="group.colormap?.markers">{{ item.title }}</span>
                                                        <colormap-preview
                                                            v-if="group.colormap?.markers"
                                                            :colormap="item.raw"
                                                            :discrete="group.colormap.discrete || false"
                                                            :nColors="group.colormap.n_colors || -1"
                                                        />
                                                        <span v-else>Select Colormap</span>
                                                    </template>
                                                </v-select>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><v-label :class="group.visible && group.colormap.markers ? '' : 'secondary-text'">Colormap class</v-label></td>
                                            <td>
                                                <v-btn-toggle
                                                    :model-value="group.colormap.discrete ? 'discrete' : 'continuous'"
                                                    density="compact"
                                                    color="primary"
                                                    variant="outlined"
                                                    divided
                                                    mandatory
                                                    :disabled="!group.visible || !group.colormap.markers"
                                                    @update:model-value="(value: string) => {if (group.colormap) group.colormap.discrete = value === 'discrete'}"
                                                >
                                                    <v-btn :value="'discrete'">Discrete</v-btn>
                                                    <v-btn :value="'continuous'">Continuous</v-btn>
                                                </v-btn-toggle>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><v-label :class="group.visible && group.colormap.markers && group.colormap?.discrete ? '' : 'secondary-text'">No. of colors</v-label></td>
                                            <td>
                                                <v-slider
                                                    v-model="group.colormap.n_colors"
                                                    max="30"
                                                    min="2"
                                                    step="1"
                                                    color="primary"
                                                    thumb-size="15"
                                                    track-size="8"
                                                    hide-details
                                                    type="number"
                                                    :disabled="!group.visible || !group.colormap.markers || !group.colormap?.discrete"
                                                >
                                                    <template v-slot:append>
                                                        <v-text-field
                                                            :model-value="group.colormap.n_colors"
                                                            max="30"
                                                            min="2"
                                                            step="1"
                                                            density="compact"
                                                            class="number-input"
                                                            style="width: 60px"
                                                            type="number"
                                                            hide-details
                                                            single-line
                                                            @update:model-value="(v) => {if (group.colormap) group.colormap.n_colors = parseFloat(v)}"
                                                        >
                                                        </v-text-field>
                                                    </template>
                                                </v-slider>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><v-label :class="group.visible && group.colormap.markers ? '' : 'secondary-text'">Range</v-label></td>
                                            <v-range-slider
                                                v-if="group.colormap?.range && dataRange"
                                                v-model="group.colormap.range"
                                                color="primary"
                                                :min="dataRange[0]"
                                                :max="dataRange[1]"
                                                step="1"
                                                strict
                                                :disabled="!group.visible || !group.colormap.markers"
                                            >
                                                <template v-slot:prepend>
                                                    <v-text-field
                                                        v-if="group.colormap.range"
                                                        :model-value="group.colormap.range[0]"
                                                        :min="dataRange[0]"
                                                        :max="group.colormap.range[1]"
                                                        :step="1"
                                                        density="compact"
                                                        class="number-input"
                                                        type="number"
                                                        hide-details
                                                        single-line
                                                        @update:model-value="(v) => {if (group.colormap?.range) group.colormap.range[0] = parseInt(v)}"
                                                    >
                                                    </v-text-field>
                                                </template>
                                                <template v-slot:append>
                                                    <v-text-field
                                                        v-if="group.colormap.range"
                                                        :model-value="group.colormap.range[1]"
                                                        :min="group.colormap.range[0]"
                                                        :max="dataRange[1]"
                                                        :step="1"
                                                        density="compact"
                                                        class="number-input"
                                                        type="number"
                                                        hide-details
                                                        single-line
                                                        @update:model-value="(v) => {if (group.colormap?.range) group.colormap.range[1] = parseInt(v)}"
                                                    >
                                                    </v-text-field>
                                                </template>
                                            </v-range-slider>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                        <div v-if="showVectorOptions">
                            <v-label class="secondary-text px-3">Vector Options</v-label>
                            <v-divider class="mb-2"/>
                            <table class="aligned-controls">
                                <tbody>
                                    <tr>
                                        <td colspan="2">
                                            <v-checkbox
                                                label="Different color per feature type"
                                                :model-value="Array.from(currentStyleSpec.colors.keys()).length > 1"
                                                density="compact"
                                                class="primary-control"
                                                hide-details
                                                @update:model-value="setColorGroups"
                                            />
                                        </td>
                                    </tr>
                                    <template v-for="group in currentStyleSpec.colors.filter((c) => c.name === currentGroups['color'])">
                                        <tr v-if="currentGroups['color'] !== 'all'">
                                            <td><v-label>Feature Type</v-label></td>
                                            <td class="d-flex" style="align-items: center; column-gap: 10px;"   >
                                                <v-select
                                                    v-model="currentGroups['color']"
                                                    :items="availableGroups['color']"
                                                    density="compact"
                                                    variant="outlined"
                                                    hide-details
                                                ></v-select>
                                                <v-icon
                                                    :icon="group.visible ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
                                                    @click="group.visible = !group.visible"
                                                    size="large"
                                                />
                                            </td>
                                        </tr>
                                        <tr v-if="currentGroups['color'] !== 'all'">
                                            <td colspan="2">
                                                <v-label class="secondary-text py-2">Selected Feature Type Options [{{ currentGroups['color'] }}]</v-label>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><v-label :class="group.visible ? '' : 'secondary-text'">Color scheme</v-label></td>
                                            <td>
                                                <div class="d-flex" style="align-items: center;">
                                                    <v-btn-toggle
                                                        :model-value="group.single_color ? 'single_color' : 'colormap'"
                                                        density="compact"
                                                        color="primary"
                                                        variant="outlined"
                                                        divided
                                                        mandatory
                                                        :disabled="!group.visible"
                                                        @update:model-value="(value: string) => setGroupColorMode(group.name, value)"
                                                    >
                                                        <v-btn :value="'single_color'">Single Color</v-btn>
                                                        <v-btn :value="'colormap'">Colormap</v-btn>
                                                    </v-btn-toggle>
                                                    <v-menu
                                                        v-if="group.single_color"
                                                        :disabled="!group.visible"
                                                        :close-on-content-click="false"
                                                        open-on-hover
                                                        location="end"
                                                    >
                                                        <template v-slot:activator="{ props }">
                                                            <div
                                                                v-bind="props"
                                                                class="color-square"
                                                                :style="{backgroundColor: group.single_color, opacity: group.visible ? 1 : 0.5}"
                                                            ></div>
                                                        </template>
                                                        <v-card>
                                                            <v-color-picker
                                                                v-model:model-value="group.single_color"
                                                                mode="rgb"
                                                            />
                                                        </v-card>
                                                    </v-menu>
                                                </div>
                                            </td>
                                        </tr>
                                        <template v-if="group.colormap">
                                            <tr>
                                                <td><v-label :class="group.visible ? '' : 'secondary-text'">Color by property</v-label></td>
                                                <td>
                                                    <v-select
                                                        v-if="vectorProperties && vectorProperties[group.name]"
                                                        v-model="group.colormap.color_by"
                                                        :items="vectorProperties[group.name]"
                                                        :disabled="!group.visible"
                                                        item-title="name"
                                                        item-value="name"
                                                        density="compact"
                                                        variant="outlined"
                                                        placeholder="Select property"
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
                                                </td>
                                            </tr>
                                            <tr>
                                                <td><v-label :class="group.visible && group.colormap.color_by ? '' : 'secondary-text'">Colormap</v-label></td>
                                                <td>
                                                    <v-select
                                                        :model-value="group.colormap"
                                                        :items="colormaps"
                                                        :disabled="!group.visible || !group.colormap.color_by"
                                                        item-title="name"
                                                        density="compact"
                                                        variant="outlined"
                                                        hide-details
                                                        return-object
                                                        @update:model-value="(v) => setGroupColorMap(group.name, v)"
                                                    >
                                                        <template v-slot:item="{ props, item }">
                                                            <v-list-item v-bind="props">
                                                                <template v-slot:append>
                                                                    <colormap-preview
                                                                        :colormap="item.raw"
                                                                        :discrete="group.colormap.discrete || false"
                                                                        :nColors="group.colormap.n_colors || -1"
                                                                    />
                                                                </template>
                                                            </v-list-item>
                                                        </template>
                                                        <template v-slot:selection="{ item }">
                                                            <span class="pr-15" v-if="group.colormap?.markers">{{ item.title }}</span>
                                                            <colormap-preview
                                                                v-if="group.colormap?.markers"
                                                                :colormap="item.raw"
                                                                :discrete="group.colormap.discrete || false"
                                                                :nColors="group.colormap.n_colors || -1"
                                                            />
                                                            <span v-else>Select Colormap</span>
                                                        </template>
                                                    </v-select>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td><v-label :class="group.visible && group.colormap.markers ? '' : 'secondary-text'">Colormap class</v-label></td>
                                                <td>
                                                    <v-btn-toggle
                                                        :model-value="group.colormap.discrete ? 'discrete' : 'continuous'"
                                                        density="compact"
                                                        color="primary"
                                                        variant="outlined"
                                                        divided
                                                        mandatory
                                                        :disabled="!group.visible || !group.colormap.markers"
                                                        @update:model-value="(value: string) => {if (group.colormap) group.colormap.discrete = value === 'discrete'}"
                                                    >
                                                        <v-btn :value="'discrete'">Discrete</v-btn>
                                                        <v-btn :value="'continuous'">Continuous</v-btn>
                                                    </v-btn-toggle>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td><v-label :class="group.visible && group.colormap.discrete ? '' : 'secondary-text'">No. of colors</v-label></td>
                                                <td>
                                                    <v-slider
                                                        v-model="group.colormap.n_colors"
                                                        max="30"
                                                        min="2"
                                                        step="1"
                                                        color="primary"
                                                        thumb-size="15"
                                                        track-size="8"
                                                        hide-details
                                                        type="number"
                                                        :disabled="!group.visible || !group.colormap.discrete"
                                                    >
                                                        <template v-slot:append>
                                                            <v-text-field
                                                                :model-value="group.colormap.n_colors"
                                                                max="30"
                                                                min="2"
                                                                step="1"
                                                                density="compact"
                                                                class="number-input"
                                                                style="width: 60px"
                                                                type="number"
                                                                hide-details
                                                                single-line
                                                                @update:model-value="(v) => {if (group.colormap) group.colormap.n_colors = parseFloat(v)}"
                                                            >
                                                            </v-text-field>
                                                        </template>
                                                    </v-slider>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td><v-label :class="group.visible && group.colormap.color_by && group.colormap.markers ? '' : 'secondary-text'">Null values</v-label></td>
                                                <td>
                                                    <div
                                                        class="d-flex"
                                                        style="align-items: center;"
                                                    >
                                                        <v-btn-toggle
                                                            :model-value="group.colormap.null_color === 'transparent' ? 'transparent' : '#000000'"
                                                            density="compact"
                                                            color="primary"
                                                            variant="outlined"
                                                            divided
                                                            mandatory
                                                            :disabled="!group.visible || !group.colormap.color_by || !group.colormap.markers"
                                                            @update:model-value="(value: string) => {if (group.colormap) group.colormap.null_color = value}"
                                                        >
                                                            <v-btn :value="'transparent'">Transparent</v-btn>
                                                            <v-btn :value="'#000000'">Single Color</v-btn>
                                                        </v-btn-toggle>
                                                        <v-menu
                                                            v-if="group.colormap.null_color !== 'transparent'"
                                                            :close-on-content-click="false"
                                                            open-on-hover
                                                            :disabled="!group.visible"
                                                            location="end"
                                                        >
                                                            <template v-slot:activator="{ props }">
                                                                <div
                                                                    v-bind="props"
                                                                    class="color-square"
                                                                    :style="{backgroundColor: group.colormap.null_color}"
                                                                ></div>
                                                            </template>
                                                            <v-card>
                                                                <v-color-picker
                                                                    v-model:model-value="group.colormap.null_color"
                                                                    mode="rgb"
                                                                />
                                                            </v-card>
                                                        </v-menu>
                                                    </div>
                                                </td>
                                            </tr>
                                        </template>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                    </v-window-item>
                    <v-window-item value="size" class="pa-2">
                        <div v-if="showRasterOptions">
                            <v-label class="secondary-text px-3">Raster Options</v-label>
                            <v-divider class="mb-2"/>
                            <v-label class="secondary-text px-3">Size options do not apply to raster data.</v-label>
                        </div>
                        <div v-if="showVectorOptions">
                            <v-label class="secondary-text px-3">Vector Options</v-label>
                            <v-divider class="mb-2"/>
                            <table class="aligned-controls">
                                <tbody>
                                    <tr>
                                        <td colspan="2">
                                            <v-checkbox
                                                label="Different size per feature type"
                                                :model-value="Array.from(currentStyleSpec.sizes.keys()).length > 1"
                                                density="compact"
                                                class="primary-control"
                                                hide-details
                                                @update:model-value="setSizeGroups"
                                            />
                                        </td>
                                    </tr>
                                    <tr v-if="currentGroups['size'] !== 'all'">
                                        <td><v-label>Feature Type</v-label></td>
                                        <td>
                                            <v-select
                                                v-model="currentGroups['size']"
                                                :items="availableGroups['size']"
                                                density="compact"
                                                variant="outlined"
                                                hide-details
                                            ></v-select>
                                        </td>
                                    </tr>
                                    <tr v-if="currentGroups['size'] !== 'all'">
                                        <td colspan="2">
                                            <v-label class="secondary-text py-2">Selected Feature Type Options [{{ currentGroups['size'] }}]</v-label>
                                        </td>
                                    </tr>
                                    <template v-for="group in currentStyleSpec.sizes.filter((c) => c.name === currentGroups['size'])">
                                        <tr>
                                            <td><v-label>Size choice</v-label></td>
                                            <td>
                                                <v-btn-toggle
                                                :model-value="group.single_size ? 'single_size' : 'range'"
                                                density="compact"
                                                color="primary"
                                                variant="outlined"
                                                divided
                                                mandatory
                                                @update:model-value="(value: string) => setGroupSizeMode(group.name, value)"
                                            >
                                                <v-btn :value="'single_size'">Single Size</v-btn>
                                                <v-btn :value="'range'">Range of Sizes</v-btn>
                                            </v-btn-toggle>
                                            </td>
                                        </tr>
                                        <tr v-if="group.single_size">
                                            <td>
                                                <v-label>Size</v-label>
                                                <v-icon
                                                    icon="mdi-information-outline"
                                                    color="primary"
                                                    size="small"
                                                    class="ml-2"
                                                    v-tooltip="group.name === 'all' ? 'Range: 1 to 10' : group.name === 'lines' ? 'Line thickness' : 'Point radius'"
                                                />
                                            </td>
                                            <td>
                                                <v-slider
                                                    :model-value="group.single_size"
                                                    max="10"
                                                    min="1"
                                                    step="1"
                                                    color="primary"
                                                    hide-details
                                                    type="number"
                                                    @update:model-value="(value: number) => {group.single_size = value}"
                                                >
                                                    <template v-slot:append>
                                                        <v-text-field
                                                            :model-value="group.single_size"
                                                            max="10"
                                                            min="1"
                                                            step="1"
                                                            density="compact"
                                                            class="number-input"
                                                            style="width: 60px"
                                                            type="number"
                                                            hide-details
                                                            single-line
                                                            @update:model-value="(value: string) => {group.single_size = parseInt(value)}"
                                                        >
                                                        </v-text-field>
                                                    </template>
                                                </v-slider>
                                            </td>
                                        </tr>
                                        <tr v-if="group.size_range">
                                            <td>
                                                <v-label>Size Range</v-label>
                                                <v-icon
                                                    v-if="group.name !== 'all'"
                                                    icon="mdi-information-outline"
                                                    color="primary"
                                                    size="small"
                                                    class="ml-2"
                                                    v-tooltip="group.name === 'polygons' ? 'Border thickness' : group.name === 'lines' ? 'Line thickness' : 'Point radius'"
                                                />
                                            </td>
                                            <td>
                                                <v-range-slider
                                                    :model-value="[group.size_range.minimum, group.size_range.maximum]"
                                                    color="primary"
                                                    :min="1"
                                                    :max="10"
                                                    step="1"
                                                    strict
                                                    hide-details
                                                    @update:model-value="([min, max]) => {if (!group.size_range) return; group.size_range.minimum = min; group.size_range.maximum = max;}"
                                                >
                                                    <template v-slot:prepend>
                                                        <v-text-field
                                                            :model-value="group.size_range.minimum"
                                                            :min="1"
                                                            :max="group.size_range.maximum"
                                                            :step="1"
                                                            density="compact"
                                                            class="number-input"
                                                            type="number"
                                                            hide-details
                                                            single-line
                                                            @update:model-value="(v) => {if (group.size_range) group.size_range.minimum = parseInt(v)}"
                                                        >
                                                        </v-text-field>
                                                    </template>
                                                    <template v-slot:append>
                                                        <v-text-field
                                                            :model-value="group.size_range.maximum"
                                                            :min="group.size_range.minimum"
                                                            :max="10"
                                                            :step="1"
                                                            density="compact"
                                                            class="number-input"
                                                            type="number"
                                                            hide-details
                                                            single-line
                                                            @update:model-value="(v) => {if (group.size_range) group.size_range.maximum = parseInt(v)}"
                                                        >
                                                        </v-text-field>
                                                    </template>
                                                </v-range-slider>
                                            </td>
                                        </tr>
                                        <tr v-if="group.size_range && vectorProperties && vectorProperties[group.name]">
                                            <td><v-label>Size by property</v-label></td>
                                            <td>
                                                <v-select
                                                    v-model="group.size_range.size_by"
                                                    :items="vectorProperties[group.name]"
                                                    item-title="name"
                                                    item-value="name"
                                                    density="compact"
                                                    variant="outlined"
                                                    placeholder="Select property"
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
                                            </td>
                                        </tr>
                                        <tr v-if="group.size_range && group.size_range.size_by">
                                            <td><v-label>Null values</v-label></td>
                                            <td>
                                                <div class="d-flex" style="align-items: center">
                                                    <v-btn-toggle
                                                        :model-value="group.size_range.null_size?.transparency ? 'transparent' : 1"
                                                        density="compact"
                                                        color="primary"
                                                        variant="outlined"
                                                        divided
                                                        mandatory
                                                        @update:model-value="(value: string | number) => {if (group.size_range) {
                                                            if (value === 'transparent') {group.size_range.null_size = {transparency: true, size: 0}}
                                                            else {group.size_range.null_size = {transparency: false, size: value as number}}
                                                        }}"
                                                    >
                                                        <v-btn :value="'transparent'">Transparent</v-btn>
                                                        <v-btn :value="1">Size</v-btn>
                                                    </v-btn-toggle>
                                                    <v-text-field
                                                        v-if="group.size_range.null_size && !group.size_range.null_size.transparency"
                                                        :model-value="group.size_range.null_size.size"
                                                        :min="1"
                                                        :max="10"
                                                        :step="1"
                                                        density="compact"
                                                        type="number"
                                                        hide-details
                                                        single-line
                                                        @update:model-value="(v) => {if (group.size_range?.null_size) group.size_range.null_size.size = parseInt(v)}"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <v-label>
                                                    Zoom scaling
                                                    <v-icon
                                                        icon="mdi-information-outline"
                                                        color="primary"
                                                        size="small"
                                                        class="ml-2"
                                                        v-tooltip="'Size of features will change according to the current map zoom level, multiplied by a factor of the size value'"
                                                    />
                                                </v-label>
                                            </td>
                                            <td>
                                                <v-checkbox
                                                    v-model="group.zoom_scaling"
                                                    class="primary-control"
                                                    density="compact"
                                                    hide-details
                                                />
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                    </v-window-item>
                    <v-window-item value="filters" class="pa-2">
                        <div v-if="showRasterOptions">
                            <v-label class="secondary-text px-3">Raster Options</v-label>
                            <v-divider class="mb-2"/>
                            <v-label class="secondary-text px-3">Filter options do not apply to raster data.</v-label>
                        </div>
                        <div v-if="showVectorOptions">
                            <v-card-subtitle>Vector Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                            <v-btn color="primary" @click="currentStyleSpec.filters.push({include: true, transparency: true})" width="100%">
                                <v-icon icon="mdi-plus"/>
                                Add Filter
                            </v-btn>
                            <v-card-subtitle v-if="currentStyleSpec.filters.length">
                                Filters ({{ currentStyleSpec.filters.length }}):
                            </v-card-subtitle>
                            <v-expansion-panels v-if="currentStyleSpec.filters.length"  variant="accordion" density="compact">
                                <v-expansion-panel v-for="filter, index in currentStyleSpec.filters" :key="index">
                                    <v-expansion-panel-title>
                                        <v-chip
                                            color="primary"
                                            density="compact"
                                            class="mb-1"
                                            style="max-width: 100%; height: auto !important;"
                                        >
                                            <template v-slot>
                                                <span style="white-space: wrap;" v-if="filter.filter_by">
                                                    {{ filter.filter_by }}
                                                    <span class="font-weight-bold">{{ filter.include ? ' [is] ' : ' [is not] ' }}</span>
                                                    {{ filter.list }}
                                                    {{ filter.range ? filter.range[0] + ' - ' + filter.range[1] : '' }}
                                                </span>
                                                <span v-else>New Filter</span>
                                                <v-icon icon="mdi-close-circle" class="text-primary" @click="removeFilter(filter)"/>
                                            </template>
                                        </v-chip>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text>
                                        <table class="aligned-controls">
                                            <tbody>
                                                <tr>
                                                    <td colspan="2">
                                                        <v-select
                                                            v-if="vectorProperties"
                                                            v-model="filter.filter_by"
                                                            :items="vectorProperties['all']"
                                                            placeholder="Select Property"
                                                            label="Property"
                                                            item-title="name"
                                                            item-value="name"
                                                            density="compact"
                                                            variant="outlined"
                                                            hide-details
                                                            @update:model-value="(v) => {
                                                                if (!filter.list && !filter.range && vectorProperties) {
                                                                    const property = vectorProperties['all'].find((f: any) => f.name === filter.filter_by)
                                                                    if (property?.range) filter.range = property.range
                                                                    else if (property.values) filter.list = []
                                                                }
                                                            }"
                                                        >
                                                            <template v-slot:item="{ props, item }">
                                                                <v-list-item v-bind="props">
                                                                    <template v-slot:append>
                                                                        <v-chip size="small" v-if="(item.raw as Record<string, any>).sampleLabel">{{ (item.raw as Record<string, any>).sampleLabel }}</v-chip>
                                                                    </template>
                                                                </v-list-item>
                                                            </template>
                                                        </v-select>
                                                    </td>
                                                </tr>
                                                <template v-if="filter.filter_by && vectorProperties" v-for="property in [vectorProperties['all'].find((f: any) => f.name === filter.filter_by)]">
                                                    <tr v-if="property.range">
                                                        <td>Value type</td>
                                                        <td>
                                                            <v-btn-toggle
                                                                :model-value="filter.range ? 'range' : 'single'"
                                                                density="compact"
                                                                color="primary"
                                                                variant="outlined"
                                                                divided
                                                                mandatory
                                                                @update:model-value="(value: string) => {
                                                                    if (!property) return
                                                                    if (value === 'range') {filter.range = property.range; filter.list = undefined}
                                                                    else {filter.range = undefined; filter.list = [property.range[0]]}
                                                                }"
                                                            >
                                                                <v-btn :value="'single'">Single</v-btn>
                                                                <v-btn :value="'range'">Range</v-btn>
                                                            </v-btn-toggle>
                                                        </td>
                                                    </tr>
                                                    <tr v-if="property">
                                                        <td>Values</td>
                                                        <td>
                                                            <template v-if="property.range">
                                                                <v-range-slider
                                                                    v-if="filter.range"
                                                                    v-model="filter.range"
                                                                    color="primary"
                                                                    :min="property.range[0]"
                                                                    :max="property.range[1]"
                                                                    step="1"
                                                                    strict
                                                                >
                                                                    <template v-slot:prepend>
                                                                        <v-text-field
                                                                            v-if="filter.range"
                                                                            :model-value="filter.range[0]"
                                                                            :min="property.range[0]"
                                                                            :max="filter.range[1]"
                                                                            :step="1"
                                                                            density="compact"
                                                                            class="number-input"
                                                                            type="number"
                                                                            hide-details
                                                                            single-line
                                                                            @update:model-value="(v) => {if (filter?.range) filter.range[0] = parseInt(v)}"
                                                                        >
                                                                        </v-text-field>
                                                                    </template>
                                                                    <template v-slot:append>
                                                                        <v-text-field
                                                                            v-if="filter.range"
                                                                            :model-value="filter.range[1]"
                                                                            :min="filter.range[0]"
                                                                            :max="property.range[1]"
                                                                            :step="1"
                                                                            density="compact"
                                                                            class="number-input"
                                                                            type="number"
                                                                            hide-details
                                                                            single-line
                                                                            @update:model-value="(v) => {if (filter?.range) filter.range[1] = parseInt(v)}"
                                                                        >
                                                                        </v-text-field>
                                                                    </template>
                                                                </v-range-slider>
                                                                <v-slider
                                                                    v-else-if="filter.list"
                                                                    :model-value="filter.list[0]"
                                                                    :min="property.range[0]"
                                                                    :max="property.range[1]"
                                                                    :step="1"
                                                                    color="primary"
                                                                    hide-details
                                                                    type="number"
                                                                    @update:model-value="(value: number) => {filter.list = [value]}"
                                                                >
                                                                    <template v-slot:append>
                                                                        <v-text-field
                                                                            :model-value="filter.list[0]"
                                                                            :min="property.range[0]"
                                                                            :max="property.range[1]"
                                                                            :step="1"
                                                                            density="compact"
                                                                            class="number-input"
                                                                            type="number"
                                                                            hide-details
                                                                            single-line
                                                                            @update:model-value="(value: string) => {filter.list = [parseInt(value)]}"
                                                                        >
                                                                        </v-text-field>
                                                                    </template>
                                                                </v-slider>
                                                            </template>
                                                            <v-select
                                                                v-else
                                                                v-model="filter.list"
                                                                :items="property.values"
                                                                density="compact"
                                                                variant="outlined"
                                                                multiple
                                                                chips
                                                                closable-chips
                                                                hide-details
                                                            />
                                                        </td>
                                                    </tr>
                                                    <tr v-if="property">
                                                        <td>Filter Mode</td>
                                                        <td>
                                                            <v-btn-toggle
                                                                :model-value="filter.include ? 'include' : 'exclude'"
                                                                density="compact"
                                                                color="primary"
                                                                variant="outlined"
                                                                divided
                                                                mandatory
                                                                @update:model-value="(value: string) => {filter.include = value === 'include'}"
                                                            >
                                                                <v-btn :value="'include'">Include</v-btn>
                                                                <v-btn :value="'exclude'">Exclude</v-btn>
                                                            </v-btn-toggle>
                                                        </td>
                                                    </tr>
                                                </template>
                                            </tbody>
                                        </table>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
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
                            :rules="[() => !availableStyles?.map((s) => s.name).includes(newName) || `Style ''${newName}'' already exists.`]"
                            @keydown.enter="() => {if (newName) {
                                if (newNameMode === 'update') {save()} else {saveAsNew()}
                            }}"
                            @keydown.escape="newNameMode = undefined; newName = undefined"
                        />
                    </v-card-text>

                    <v-card-actions style="float: right;">
                        <v-btn class="secondary-button" @click="newNameMode = undefined; newName = undefined">
                            <v-icon color="primary" class="mr-1">mdi-close-circle</v-icon>
                            Cancel
                        </v-btn>
                        <v-btn
                            class="primary-button"
                            :disabled="availableStyles?.map((s) => s.name).includes(newName)"
                            @click="() => {if (newNameMode === 'update') {save()} else {saveAsNew()}}"
                        >
                            <v-icon color="button-text" class="mr-1">
                                {{ newNameMode === 'update' ? 'mdi-content-save' : 'mdi-plus-circle' }}
                            </v-icon>
                            {{ newNameMode === 'update' ? 'Rename Style' : 'Create Style' }}
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-model="showDeleteConfirmation" contained>
                <v-card color="background">
                    <v-card-subtitle class="pa-2" style="background-color: rgb(var(--v-theme-surface))">
                        Delete Layer Style
                        <span class="secondary-text">({{ currentLayerStyle.name }})</span>

                        <v-icon
                            icon="mdi-close"
                            style="float:right"
                            @click="showDeleteConfirmation = false"
                        />
                    </v-card-subtitle>

                    <v-card-text>
                        Are you sure you want to delete "{{ currentLayerStyle.name }}"?
                        <div class="pa-3 d-flex" style="align-items: center; column-gap: 10px">
                            <v-icon icon="mdi-alert" color="warning" />
                            <span class="secondary-text">
                                This action cannot be undone. Any layer using this style will revert to default settings.
                            </span>
                        </div>
                    </v-card-text>

                    <v-card-actions>
                        <v-btn class="secondary-button" @click="showDeleteConfirmation = false">
                            <v-icon color="primary" class="mr-1">mdi-close-circle</v-icon>
                            Cancel
                        </v-btn>
                        <v-btn color="error" variant="tonal" @click="deleteStyle">
                            <v-icon color="error" class="mr-1">mdi-delete</v-icon>
                            Delete
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
.aligned-controls {
    padding: 0px 10px;
    width: 100%;
}
.aligned-controls td:first-child {
    /* minimize width of first column (labels) */
    width: 1%;
    padding-right: 10px;
    vertical-align: middle;
    align-items: center;
}
.aligned-controls .v-select {
    max-width: calc(100% - 15px);
}
.primary-control .v-icon:not(.mdi-checkbox-blank-outline) {
    color: rgb(var(--v-theme-primary)) !important
}
.tab-contents {
    background-color: rgb(var(--v-theme-surface-light));
}
.color-square {
    height: 25px;
    width: 25px;
    display: inline-block;
    margin: 5px 15px;
    border: 1px solid rgb(var(--v-theme-on-surface-variant));
}
.v-label {
    opacity: 1 !important;
}
.v-btn-toggle .v-btn {
    text-transform: none;
    padding: 5px;
}
</style>

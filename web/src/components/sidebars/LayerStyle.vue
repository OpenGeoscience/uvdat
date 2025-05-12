<script setup lang="ts">
import { updateLayerStyles } from '@/layers';
import { draggingPanel, selectedLayerStyles } from '@/store';
import { Layer, LayerStyle } from '@/types';
import { computed, ref, watch } from 'vue';
import _ from 'lodash';
import { getLayerStyles } from '@/api/rest';
import { defaultStyleSpec, colormaps, getDefaultColor } from '@/layerStyles';
import ColormapPreview from '../ColormapPreview.vue';

const props = defineProps<{
  layer: Layer;
}>();

const showMenu = ref(false);
const tab = ref('color')
const availableStyles = ref<LayerStyle[]>();
const currentLayerStyle = ref<LayerStyle>({name: 'Default', is_default: true});

const styleKey = computed(() => {
    return `${props.layer.id}.${props.layer.copy_id}`;
})

const currentStyleSpec = computed(() => {
    return selectedLayerStyles.value[styleKey.value];
});

const showRasterOptions = computed(() => {
    return props.layer.frames.some((frame) => frame.raster)
})

const showVectorOptions = computed(() => {
    return props.layer.frames.some((frame) => frame.vector)
})

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
        return [Math.floor(absMin), Math.ceil(absMax)];
    }
})

function selectStyle(style: LayerStyle) {
    console.log('select', style)
}

function setRowColorMode(rowName: string, colorMode: string) {
    if (colorMode === 'colormap') {
        currentStyleSpec.value.colors = currentStyleSpec.value.colors.map(
            (c) => {
                if (c.name === rowName) {
                    const terrain = colormaps.find((colormap) => colormap.name === 'terrain')
                    if (terrain) return {
                        ...c,
                        colormap: {
                            ...terrain,
                            discrete: true,
                        },
                        single_color: undefined
                    }
                }
                return c
            }
        )
    } else {
        currentStyleSpec.value.colors = currentStyleSpec.value.colors.map(
            (c) => {
                if (c.name === rowName) {
                    return {...c, colormap: undefined, single_color: getDefaultColor()}
                } else return c
            }
        )
    }
}

function cancel() {
    if (currentLayerStyle.value.style_spec) {
        selectedLayerStyles.value[styleKey.value] = currentLayerStyle.value.style_spec
    } else {
        selectedLayerStyles.value[styleKey.value] = defaultStyleSpec
    }
    showMenu.value = false;
}

function save() {
    console.log('save', currentStyleSpec.value, currentLayerStyle.value)
}

function saveAsNew() {
    console.log('saveAsNew', currentStyleSpec.value)
}

watch(draggingPanel, () => {
    showMenu.value = false;
})

watch(currentStyleSpec, _.debounce(() => {
    updateLayerStyles(props.layer)
}, 100), {deep: true})

watch(props.layer, async () => {
    availableStyles.value = await getLayerStyles(props.layer.id)
    if (props.layer.default_style) currentLayerStyle.value = props.layer.default_style
})

</script>

<template>
    <v-menu v-model="showMenu" location="end top" :close-on-content-click="false">
        <template v-slot:activator="{ props }">
            <v-icon
                v-bind="props"
                icon="mdi-cog"
            />
        </template>
        <v-card v-if="currentStyleSpec" class="layer-style-card mt-5" color="background" width="475">
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
                <v-select
                    v-model="currentLayerStyle"
                    :items="availableStyles"
                    item-title="name"
                    item-value="id"
                    label="Layer Style"
                    density="compact"
                    @update:model-value="selectStyle"
                ></v-select>

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
                    @update:model-value="(value: number) => currentStyleSpec.default_frame = value - 1 "
                >
                    <template v-slot:append>
                        <v-text-field
                            :model-value="currentStyleSpec.default_frame + 1"
                            :max="props.layer.frames.length"
                            min="1"
                            step="1"
                            density="compact"
                            class="frame-input"
                            style="width: 60px"
                            type="number"
                            hide-details
                            single-line
                            @update:model-value="(value: string) => currentStyleSpec.default_frame = parseInt(value) - 1 "
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
                            v-model="currentStyleSpec.opacity"
                            max="1"
                            min="0"
                            step="0.1"
                            density="compact"
                            class="frame-input"
                            style="width: 60px"
                            type="number"
                            hide-details
                            single-line
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
                    <v-tab value="widgets">
                        <v-icon icon="mdi-widgets" class="mr-1"/>
                        Widgets
                    </v-tab>
                </v-tabs>

                <v-window v-model="tab">
                    <v-window-item value="color" class="pa-2">
                        <div v-if="showRasterOptions">
                            <v-card-subtitle>Raster Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                        </div>
                        <div v-if="showVectorOptions">
                            <v-card-subtitle>Vector Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                            <div v-for="row in currentStyleSpec.colors">
                                <v-card-subtitle>{{ row.name.toUpperCase() }}</v-card-subtitle>
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
                                        return-object
                                    >
                                        <template v-slot:item="{ props, item }">
                                            <v-list-item v-bind="props">
                                                <template v-slot:append>
                                                    <colormap-preview :colormap="item.raw" :discrete="row.colormap.discrete || false" />
                                                </template>
                                            </v-list-item>
                                        </template>
                                        <template v-slot:selection="{ item }">
                                            <span class="pr-15">{{ item.raw.name }}</span>
                                            <colormap-preview :colormap="item.raw" :discrete="row.colormap.discrete || false" />
                                        </template>
                                    </v-select>
                                </div>
                            </div>
                        </div>
                    </v-window-item>
                    <v-window-item value="size" class="pa-2">
                        <div v-if="showRasterOptions">
                            <v-card-subtitle>Raster Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                        </div>
                        <div v-if="showVectorOptions">
                            <v-card-subtitle>Vector Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                        </div>
                    </v-window-item>
                    <v-window-item value="filters" class="pa-2">
                        <div v-if="showRasterOptions">
                            <v-card-subtitle>Raster Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                        </div>
                        <div v-if="showVectorOptions">
                            <v-card-subtitle>Vector Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                        </div>
                    </v-window-item>
                    <v-window-item value="widgets" class="pa-2">
                        <div v-if="showRasterOptions">
                            <v-card-subtitle>Raster Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
                        </div>
                        <div v-if="showVectorOptions">
                            <v-card-subtitle>Vector Options</v-card-subtitle>
                            <v-divider class="mb-2"/>
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
                <v-btn class="primary-button" @click="saveAsNew">
                    <v-icon color="button-text" class="mr-1">mdi-plus-circle</v-icon>
                    Save As New
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-menu>
</template>

<style>
.layer-style-card {
    width: 400px;
}
.layer-style-card  .v-label {
    font-size: 14px;
}
.color-square {
    height: 25px;
    width: 25px;
    display: inline-block;
    margin: 5px 15px;
}
</style>

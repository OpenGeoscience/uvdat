<script setup lang="ts">
import { computed, onMounted, Ref, ref, watch } from 'vue';
import { Layer, LayerStyle, StyleSpec } from '@/types';
import { getLayerStyles } from '@/api/rest';
import SliderNumericInput from '../SliderNumericInput.vue';

import { useStyleStore, usePanelStore, useLayerStore, useMapStore } from '@/store';
import { cloneDeep, map } from 'lodash';
import { useMapCompareStore } from '@/store/compare';
const styleStore = useStyleStore();
const panelStore = usePanelStore();
const mapStore = useMapStore();
const layerStore = useLayerStore();
const compareStore = useMapCompareStore();


const emit = defineEmits(["setLayerActive"]);
const props = defineProps<{
  compareLayer: 'A' | 'B';
  layer: Layer;
  activeLayer: Layer | undefined;
  activeCompareLayer: 'A' | 'B' | undefined;
}>();

const availableStyles = ref<LayerStyle[]>();
const currentStyleSpec = ref<StyleSpec>();

const styleKey = computed(() => {
    return `${props.layer.id}.${props.layer.copy_id}`;
})

const currentLayerStyle = computed(() => {
    return styleStore.selectedLayerStyles[styleKey.value]
})

const appliedStyleName = computed(() => {
    if (currentLayerStyle.value.id) return currentLayerStyle.value.name
    else return undefined
})

const frames = computed(() => {
    return layerStore.layerFrames(props.layer)
})

const currentFrame = computed(() => {
    return frames.value.find(
        (f) => f.index === props.layer.current_frame_index
    )
})

const mapLayerIds: Ref<string[]> = ref([]);

async function init() {
    resetCurrentStyle();
    if (props.activeLayer === props.layer && props.activeCompareLayer === props.compareLayer) {
        const foundLayerIds = mapStore.getUserMapLayers().filter((layer) => {
            const { layerId, layerCopyId, frameId } = mapStore.parseLayerString(layer);
            if (layerId === props.layer.id && layerCopyId === props.layer.copy_id) {
                return true;
            }
        })
        if (foundLayerIds.length) {
            mapLayerIds.value = foundLayerIds;
        }
        console.log(mapLayerIds.value);
        getLayerStyles(props.layer.id).then((styles) => availableStyles.value = styles)
    }
}

function resetCurrentStyle() {
    // When copying styles, use deep copies via cloneDeep
    // so that changes to the current style do not affect the original copy
    if (currentLayerStyle.value?.id) {
        // keep current style selected but discard any unsaved changes
        currentStyleSpec.value = cloneDeep(currentLayerStyle.value.style_spec)
    } else {
        // no current style selected, set one
        if (props.layer.default_style) {
            // apply layer's default style
            currentStyleSpec.value = cloneDeep(props.layer.default_style.style_spec)
        } else {
            // layer has no default style; apply None style
            currentStyleSpec.value = styleStore.getDefaultStyleSpec(currentFrame.value?.raster);
        }
    }
}


function selectStyle(style: LayerStyle) {
    mapLayerIds.value.forEach((mapLayerId) => {
        if (!currentFrame.value) return;
        if (!style.style_spec) return;
        const result = styleStore.returnMapLayerStyle(mapLayerId, style.style_spec, currentFrame.value, currentFrame.value.vector);
        if (result) {
            compareStore.updateMapLayerStyle(props.compareLayer, mapLayerId, result);
        }
    })
}

watch(() => panelStore.draggingPanel, () => {
    emit('setLayerActive', false)
})

function cancel() {
    emit('setLayerActive', false)
}

watch(() => props.activeLayer, init)
</script>

<template>
    <v-menu
        :model-value="props.activeLayer === props.layer && props.activeCompareLayer === props.compareLayer"
        location="end center"
        :close-on-content-click="false"
        persistent
        no-click-animation
        @update:model-value="emit('setLayerActive', props.activeLayer !== props.layer)"
    >
        <template v-slot:activator="{ props }">
            <v-icon
                v-bind="props"
                icon="mdi-cog"
                v-tooltip="appliedStyleName ? 'Style: ' + appliedStyleName : 'Configure styling'"
            />
        </template>
        <v-card v-if="currentStyleSpec" class="layer-style-card mt-5" color="background" width="510">
            <div class="px-4 py-2" style="background-color: rgb(var(--v-theme-surface)); height: 40px">
                Edit Style
                <span class="secondary-text">(Layer: {{ layer.name }})</span>

                <v-icon
                    icon="mdi-close"
                    style="position: absolute; top: 10px; right: 5px;"
                    v-tooltip="'Warning: unsaved changes will be discarded'"
                    @click="cancel"
                />
            </div>

            <v-card-text class="pa-2">
                <div class="d-flex mb-1 mt-4 mx-2" style="align-items: center; column-gap: 5px;">
                    <v-select
                        :model-value="currentLayerStyle"
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
                </div>

                <table class="aligned-controls px-2">
                    <tbody>
                        <tr v-if="frames.length > 1">
                            <td><v-label>Default Frame</v-label></td>
                            <td>
                                <SliderNumericInput
                                    :model="currentStyleSpec.default_frame + 1"
                                    :max="frames.length"
                                    @update="(v: number) => {if (currentStyleSpec) currentStyleSpec.default_frame = v - 1}"
                                />
                            </td>
                        </tr>
                        <tr>
                            <td><v-label color="primary-text">Opacity</v-label></td>
                            <td>
                                <SliderNumericInput
                                    :model="currentStyleSpec.opacity"
                                    :min="0.1"
                                    :max="1"
                                    :step="0.1"
                                    @update="(v: number) => {if (currentStyleSpec) currentStyleSpec.opacity = v}"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </v-card-text>
        </v-card>
    </v-menu>
</template>

<style>
.layer-style-card  .v-label {
    font-size: 14px;
}
.aligned-controls {
    padding: 0px;
    width: 100%;
}
.aligned-controls td {
    padding-bottom: 4px;
}
.aligned-controls td:first-child {
    /* minimize width of first column (labels) */
    width: 1%;
    padding-right: 10px;
    vertical-align: middle;
    align-items: center;
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
.layer-style-card .v-btn:not(.v-btn--icon) {
    padding: 8px 16px !important;
}
.v-btn-group, .v-field {
    border: 1px solid #C9CBCE !important;
    border-radius: 4px;
}
.v-btn-group .v-btn {
    text-transform: none;
    border: none;
    color: rgb(var(--v-theme-secondary-text))
}
.v-btn-group:has(.v-btn--disabled) {
    border: 1px solid #C9CBCE44 !important;
}
.v-btn-group .v-btn--active {
    background-color: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-button-text))
}
.v-btn-group .v-btn--active .v-btn__overlay {
    visibility: hidden;
}
.v-field__outline {
    visibility: hidden;
}
.layer-style-card .v-window__container {
    height: 400px!important;
    overflow-y: auto;
    overflow-x: hidden;
}
.filter-card {
    padding: 8px !important;
    margin-top: 8px;
    background-color: rgb(var(--v-theme-background)) !important;
    border: 1px solid rgb(var(--v-theme-border)) !important;
    box-shadow: none !important;
}
.filter-card.highlight {
    box-shadow: 0 0 1px 2px rgb(var(--v-theme-primary)) !important;
}
</style>

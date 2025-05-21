<script setup lang="ts">
import { Layer } from "@/types";
import { computed, ref } from "vue";
import draggable from "vuedraggable";
import LayerStyle from "./LayerStyle.vue";
import DetailView from "../DetailView.vue";

import { useLayerStore } from "@/store";
const layerStore = useLayerStore();

const searchText = ref();
const filteredLayers = computed(() => {
    return layerStore.selectedLayers?.filter((layer: Layer) => {
        return  !searchText.value ||
        layer.name.toLowerCase().includes(searchText.value.toLowerCase())
    })
})

function removeLayers(layers: Layer[]) {
    layerStore.selectedLayers = layerStore.selectedLayers.filter((layer: Layer) => !layers.includes(layer))
}

function setVisibility(layers: Layer[], visible=true) {
    layerStore.selectedLayers = layerStore.selectedLayers.map((layer: Layer) => {
        if (layers.includes(layer)) layer.visible = visible;
        return layer
    })
}

function updateFrame(layer: Layer, value: number) {
    value = value - 1;  // slider values are 1-indexed
    layerStore.selectedLayers = layerStore.selectedLayers.map((l: Layer) => {
        if (l.id === layer.id && l.copy_id === layer.copy_id) {
            l.current_frame = value;
        }
        return l;
    })
}

function getLayerMaxFrames(layer: Layer) {
    return [...new Set(layer.frames.map((f) => f.index))].length
}

function getFrameInputWidth(layer: Layer) {
    // With a minimum of 40 pixels, add 10 pixels for each digit shown in the input
    let width = 40;
    width += layer.current_frame.toString().length * 10;
    width += layer.frames.length.toString().length * 10;
    return width + 'px';
}
</script>

<template>
    <div class="panel-content-outer with-search">
        <v-text-field
            v-model="searchText"
            label="Search Selected Layers"
            variant="outlined"
            density="compact"
            class="mb-2"
            append-inner-icon="mdi-magnify"
            hide-details
        />
        <v-card class="panel-content-inner">
            <div class="layers-header" v-if="filteredLayers?.length">
                <v-icon
                    color="primary"
                    icon="mdi-close"
                    @click="() => removeLayers(layerStore.selectedLayers)"
                    class="secondary-button"
                />
                <v-checkbox-btn
                    :model-value="layerStore.selectedLayers.every((l: Layer) => l.visible)"
                    @click="() => setVisibility(layerStore.selectedLayers, !layerStore.selectedLayers.every((l: Layer) => l.visible))"
                    style="display: inline"
                />
            </div>
            <v-list
                v-if="filteredLayers?.length"
                density="compact"
            >
                <draggable
                    v-model="layerStore.selectedLayers"
                    item-key="id"
                >
                    <template #item="{ element }">
                        <div>
                            <v-list-item class="layer">
                                <template v-slot:prepend>
                                    <v-icon
                                        color="primary"
                                        icon="mdi-close"
                                        @click="() => removeLayers([element])"
                                        class="secondary-button"
                                    />
                                    <v-checkbox-btn
                                        :model-value="element.visible"
                                        @click="() => setVisibility([element], !element.visible)"
                                        style="display: inline"
                                    />
                                </template>
                                {{ element.name }}
                                <template v-slot:append>
                                    <span
                                        v-if="getLayerMaxFrames(element) > 1"
                                        @click="element.hideFrameMenu = !element.hideFrameMenu"
                                    >
                                        <v-icon icon="mdi-dots-horizontal"/>
                                        <v-icon :icon="element.hideFrameMenu ? 'mdi-menu-down' :'mdi-menu-up'" />
                                    </span>
                                    <LayerStyle :layer="element" />
                                    <span class="material-symbols-outlined" style="cursor: grab;">
                                        format_line_spacing
                                    </span>
                                </template>
                            </v-list-item>
                            <div v-if="getLayerMaxFrames(element) > 1 && !element.hideFrameMenu" class="frame-menu">
                                <v-slider
                                    :model-value="element.current_frame + 1"
                                    :max="getLayerMaxFrames(element)"
                                    min="1"
                                    color="primary"
                                    show-ticks="always"
                                    tick-size="6"
                                    thumb-size="15"
                                    track-size="8"
                                    step="1"
                                    hide-details
                                    type="number"
                                    @update:modelValue="(value: number) => updateFrame(element, value)"
                                >
                                <template v-slot:append>
                                    <v-text-field
                                        :model-value="element.current_frame + 1"
                                        :max="getLayerMaxFrames(element)"
                                        min="1"
                                        density="compact"
                                        class="number-input"
                                        :style="{'width': getFrameInputWidth(element)}"
                                        type="number"
                                        hide-details
                                        single-line
                                        @update:modelValue="(value: string) => updateFrame(element, parseInt(value))"
                                    >
                                        <template v-slot:default>
                                            {{ element.current_frame + 1 }}/{{ getLayerMaxFrames(element) }}
                                        </template>
                                    </v-text-field>
                                    </template>
                                </v-slider>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>
                                        <i>Frame:</i> {{ element.frames[element.current_frame].name }}
                                    </span>
                                    <DetailView :details="{...element.frames[element.current_frame], type: 'frame'}"/>
                                </div>
                            </div>
                        </div>
                    </template>
                </draggable>
            </v-list>
            <v-card-text v-else class="help-text">No selected layers.</v-card-text>
        </v-card>
    </div>
</template>

<style>
.layers-header {
    position: sticky;
    height: 30px;
    border-bottom: 1px solid rgb(var(--v-theme-on-surface-variant));
    margin: 4px;
}
.layer.v-list-item {
    padding: 0px 4px !important;
    position: relative;
    min-height: 0 !important;
}
.layer .v-list-item__prepend .v-list-item__spacer,
.layer .v-list-item__append .v-list-item__spacer {
    width: 5px !important;
}
.layer .v-list-item__prepend {
  align-self: baseline !important;
}
.layer .v-list-item__append {
    align-self: start;
}
.layer .v-list-item__content {
  align-self: normal !important;
}
.frame-menu {
    padding: 0px 20px;
    margin-bottom: 5px;
}
.frame-menu .v-input__append {
    margin-left: 15px !important;
}
.number-input .v-field__input {
    padding: 0px 5px;
    min-height: 0;
}
.number-input .v-field__input input {
    /* make default input number transparent */
    color: rgba(0, 0, 0, 0);
}
.v-selection-control--density-default {
  --v-selection-control-size: 20px!important;
}
</style>

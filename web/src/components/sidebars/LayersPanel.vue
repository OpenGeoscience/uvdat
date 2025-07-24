<script setup lang="ts">
import { debounce } from "lodash"
import { Layer } from "@/types";
import { computed, ref } from "vue";
import draggable from "vuedraggable";
import LayerStyle from "./LayerStyle.vue";
import DetailView from "../DetailView.vue";
import SliderNumericInput from '../SliderNumericInput'

import { useLayerStore, useMapStore } from "@/store";
const layerStore = useLayerStore();
const mapStore = useMapStore()

const searchText = ref<string | undefined>();
const filteredLayers = computed(() => {
    return layerStore.selectedLayers?.filter((layer: Layer) => {
        return  !searchText.value ||
        layer.name.toLowerCase().includes(searchText.value.toLowerCase())
    })
})
const allLayersVisible = computed(() => layerStore.selectedLayers.every((l: Layer) => l.visible))
const activeLayer = ref<Layer>();

function removeLayers(layers: Layer[]) {
    layerStore.selectedLayers = layerStore.selectedLayers.filter((layer: Layer) => !layers.includes(layer))

    const layerIds = layers.map((layer) => layerStore.getMapLayersFromLayerObject(layer)).flat();
    mapStore.removeLayers(layerIds);
}

function setVisibility(layers: Layer[], visible=true) {
    layerStore.selectedLayers = layerStore.selectedLayers.map((layer: Layer) => {
        if (layers.includes(layer)) layer.visible = visible;
        return layer
    })
}

const debouncedUpdateFrame = debounce((layer: Layer, value: number) => {
    layerStore.selectedLayers = layerStore.selectedLayers.map((l: Layer) => {
        if (l.id === layer.id && l.copy_id === layer.copy_id) {
            l.current_frame_index = value;
        }
        return l;
    })
}, 10)

function getLayerMaxFrames(layer: Layer) {
    return new Set(
        layerStore.layerFrames(layer).map((f) => f.index)
    ).size
}

function getLayerCurrentFrames(layer: Layer) {
    return layerStore.layerFrames(layer).filter((frame) => frame.index === layer.current_frame_index)
}

function setLayerActive(layer: Layer, active: boolean) {
    if (active) activeLayer.value = layer
    else activeLayer.value = undefined
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
                    @click="setVisibility(layerStore.selectedLayers, !allLayersVisible)"
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
                            <v-list-item class="layer" :active="activeLayer == element">
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
                                    <LayerStyle :layer="element" :activeLayer="activeLayer" @setLayerActive="(v: boolean) => setLayerActive(element, v)"/>
                                    <span class="v-icon material-symbols-outlined" style="cursor: grab;">
                                        format_line_spacing
                                    </span>
                                </template>
                            </v-list-item>
                            <div v-if="getLayerMaxFrames(element) > 1 && !element.hideFrameMenu" class="frame-menu">
                                <SliderNumericInput
                                    :model="element.current_frame_index + 1"
                                    :max="getLayerMaxFrames(element)"
                                    @update="(v: number) => debouncedUpdateFrame(element, v - 1)"
                                />
                                <div
                                    v-for="frame in getLayerCurrentFrames(element)"
                                    style="display: flex; justify-content: space-between;"
                                >
                                    <span>
                                        <i>Frame:</i> {{ frame.name }}
                                    </span>
                                    <DetailView :details="{...frame, type: 'frame'}"/>
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
.layer.v-list-item--active {
    background-color: rgba(var(--v-theme-primary), 0.1);
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
.v-selection-control--density-default {
  --v-selection-control-size: 20px!important;
}
</style>

<script setup lang="ts">
import { selectedLayers } from "@/store";
import { Layer } from "@/types";
import { computed, ref } from "vue";

import draggable from "vuedraggable";


const searchText = ref();
const filteredLayers = computed(() => {
    return selectedLayers.value?.filter((layer) => {
        return  !searchText.value ||
        layer.name.toLowerCase().includes(searchText.value.toLowerCase())
    })
})

function removeLayers(layers: Layer[]) {
    selectedLayers.value = selectedLayers.value.filter((layer) => !layers.includes(layer))
}

function setVisibility(layers: Layer[], visible=true) {
    selectedLayers.value = selectedLayers.value.map((layer) => {
        if (layers.includes(layer)) layer.visible = visible;
        return layer
    })
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
                    color="secondary"
                    icon="mdi-close"
                    @click="() => removeLayers(selectedLayers)"
                    style="vertical-align: inherit;"
                />
                <v-checkbox-btn
                    :model-value="selectedLayers.every((l) => l.visible)"
                    @click="() => setVisibility(selectedLayers, !selectedLayers.every((l) => l.visible))"
                    style="display: inline"
                />
            </div>
            <v-list
                v-if="filteredLayers?.length"
                density="compact"
            >
                <draggable
                    v-model="selectedLayers"
                    item-key="id"
                >
                    <template #item="{ element }">
                        <v-list-item>
                            <v-icon
                                color="secondary"
                                icon="mdi-close"
                                @click="() => removeLayers([element])"
                                style="vertical-align: inherit;"
                            />
                            <v-checkbox-btn
                                :model-value="element.visible"
                                @click="() => setVisibility([element], !element.visible)"
                                style="display: inline"
                            />
                            {{ element.name }}
                            <template v-slot:append>
                                <v-icon icon="mdi-drag-horizontal" size="small" class="ml-2"></v-icon>
                            </template>
                        </v-list-item>
                    </template>
                </draggable>
            </v-list>
            <v-card-text v-else>No selected layers.</v-card-text>
        </v-card>
    </div>
</template>

<style>
.layers-header {
    position: sticky;
    height: 30px;
    border-bottom: 1px solid rgb(var(--v-theme-on-surface-variant));
    margin: 4px 8px;
    padding: 4px 8px;
}
</style>

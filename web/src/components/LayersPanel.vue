<script setup lang="ts">
import { selectedLayers } from "@/store";
import { computed, ref } from "vue";

import draggable from "vuedraggable";


const searchText = ref();
const filteredLayers = computed(() => {
    return selectedLayers.value?.filter((layer) => {
        return  !searchText.value ||
        layer.name.toLowerCase().includes(searchText.value.toLowerCase())
    })
})

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

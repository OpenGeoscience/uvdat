<script setup lang="ts">
import { computed, ref } from "vue";

import { useLayerStore, useMapStore } from "@/store";
import { useMapCompareStore } from "@/store/compare";
const compareStore = useMapCompareStore();

const mapALayerItems = computed(() => compareStore.displayLayers.mapLayerA);
const mapBLayerItems = computed(() => compareStore.displayLayers.mapLayerB);
const expansionPanelsOpen = ref<string[]>(['A', 'B']);

const setVisibility = (map: 'A' | 'B', displayName: string, visible=true) => {
    const layerItem = (map === 'A' ? mapALayerItems.value : mapBLayerItems.value).find((l) => l.displayName === displayName);
    if (layerItem) {
        layerItem.state = visible;
    }
};

</script>

<template>
    <div class="panel-content-outer with-search">
        <v-card>
            <v-expansion-panels flat v-if="mapALayerItems?.length || mapBLayerItems?.length" v-model="expansionPanelsOpen" multiple>
                <v-expansion-panel class="mb-2 bg-transparen" value="A">
                    <v-expansion-panel-title class="tag-filter-title">
                    {{ compareStore.orientation === 'vertical' ? 'Left Map' : 'Top Map' }}
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <v-list
                            v-if="mapALayerItems?.length"
                            density="compact"
                        >
                            <div class="panel-content-inner">
                                <v-list-item class="layer" v-for="element in mapALayerItems" :key="`A_${element.displayName}`">
                                    <template v-slot:prepend>
                                        <v-checkbox-btn
                                            :model-value="element.state"
                                            @click="() => setVisibility('A', element.displayName, !element.state)"
                                            style="display: inline"
                                        />
                                    </template>
                                    {{ element.displayName }}
                                </v-list-item>
                            </div>
                        </v-list>
                    </v-expansion-panel-text>
                </v-expansion-panel>
                <v-expansion-panel class="mb-2 bg-transparent" value="B">
                    <v-expansion-panel-title class="tag-filter-title">
                    {{ compareStore.orientation === 'vertical' ? 'Right Map' : 'Bottom Map' }}
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <v-list
                            v-if="mapBLayerItems?.length"
                            density="compact"
                        >
                            <div class="panel-content-inner">
                                <v-list-item class="layer" v-for="element in mapBLayerItems" :key="`B_${element.displayName}`">
                                    <template v-slot:prepend>
                                        <v-checkbox-btn
                                            :model-value="element.state"
                                            @click="() => setVisibility('B', element.displayName, !element.state)"
                                            style="display: inline"
                                        />
                                    </template>
                                    {{ element.displayName }}
                                </v-list-item>
                            </div>
                        </v-list>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>
        </v-card>
    </div>
</template>

<style>
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
.v-list-item__prepend > .v-icon {
    opacity: 1
}
.tag-filter-title {
  padding: 0px 0px 4px 0px !important;
  min-height: 0px!important;
  font-size: inherit!important;
}

</style>

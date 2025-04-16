<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { loadingNetworks, availableNetworks, currentNetwork } from '@/store';
import { getNetworkNodes, getNetworkEdges } from '@/api/rest';
import { NetworkNode, NetworkEdge } from '@/types';
import { isVisible, show } from '@/storeFunctions';

import MetadataView from "../MetadataView.vue";


const searchText = ref();
const filteredNetworks = computed(() => {
    return availableNetworks.value?.filter((network) => {
        return !searchText.value ||
            network.name.toLowerCase().includes(searchText.value.toLowerCase())
    })
})

const tab = ref();
const currentNodes = ref<NetworkNode[]>([]);
const selectedNodes = ref<NetworkNode[]>([]);
const currentEdges = ref<NetworkEdge[]>([]);

const headers = [
    { title: 'Name', value: 'name', align: 'left', sortable: true },
    { title: '', value: 'metadata', align: 'right', sortable: false, width: 20 },
]

watch(currentNetwork, () => {
    searchText.value = ''
    if (currentNetwork.value) {
        getNetworkNodes(currentNetwork.value.id).then((nodes) => {
            currentNodes.value = nodes;
        })
        getNetworkEdges(currentNetwork.value.id).then((edges) => {
            currentEdges.value = edges;
        })
    } else {
        currentNodes.value = [];
        currentEdges.value = [];
    }
})
</script>

<template>
    <div :class="currentNetwork ? 'panel-content-outer' : 'panel-content-outer with-search'">
        <v-text-field
            v-if="!currentNetwork"
            v-model="searchText"
            label="Search Networks"
            variant="outlined"
            density="compact"
            class="mb-2"
            append-inner-icon="mdi-magnify"
            hide-details
        />
        <v-card class="panel-content-inner">
            <div v-if="currentNetwork">
                <div class="network-title">
                    <div>
                        {{ currentNetwork.name }}
                        <v-btn
                            v-if="!isVisible({...currentNetwork, type: 'Network'})"
                            @click="show({...currentNetwork, type: 'Network'})"
                            density="compact"
                        >
                            Show
                        </v-btn>
                    </div>
                    <v-btn
                        v-tooltip="'Close'"
                        icon="mdi-close"
                        variant="plain"
                        @click="currentNetwork = undefined"
                    />
                </div>
                <v-text-field
                    v-model="searchText"
                    label="Search Nodes and Edges"
                    variant="outlined"
                    density="compact"
                    class="mb-2"
                    append-inner-icon="mdi-magnify"
                    hide-details
                />
                <v-tabs v-model="tab" align-tabs="center" fixed-tabs>
                    <v-tab value="nodes">Nodes</v-tab>
                    <v-tab value="edges">Edges</v-tab>
                    </v-tabs>

                    <v-window v-model="tab">
                        <v-window-item value="nodes">
                            <v-data-table
                                :items="currentNodes"
                                :headers="headers"
                                :search="searchText"
                                v-model:selected="selectedNodes"
                                items-per-page="100"
                                class="transparent"
                                show-select
                            >
                                <template v-slot:item.metadata="{ item }">
                                    <MetadataView :metadata="item.metadata" :name="item.name" />
                                </template>
                            </v-data-table>
                        </v-window-item>
                        <v-window-item value="edges">
                            <v-data-table
                                :items="currentEdges"
                                :headers="headers"
                                :search="searchText"
                                items-per-page="100"
                                class="transparent"
                            >
                                <template v-slot:item.metadata="{ item }">
                                    <MetadataView :metadata="item.metadata" :name="item.name" />
                                </template>
                            </v-data-table>
                        </v-window-item>
                    </v-window>
            </div>
            <div v-else-if="filteredNetworks?.length">
                <v-list density="compact">
                    <v-list-item
                        v-for="network in filteredNetworks"
                        :key="network.id"
                        @click="currentNetwork = network"
                    >
                        {{ network.name }}
                        <template v-slot:append>
                            <v-icon v-if="network.description" icon="mdi-information-outline" size="small" v-tooltip="network.description"></v-icon>
                            <v-icon icon="mdi-transit-connection-variant" size="small" class="ml-2"></v-icon>
                            <MetadataView :metadata="network.metadata" :name="network.name" />
                        </template>
                    </v-list-item>
                </v-list>
            </div>
            <v-progress-linear v-else-if="loadingNetworks" indeterminate></v-progress-linear>
            <v-card-text v-else class="help-text">No available Networks.</v-card-text>
        </v-card>
    </div>
</template>

<style>
.network-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
}
</style>

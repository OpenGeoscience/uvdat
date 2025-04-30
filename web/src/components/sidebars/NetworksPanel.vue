<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { getNetworkNodes, getNetworkEdges } from '@/api/rest';
import { isVisible, show } from '@/storeFunctions';
import { styleNetwork } from '@/layerStyles';
import { setNetworkDeactivatedNodes } from "@/networks";
import {
    loadingNetworks,
    availableNetworks,
    currentNetwork,
    currentNetworkNodes,
    currentNetworkEdges,
} from '@/store';

import MetadataView from "../MetadataView.vue";


const searchText = ref();
const filteredNetworks = computed(() => {
    return availableNetworks.value?.filter((network) => {
        return !searchText.value ||
            network.name.toLowerCase().includes(searchText.value.toLowerCase())
    })
})

const tab = ref();
const selectedNodes = ref<number[]>([]);
const currentNodes = computed(() => {
    return currentNetworkNodes.value.map((n) => {
        n.active = !currentNetwork.value?.deactivated?.nodes?.includes(n.id)
        return n
    })
})
const currentEdges = computed(() => {
    return currentNetworkEdges.value.map((e) => {
        e.active = (
            !currentNetwork.value?.deactivated?.nodes?.includes(e.from_node) &&
            !currentNetwork.value?.deactivated?.nodes?.includes(e.to_node)
        )
        return e
    })
})

const headers = [
    { title: '', value: 'active', sortable: true, width: 10 },
    { title: 'Name', value: 'name', sortable: true },
    { title: '', value: 'metadata', sortable: false, width: 10 },
]

function showNetwork(network: any) {
    show(network)
    styleNetwork(network)
}

function toggleSelected() {
    if (currentNetwork.value) {
        let deactivated = currentNetwork.value?.deactivated?.nodes || []
        if (selectedNodes.value.every((n) => deactivated.includes(n))) {
            deactivated = deactivated.filter((n) => !selectedNodes.value.includes(n))
        } else {
            deactivated = [
                ...deactivated,
                ...selectedNodes.value,
            ]
        }
        setNetworkDeactivatedNodes(
            currentNetwork.value,
            deactivated,
        )
    }
}

watch(currentNetwork, () => {
    searchText.value = ''
    if (currentNetwork.value) {
        currentNetwork.value.selected = {
            nodes: [],
            edges: [],
        }
        getNetworkNodes(currentNetwork.value.id).then((results) => {
            currentNetworkNodes.value = results;
        })
        getNetworkEdges(currentNetwork.value.id).then((results) => {
            currentNetworkEdges.value = results;
        })
    } else {
        currentNetworkNodes.value = [];
        currentNetworkEdges.value = [];
    }
})

watch(selectedNodes, () => {
    if (currentNetwork.value) {
        if (!currentNetwork.value.selected) {
            currentNetwork.value.selected = { nodes: [], edges: [] }
        }
        currentNetwork.value.selected.nodes = selectedNodes.value;
        styleNetwork(currentNetwork.value)
    }
}, {deep: true})
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
                        <div>{{ currentNetwork.name }}</div>
                        <v-btn
                            v-if="!isVisible({...currentNetwork, type: 'Network'})"
                            @click="showNetwork({...currentNetwork, type: 'Network'})"
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
                    <v-tab value="nodes-tab">Nodes</v-tab>
                    <v-tab value="edges-tab">Edges</v-tab>
                    </v-tabs>

                    <v-window v-model="tab">
                        <v-window-item value="nodes-tab">
                            <v-data-table
                                v-model="selectedNodes"
                                :items="currentNodes"
                                :headers="headers"
                                :search="searchText"
                                items-per-page="100"
                                class="transparent"
                                show-select
                            >
                                <template v-slot:item.active="{ item }">
                                    <v-icon
                                        :icon="item.active ? 'mdi-circle-outline' : 'mdi-close'"
                                        :color="item.active ? 'green' : 'red'"
                                    />
                                </template>
                                <template v-slot:item.metadata="{ item }">
                                    <MetadataView :metadata="item.metadata" :name="item.name" />
                                </template>
                            </v-data-table>
                        </v-window-item>
                        <v-window-item value="edges-tab">
                            <v-data-table
                                :items="currentEdges"
                                :headers="headers"
                                :search="searchText"
                                items-per-page="100"
                                class="transparent"
                            >
                                <template v-slot:item.active="{ item }">
                                    <v-icon
                                        :icon="item.active ? 'mdi-circle-outline' : 'mdi-close'"
                                        :color="item.active ? 'green' : 'red'"
                                    />
                                </template>
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
                            <v-icon icon="mdi-transit-connection-variant" size="small" class="ml-2"></v-icon>
                            <MetadataView :metadata="network.metadata" :name="network.name" />
                        </template>
                    </v-list-item>
                </v-list>
            </div>
            <v-progress-linear v-else-if="loadingNetworks" indeterminate></v-progress-linear>
            <v-card-text v-else class="help-text">No available Networks.</v-card-text>
        </v-card>
        <v-btn
            class="toggle-btn"
            v-if="currentNetwork && tab == 'nodes-tab' && selectedNodes.length"
            @click="toggleSelected"
        >
            Toggle Selected
        </v-btn>
    </div>
</template>

<style>
.network-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
}
.toggle-btn {
    position: absolute !important;
    bottom: 20px;
    right: 15px;
    z-index: 1;
}
.v-data-table__td {
    padding: 0px 4px !important;
}
</style>

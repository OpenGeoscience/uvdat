<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { getNetworkNodes, getNetworkEdges } from '@/api/rest';
import { isVisible, show } from '@/panelFunctions';
import { styleNetwork } from '@/layerStyles';
import { setNetworkDeactivatedNodes } from "@/networks";
import {
    loadingNetworks,
    availableNetworks,
    currentNetwork,
    currentNetworkNodes,
    currentNetworkEdges,
} from '@/store';

import DetailView from "../DetailView.vue";
import { NetworkEdge, NetworkNode } from "@/types";


const searchText = ref();
const filteredNetworks = computed(() => {
    return availableNetworks.value?.filter((network) => {
        return !searchText.value ||
            network.name.toLowerCase().includes(searchText.value.toLowerCase())
    })
})

const tab = ref();
const sort = ref([{key: 'active', order: true}]);
const hoverNode = ref<NetworkNode>();
const hoverEdge = ref<NetworkEdge>();
const selectedNodes = ref<number[]>([]);

function sortEdgeOrNode(a: NetworkNode | NetworkEdge, b: NetworkNode | NetworkEdge) {
    if (typeof a !== typeof b) {
        throw new Error('Cannot compare network nodes against edges');
    }

    const activeComp = Number(a.active) - Number(b.active);
    if (activeComp !== 0) {
        return activeComp;
    }

    // Sort by name if their active status is equal
    if (a.name < b.name) {
        return -1;
    }
    return 1;
}

const currentNodes = computed(() =>
  currentNetworkNodes.value
    .map((n) => ({
      ...n,
      active: !currentNetwork.value?.deactivated?.nodes?.includes(n.id),
    }))
    .toSorted(sortEdgeOrNode)
);

const currentEdges = computed(() =>
  currentNetworkEdges.value
    .map((e) => ({
      ...e,
      active:
        !currentNetwork.value?.deactivated?.nodes?.includes(e.from_node) &&
        !currentNetwork.value?.deactivated?.nodes?.includes(e.to_node),
    }))
    .toSorted(sortEdgeOrNode)
);

const headers = [
    { title: '', value: 'active', sortable: false, width: 10 },
    { title: 'Name', value: 'name', sortable: false },
    { title: '', value: 'metadata', sortable: false, width: 10 },
]

function showNetwork() {
    if (currentNetwork.value) {
        show({network: currentNetwork.value})
        styleNetwork(currentNetwork.value)
    }
}

function isNetworkVisible() {
    if (currentNetwork.value) {
        return isVisible({network: currentNetwork.value})
    }
    return true
}

function resetNetwork() {
    if (currentNetwork.value) {
        selectedNodes.value = []
        setNetworkDeactivatedNodes(currentNetwork.value, [])
    }
}

function toggleSelected() {
    if (currentNetwork.value) {
        if (!isNetworkVisible()) showNetwork()

        // Any selected nodes that are already deactivated should be removed
        // from both sets, since they now need to be activated, and both sets
        // are used to set the new deactivated value.
        let deactiveNodeSet = new Set(currentNetwork.value?.deactivated?.nodes);
        let selectedNodeSet = new Set(selectedNodes.value);
        const nodesToRemove = deactiveNodeSet.intersection(selectedNodeSet);
        deactiveNodeSet = deactiveNodeSet.difference(nodesToRemove);
        selectedNodeSet = selectedNodeSet.difference(nodesToRemove);

        const deactivated = Array.from(deactiveNodeSet.union(selectedNodeSet));
        setNetworkDeactivatedNodes(
            currentNetwork.value,
            deactivated,
        )

        selectedNodes.value = [];
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

watch([selectedNodes, hoverNode, hoverEdge], () => {
    if (currentNetwork.value) {
        if (!currentNetwork.value.selected) {
            currentNetwork.value.selected = { nodes: [], edges: [] }
        }
        if (hoverNode.value) {
            currentNetwork.value.selected.nodes = [
                ...selectedNodes.value,
                hoverNode.value.id,
            ]
        } else if (hoverEdge.value) {
            currentNetwork.value.selected.edges = [hoverEdge.value.id]
        } else {
            currentNetwork.value.selected.nodes = selectedNodes.value;

        }
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
                            v-if="!isNetworkVisible()"
                            @click="showNetwork()"
                            density="compact"
                        >
                            Show
                        </v-btn>
                        <v-btn @click="resetNetwork()" density="compact">
                            Reset
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
                                v-model:sort-by="sort"
                                :items="currentNodes"
                                :headers="headers"
                                :search="searchText"
                                items-per-page="-1"
                                item-value="id"
                                class="transparent"
                                show-select
                                hide-default-footer
                                @mouseover:row="(e: Event, data: any) => hoverNode=data.item"
                                @mouseleave:row="() => hoverNode=undefined"
                            >
                                <template v-slot:item.active="{ item }">
                                    <v-icon
                                        :icon="item.active ? 'mdi-circle-outline' : 'mdi-close'"
                                        :color="item.active ? 'green' : 'red'"
                                    />
                                </template>
                                <template v-slot:item.metadata="{ item }">
                                    <DetailView :details="{...item, type: 'networknode'}" />
                                </template>
                            </v-data-table>
                        </v-window-item>
                        <v-window-item value="edges-tab">
                            <v-data-table
                                v-model:sort-by="sort"
                                :items="currentEdges"
                                :headers="headers"
                                :search="searchText"
                                items-per-page="-1"
                                class="transparent"
                                item-value="id"
                                hide-default-footer
                                @mouseover:row="(e: Event, data: any) => hoverEdge=data.item"
                                @mouseleave:row="() => hoverEdge=undefined"
                            >
                                <template v-slot:item.active="{ item }">
                                    <v-icon
                                        :icon="item.active ? 'mdi-circle-outline' : 'mdi-close'"
                                        :color="item.active ? 'green' : 'red'"
                                    />
                                </template>
                                <template v-slot:item.metadata="{ item }">
                                    <DetailView :details="{...item, type: 'networkedge'}" />
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
                            <DetailView :details="{...network, type: 'network'}" />
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

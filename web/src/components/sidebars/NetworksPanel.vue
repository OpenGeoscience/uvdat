<script setup lang="ts">
import { ref, computed } from "vue";
import { availableNetworks, currentNetwork } from '@/store';

import MetadataView from "../MetadataView.vue";


const searchText = ref();
const filteredNetworks = computed(() => {
    return availableNetworks.value?.filter((network) => {
        return !searchText.value ||
            network.name.toLowerCase().includes(searchText.value.toLowerCase())
    })
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
            <div v-if="currentNetwork" class="network-title">
                {{ currentNetwork.name }}
                <v-btn
                    v-tooltip="'Close'"
                    icon="mdi-close"
                    variant="plain"
                    @click="currentNetwork = undefined"
                />
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

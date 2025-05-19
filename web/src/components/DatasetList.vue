<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { Dataset } from "@/types";

import { useProjectStore } from "@/store";
const projectStore = useProjectStore();

const props = defineProps<{
    datasets: Dataset[] | undefined;
}>();

const searchText = ref();
const filteredDatasets = computed(() => {
  return props.datasets?.filter((dataset: any) => {
    return  !searchText.value ||
    dataset.name.toLowerCase().includes(searchText.value.toLowerCase())
  });
});
const datasetGroups = computed(() => {
  const groupByKey = "category"
  const groups: Record<string, Dataset[]> = {};
  filteredDatasets.value?.forEach((dataset: any) => {
    const groupName = dataset[groupByKey];
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(dataset);
  });
  return groups;
});
const expandedGroups = ref();

function expandAllGroups() {
  if (!expandedGroups.value && filteredDatasets.value) {
    expandedGroups.value = Object.keys(datasetGroups.value)
  }
}

onMounted(expandAllGroups);
watch(filteredDatasets, expandAllGroups)
</script>

<template>
  <div class="panel-content-outer with-search">
    <v-text-field
      v-model="searchText"
      label="Search Datasets"
      variant="outlined"
      density="compact"
      class="mb-2"
      append-inner-icon="mdi-magnify"
      hide-details
    />
    <v-card class="panel-content-inner">
      <v-expansion-panels
        v-if="props.datasets?.length"
        v-model="expandedGroups"
        variant="accordion"
        class="dataset-list ml-4 pr-4"
        style="height: fit-content;"
        multiple
        flat
      >
        <v-expansion-panel
          v-for="[groupName, groupDatasets] in Object.entries(datasetGroups)"
          :key="groupName"
          :value="groupName"
          bg-color="background"
        >
          <v-expansion-panel-title style="font-weight: bold" class="ml-0">
            <span class="capitalize secondary-text">{{ groupName }}</span>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <slot name="list" :data="groupDatasets"></slot>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <v-progress-linear v-else-if="projectStore.loadingDatasets" indeterminate></v-progress-linear>
      <v-card-text class="help-text" v-else>No available Datasets.</v-card-text>
    </v-card>
  </div>
</template>

<style>
.dataset-list {
  height: 100%;
  width: calc(100% - 20px) !important;
  overflow-y: auto;
  overflow-x: hidden;
}
.dataset-list .v-expansion-panel-title {
  min-height: 0 !important;
  display: flex;
  justify-content: space-between;
  padding: 12px 0px !important;
}
.dataset-list .v-selection-control__input, .dataset-list .v-selection-control__wrapper {
  height: inherit;
}
.dataset-list .v-list-item--density-default {
  min-height: 0;
}
.v-selection-control--density-default {
  --v-selection-control-size: 20px;
}
.capitalize {
  text-transform: capitalize !important;
}
.secondary-text {
  color: rgb(var(--v-theme-secondary-text))
}
.item-title {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  margin-left: 24px;
  width: 100%;
}
.item-title + .v-expansion-panel-title__icon {
  position: absolute !important;
  left: 0 !important;
}
</style>

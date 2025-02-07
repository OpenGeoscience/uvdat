<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { onMounted, ref, computed, watch } from "vue";
import { VTreeview } from 'vuetify/labs/VTreeview'
import { Dataset, Layer } from "@/types";
import { loadingDatasets, mapSources, selectedLayers } from "@/store";

const props = withDefaults(
  defineProps<{
    datasets: Dataset[] | undefined;
    selectedIds?: number[];
    eyeIcon?: boolean;
    idPrefix?: string;
  }>(),
  {
    eyeIcon: false,
    idPrefix: "",
  }
);
const emit = defineEmits(["toggleDatasets"]);

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


function toggleSelected(items: (Dataset | Layer)[]) {
  // https://stackoverflow.com/a/60334473
  if (items.every((i) => (<Dataset>i).layers)) {
    // list of Datasets
    emit("toggleDatasets", items);
  } else if (items.every((i) => (<Layer>i).frames)) {
    // list of Layers
    items.forEach((item) => {
      const layer = item as Layer;
      let name = layer.name;
      let copy_id = 0;
      const existing = Object.keys(mapSources.value).filter((sourceId) => {
        const [layerId] = sourceId.split('.');
        return parseInt(layerId) === layer.id
      })
      if (existing.length) {
        copy_id = existing.length;
        name = `${layer.name} (${copy_id})`;
      }
      selectedLayers.value = [
        {...layer, name, copy_id, visible: true, current_frame: 0},
        ...selectedLayers.value,
      ];
    })
  }
}

function expandAllDatasets() {
  if (!expandedGroups.value && filteredDatasets.value) {
    expandedGroups.value = Object.keys(datasetGroups.value)
  }
}

onMounted(expandAllDatasets);

watch(filteredDatasets, expandAllDatasets)
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
        class="dataset-list"
        multiple
      >
        <v-expansion-panel
          v-for="[groupName, groupDatasets] in Object.entries(datasetGroups)"
          :key="groupName"
          :value="groupName"
        >
          <v-expansion-panel-title style="font-weight: bold" class="capitalize">
            {{ groupName }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-treeview
              :items="groupDatasets"
              item-value="id"
              item-title="name"
              item-children="layers"
              open-on-click
            >
              <template v-slot:title="{title, item}">
                <div class="dataset-title">
                  <div style="text-wrap: wrap; align-items: center;">
                    <v-icon
                      v-if="!item.layers && !props.selectedIds"
                      icon="mdi-plus"
                      size="small"
                      color="primary"
                      v-tooltip="'Add to Selected Layers'"
                      @click="() => toggleSelected([item])"
                    ></v-icon>
                    <v-checkbox-btn
                      v-else-if="item.layers && props.selectedIds"
                      :model-value="props.selectedIds.includes(item.id)"
                      @click="() => toggleSelected([item])"
                      style="display: inline"
                    />
                    {{ title }}
                  </div>
                  <div v-if="item.layers">
                    <v-icon
                      icon="mdi-layers"
                      size="small"
                      v-tooltip="item.layers.length + ' layers'"
                      class="ml-2"
                    ></v-icon>
                    {{ item.layers.length }}
                    <v-icon
                      icon="mdi-information-outline"
                      size="small"
                      v-tooltip="item.description"
                      class="mx-1"
                    ></v-icon>
                    <v-icon
                      icon="mdi-database-outline"
                      size="small"
                      class="mr-2"
                    ></v-icon>
                  </div>
                </div>
              </template>
            </v-treeview>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <v-progress-linear v-else-if="loadingDatasets" indeterminate></v-progress-linear>
      <v-card-text v-else>No available Datasets.</v-card-text>
    </v-card>
  </div>
</template>

<style>
.dataset-list {
  height: 100%;
  overflow: auto;
}
.dataset-list .v-expansion-panel-title {
  min-height: 0 !important;
  display: flex;
  justify-content: space-between;
  padding: 12px !important;
}
.dataset-list .v-list-item {
  padding: 0 !important;
}
.dataset-list .v-treeview-group.v-list-group .v-list-group__items .v-list-item {
  padding-inline-start: var(--indent-padding) !important;
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
.dataset-title {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}
</style>

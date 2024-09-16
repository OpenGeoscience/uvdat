<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { onMounted, ref, Ref, computed } from "vue";
import { Dataset } from "@/types";
import { selectedDatasets } from "../store";
import { getDatasetLayers } from "@/api/rest";

export default {
  props: {
    datasets: {
      required: true,
      type: Array,
    },
    detail: {
      default: true,
      type: Boolean,
    },
  },
  setup(props: any) {
    const groupByOptions = ["category", "dataset_type"];
    const groupByKey = ref(["category"]);
    const filterMenuItems: Ref<Record<string, string[]>> = ref({});
    const filters: Ref<Record<string, string[]>> = ref({});
    const searchText = ref();
    const selectedIds = computed(() =>
      selectedDatasets.value.map((d2) => d2.id)
    );
    const filteredDatasets = computed(() => {
      return props.datasets.filter((dataset: any) => {
        const searchMatch =
          !searchText.value ||
          dataset.name.toLowerCase().includes(searchText.value.toLowerCase());
        const filterMatch = Object.entries(filters.value).every(
          ([filter_type, values]) => {
            return (
              !values.length ||
              values
                .map((v) => v.toLowerCase())
                .includes(dataset[filter_type].toLowerCase())
            );
          }
        );
        return searchMatch && filterMatch;
      });
    });
    const datasetGroups = computed(() => {
      const groups: Record<string, Dataset[]> = {};
      filteredDatasets.value.forEach((dataset: any) => {
        const groupName = dataset[groupByKey.value[0]];
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(dataset);
      });
      return groups;
    });

    function fetchAllLayers() {
      props.datasets.forEach(async (dataset: Dataset) => {
        dataset.map_layers = await getDatasetLayers(dataset.id);
      });
    }

    function populateFilterMenu() {
      filterMenuItems.value = Object.fromEntries(
        groupByOptions.map((opt) => [opt, []])
      );
      filters.value = Object.fromEntries(
        groupByOptions.map((opt) => [opt, []])
      );
      props.datasets.forEach((dataset: any) => {
        groupByOptions.forEach((opt) => {
          const value = dataset[opt].toLowerCase();
          if (!filterMenuItems.value[opt].includes(value)) {
            filterMenuItems.value[opt].push(value);
          }
        });
      });
    }

    function toggleDatasets(show: unknown, datasets: Dataset[]) {
      datasets.forEach((dataset) => {
        if (show && !selectedIds.value.includes(dataset.id)) {
          selectedDatasets.value.push(dataset);
        } else if (!show) {
          selectedDatasets.value = selectedDatasets.value.filter((d) => {
            d.id != dataset.id;
          });
        }
      });
      // TODO: Pair program with Jake
      // Update map layers with selected datasets
    }

    onMounted(fetchAllLayers);
    onMounted(populateFilterMenu);

    return {
      groupByOptions,
      groupByKey,
      filterMenuItems,
      filters,
      datasetGroups,
      selectedIds,
      searchText,
      toggleDatasets,
    };
  },
};
</script>

<template>
  <div class="px-1">
    <div class="d-flex" style="align-items: center">
      <v-text-field
        v-model="searchText"
        label="Search Datasets"
        variant="outlined"
        density="compact"
        class="ml-3"
        append-inner-icon="mdi-magnify"
        hide-details
      />
      <v-icon icon="mdi-filter" class="mx-1" id="filter-datasets" />
      <v-menu
        activator="#filter-datasets"
        open-on-hover
        :close-on-content-click="false"
      >
        <v-card>
          <v-card-text style="background-color: lightgrey" class="py-2">
            Group by
          </v-card-text>
          <v-list
            density="compact"
            selectable
            mandatory
            select-strategy="single-leaf"
            v-model:selected="groupByKey"
          >
            <v-list-item
              v-for="option in groupByOptions"
              :key="option"
              :value="option"
            >
              <v-list-item-title class="capitalize">
                {{ option.replace("_", " ") }}
              </v-list-item-title>
              <template v-slot:append="{ isSelected }">
                <v-checkbox
                  :model-value="isSelected"
                  density="compact"
                  class="ml-4"
                  style="vertical-align: bottom"
                  hide-details
                />
              </template>
            </v-list-item>
          </v-list>
          <v-card-text style="background-color: lightgrey" class="py-2">
            Filter by
          </v-card-text>
          <v-list density="compact">
            <v-list-item
              v-for="option in Object.keys(filterMenuItems)"
              :key="option"
            >
              <v-list-item-title class="capitalize">
                {{ option.replace("_", " ") }}
              </v-list-item-title>
              <template v-slot:append>
                <v-icon icon="mdi-menu-right" size="x-small"></v-icon>
              </template>

              <v-menu
                activator="parent"
                location="end"
                open-on-hover
                :close-on-content-click="false"
              >
                <v-list
                  density="compact"
                  selectable
                  select-strategy="leaf"
                  v-model:selected="filters[option]"
                >
                  <v-list-item
                    v-for="value in filterMenuItems[option]"
                    :key="value"
                    :value="value"
                  >
                    <v-list-item-title class="capitalize">
                      {{ value }}
                    </v-list-item-title>
                    <template v-slot:append="{ isSelected }">
                      <v-checkbox
                        :model-value="isSelected"
                        density="compact"
                        class="ml-4"
                        style="vertical-align: bottom"
                        hide-details
                      />
                    </template>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </div>
    <div
      v-for="groupName in Object.keys(datasetGroups)"
      :key="groupName"
      class="group py-1"
    >
      <v-checkbox
        true-icon="mdi-eye-outline"
        false-icon="mdi-eye-off-outline"
        style="display: inline-block"
        density="compact"
        hide-details
        :model-value="
          datasetGroups[groupName].every((d) => selectedIds.includes(d.id))
        "
        @update:model-value="(v) => toggleDatasets(v, datasetGroups[groupName])"
      />
      <v-card-subtitle class="group-title capitalize text-caption px-1">
        {{ groupByKey[0].replace("_", " ") }}: {{ groupName.toLowerCase() }}
      </v-card-subtitle>
      <div
        v-for="dataset in datasetGroups[groupName]"
        :key="dataset.id"
        class="d-flex pb-3"
        style="flex-direction: column"
      >
        <div class="d-flex" style="column-gap: 5px; align-items: center">
          <v-checkbox
            true-icon="mdi-eye-outline"
            false-icon="mdi-eye-off-outline"
            style="display: inline-block"
            density="compact"
            hide-details
            :model-value="selectedIds.includes(dataset.id)"
            @update:model-value="(v) => toggleDatasets(v, [dataset])"
          />
          {{ dataset.name }}
        </div>
        <div
          v-if="detail"
          class="d-flex pl-7 pr-3"
          style="column-gap: 5px; justify-content: space-between"
        >
          <div>
            <v-chip color="primary" size="x-small" class="mr-1 capitalize">
              category: {{ dataset.category }}
            </v-chip>
            <v-chip color="primary" size="x-small" class="capitalize">
              type: {{ dataset.dataset_type.toLowerCase() }}
            </v-chip>
          </div>
          <span
            v-if="dataset.map_layers"
            class="text-caption"
            style="color: grey"
          >
            <v-icon icon="mdi-layers-outline" size="small" />
            {{ dataset.map_layers.length }}
            <v-tooltip activator="parent" location="end">
              Number of Layers
            </v-tooltip>
          </span>
        </div>
        <div v-if="detail" class="text-caption pl-8 pr-1" style="color: grey">
          {{ dataset.description }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group {
  border-bottom: 1px solid lightgray;
}
.group-title {
  display: inline-block !important;
  vertical-align: super !important;
}
.v-input--density-compact {
  --v-input-control-height: 10px;
}
.capitalize {
  text-transform: capitalize !important;
}
</style>

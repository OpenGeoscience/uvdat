<script>
import draggable from "vuedraggable";
import {
  currentCity,
  currentDataset,
  activeChart,
  availableCharts,
  activeSimulation,
  availableSimulations,
  selectedDatasetIds,
} from "@/store";
import { ref, computed, onMounted, watch } from "vue";
import { addDatasetLayerToMap } from "@/utils.js";
import { getCityDatasets, getCityCharts, getCitySimulations } from "@/api/rest";
import { updateVisibleLayers } from "../utils";

export default {
  components: {
    draggable,
  },
  setup() {
    const openPanels = ref([1]);
    const openCategories = ref([0]);
    const availableLayerTree = computed(() => {
      const groupKey = "category";
      return Object.entries(
        currentCity.value.datasets.reduce(function (rv, x) {
          (rv[x[groupKey]] = rv[x[groupKey]] || []).push(x);
          return rv;
        }, {})
      )
        .map(([name, children], id) => {
          return {
            id,
            name,
            children,
          };
        })
        .filter((group) => group.name != "chart")
        .sort((a, b) => a.name < b.name);
    });
    const activeLayerTableHeaders = [{ text: "Name", value: "name" }];

    function fetchDatasets() {
      currentDataset.value = undefined;
      getCityDatasets(currentCity.value.id).then((datasets) => {
        currentCity.value.datasets = datasets;
      });
    }

    function updateActiveDatasets() {
      if (selectedDatasetIds.value.length) {
        openPanels.value = [0, 1];
      }
      const updated = updateVisibleLayers();
      selectedDatasetIds.value.forEach(async (datasetId, index) => {
        if (
          !updated.shown.some((l) => l.getProperties().datasetId === datasetId)
        ) {
          addDatasetLayerToMap(
            currentCity.value.datasets.find((d) => d.id === datasetId),
            selectedDatasetIds.value.length - index
          );
        }
      });
    }

    // function intersectRegions() {}

    function toggleDataset(dataset) {
      const enable = !selectedDatasetIds.value.includes(dataset.id);
      selectedDatasetIds.value = selectedDatasetIds.value.filter(
        (id) => id !== dataset.id
      );
      if (enable) {
        selectedDatasetIds.value = [dataset.id, ...selectedDatasetIds.value];
      } else if (
        currentDataset.value &&
        dataset.id === currentDataset.value.id
      ) {
        currentDataset.value = undefined;
      }
    }

    function reorderLayers() {
      updateVisibleLayers();
    }

    function expandOptionsPanel(dataset) {
      currentDataset.value = dataset;
    }

    function fetchCharts() {
      activeChart.value = undefined;
      getCityCharts(currentCity.value.id).then((charts) => {
        availableCharts.value = charts;
      });
    }

    function activateChart(chart) {
      activeChart.value = chart;
    }

    function fetchSimulations() {
      activeSimulation.value = undefined;
      getCitySimulations(currentCity.value.id).then((sims) => {
        availableSimulations.value = sims;
      });
    }

    function activateSimulation(sim) {
      activeSimulation.value = sim;
    }

    onMounted(fetchCharts);
    onMounted(fetchSimulations);
    watch(selectedDatasetIds, updateActiveDatasets);

    return {
      selectedDatasetIds,
      currentCity,
      fetchDatasets,
      openPanels,
      openCategories,
      toggleDataset,
      updateActiveDatasets,
      availableLayerTree,
      activeLayerTableHeaders,
      reorderLayers,
      expandOptionsPanel,
      activeChart,
      availableCharts,
      fetchCharts,
      activateChart,
      activeSimulation,
      availableSimulations,
      fetchSimulations,
      activateSimulation,
    };
  },
};
</script>

<template>
  <v-expansion-panels multiple variant="accordion" v-model="openPanels">
    <v-expansion-panel title="Active Layers">
      <v-expansion-panel-text>
        <draggable
          v-model="selectedDatasetIds"
          @change="reorderLayers"
          item-key="id"
          item-value="id"
        >
          <template #item="{ element }">
            <v-card class="px-3 py-1 d-flex">
              <v-icon class="mr-3">mdi-drag-horizontal-variant</v-icon>
              <div style="width: calc(100% - 70px)">
                {{ currentCity.datasets.find((d) => d.id === element).name }}
              </div>
              <v-icon
                size="small"
                class="expand-icon"
                @click="
                  expandOptionsPanel(
                    currentCity.datasets.find((d) => d.id === element)
                  )
                "
              >
                mdi-cog
              </v-icon>
              <v-icon
                size="small"
                class="expand-icon"
                @click="toggleDataset({ id: element })"
              >
                mdi-close
              </v-icon>
            </v-card>
          </template>
        </draggable>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon @click.stop="fetchDatasets" class="mr-2">mdi-refresh</v-icon>
        Available Datasets
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-expansion-panels
          multiple
          variant="accordion"
          v-model="openCategories"
        >
          <v-expansion-panel
            v-for="category in availableLayerTree"
            :title="category.name"
            :key="category.id"
          >
            <v-expansion-panel-text>
              <!-- <div v-if="category.name === 'region'">
                <v-tooltip text="Intersect datasets" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      class="mx-1"
                      icon
                      size="small"
                      tooltip
                      v-bind="props"
                    >
                      <v-icon>mdi-vector-intersection</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip text="Union datasets" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      class="mx-1"
                      icon
                      size="small"
                      tooltip
                      v-bind="props"
                    >
                      <v-icon>mdi-vector-union</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
              </div> -->
              <v-checkbox
                v-for="dataset in category.children"
                :model-value="selectedDatasetIds.includes(dataset.id)"
                :key="dataset.name"
                :label="dataset.name"
                :disabled="dataset.processing"
                @change="() => toggleDataset(dataset)"
                density="compact"
                hide-details
              >
                <template v-slot:label>
                  {{ dataset.name }}
                  {{ dataset.processing ? "(processing)" : "" }}
                  <v-tooltip activator="parent" location="end" max-width="300">
                    {{ dataset.description }}
                  </v-tooltip>
                  <v-icon
                    v-show="selectedDatasetIds.includes(dataset.id)"
                    size="small"
                    class="expand-icon ml-1"
                    @click.prevent="expandOptionsPanel(dataset)"
                  >
                    mdi-cog
                  </v-icon>
                </template>
              </v-checkbox>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon @click.stop="fetchCharts" class="mr-2">mdi-refresh</v-icon>
        Available Charts
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <span v-if="availableCharts.length === 0">No charts available.</span>
        <v-list>
          <v-list-item
            v-for="chart in availableCharts"
            :key="chart.id"
            :value="chart.id"
            :active="activeChart && chart.id === activeChart.id"
            @click="activateChart(chart)"
          >
            {{ chart.name }}
            <v-tooltip activator="parent" location="end" max-width="300">
              {{ chart.description }}
            </v-tooltip>
          </v-list-item>
        </v-list>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon @click.stop="fetchSimulations" class="mr-2">mdi-refresh</v-icon>
        Available Simulations
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <span v-if="availableSimulations.length === 0"
          >No simulations available.</span
        >
        <v-list>
          <v-list-item
            v-for="sim in availableSimulations"
            :key="sim.id"
            :value="sim.id"
            :active="activeSimulation && sim.id === activeSimulation.id"
            @click="activateSimulation(sim)"
          >
            {{ sim.name }}
            <v-tooltip activator="parent" location="end" max-width="300">
              {{ sim.description }}
            </v-tooltip>
          </v-list-item>
        </v-list>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style>
.v-expansion-panel-text__wrapper {
  padding: 8px 10px 16px !important;
}
.expand-icon {
  float: right;
}
</style>

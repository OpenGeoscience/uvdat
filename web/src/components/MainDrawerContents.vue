<script>
import {
  currentContext,
  currentMapDataSource,
  activeChart,
  availableCharts,
  activeSimulation,
  availableSimulations,
  availableDerivedRegions,
  selectedDerivedRegionIds,
  availableMapDataSources,
  activeDataSources,
} from "@/store";

import {
  MapDataSource,
  addDataSourceToMap,
  hideDataSourceFromMap,
} from "@/data";
import { ref, computed, onMounted, watch } from "vue";
import {
  getContextDatasets,
  getContextCharts,
  getContextSimulations,
  listDerivedRegions,
} from "@/api/rest";

export default {
  setup() {
    const openPanels = ref([0]);
    const openCategories = ref([0]);
    const availableLayerTree = computed(() => {
      const groupKey = "category";
      return Object.entries(
        currentContext.value.datasets.reduce(function (rv, x) {
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
      getContextDatasets(currentContext.value.id).then((datasets) => {
        currentContext.value.datasets = datasets;
      });
    }

    async function setDerivedRegions() {
      availableDerivedRegions.value = await listDerivedRegions();
    }

    // If new derived region created, open panel
    watch(availableDerivedRegions, (availableRegs, oldRegs) => {
      if (!oldRegs.length || availableRegs.length === oldRegs.length) {
        return;
      }

      if (availableRegs.length && !openPanels.value.includes(1)) {
        openPanels.value.push(1);
      }
    });

    function toggleDataSource(dataSource) {
      if (activeDataSources.value.has(dataSource.uid)) {
        hideDataSourceFromMap(dataSource);
      } else {
        addDataSourceToMap(dataSource);
      }
    }

    const datasetIdToDataSource = computed(() => {
      const map = new Map();
      availableMapDataSources.value.forEach((ds) => {
        if (ds.dataset !== undefined) {
          map.set(ds.dataset.id, ds);
        }
      });

      return map;
    });

    const derivedRegionIdToDataSource = computed(() => {
      const map = new Map();
      availableMapDataSources.value.forEach((ds) => {
        if (ds.derivedRegion !== undefined) {
          map.set(ds.derivedRegion.id, ds);
        }
      });

      return map;
    });

    function datasetSelected(datasetId) {
      const uid = datasetIdToDataSource.value.get(datasetId)?.uid;
      return uid && activeDataSources.value.has(uid);
    }

    function derivedRegionSelected(derivedRegionId) {
      const uid = derivedRegionIdToDataSource.value.get(derivedRegionId)?.uid;
      return uid && activeDataSources.value.has(uid);
    }

    function toggleDataset(dataset) {
      toggleDataSource(new MapDataSource({ dataset }));
    }

    function toggleDerivedRegion(derivedRegion) {
      toggleDataSource(new MapDataSource({ derivedRegion }));
    }

    function expandOptionsPanelFromDataset(dataset) {
      currentMapDataSource.value = new MapDataSource({ dataset });
    }

    function fetchCharts() {
      activeChart.value = undefined;
      getContextCharts(currentContext.value.id).then((charts) => {
        availableCharts.value = charts;
      });
    }

    function activateChart(chart) {
      activeChart.value = chart;
    }

    function fetchSimulations() {
      activeSimulation.value = undefined;
      getContextSimulations(currentContext.value.id).then((sims) => {
        availableSimulations.value = sims;
      });
    }

    function activateSimulation(sim) {
      activeSimulation.value = sim;
    }

    onMounted(fetchCharts);
    onMounted(fetchSimulations);
    onMounted(setDerivedRegions);

    return {
      currentContext,
      fetchDatasets,
      openPanels,
      openCategories,
      toggleDataset,
      availableLayerTree,
      activeLayerTableHeaders,
      expandOptionsPanelFromDataset,
      activeChart,
      availableCharts,
      fetchCharts,
      activateChart,
      activeSimulation,
      availableSimulations,
      fetchSimulations,
      activateSimulation,
      availableDerivedRegions,
      selectedDerivedRegionIds,
      toggleDerivedRegion,
      availableMapDataSources,
      datasetIdToDataSource,
      datasetSelected,
      derivedRegionSelected,
      setDerivedRegions,
    };
  },
};
</script>

<template>
  <v-expansion-panels multiple variant="accordion" v-model="openPanels">
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
              <v-checkbox
                v-for="dataset in category.children"
                :model-value="datasetSelected(dataset.id)"
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
                    v-show="datasetSelected(dataset.id)"
                    size="small"
                    class="expand-icon ml-1"
                    @click.prevent="expandOptionsPanelFromDataset(dataset)"
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
        <v-icon @click.stop="setDerivedRegions" class="mr-2">
          mdi-refresh
        </v-icon>
        Available Derived Regions
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-checkbox
          v-for="region in availableDerivedRegions"
          :model-value="derivedRegionSelected(region.id)"
          :key="region.id"
          :label="region.name"
          hide-details
          density="compact"
          @click="toggleDerivedRegion(region)"
        />
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

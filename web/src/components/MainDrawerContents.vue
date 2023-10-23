<script lang="ts">
import {
  currentContext,
  activeChart,
  availableCharts,
  activeSimulation,
  availableSimulations,
  availableDerivedRegions,
  selectedDerivedRegionIds,
  availableMapLayers,
  activeMapLayers,
} from "@/store";

import { MapLayer } from "@/data";
import { ref, computed, onMounted, watch } from "vue";
import {
  getContextDatasets,
  getContextCharts,
  getContextSimulations,
  listDerivedRegions,
} from "@/api/rest";
import { Chart, Dataset, DerivedRegion, Simulation } from "@/types";

export default {
  setup() {
    const openPanels = ref([0]);
    const openCategories = ref([0]);
    const availableLayerTree = computed(() => {
      if (!currentContext.value) return [];
      const groupKey = "category";
      return Object.entries(
        currentContext.value.datasets.reduce(function (
          rv: Record<string, Dataset[]>,
          x
        ) {
          (rv[x[groupKey]] = rv[x[groupKey]] || []).push(x);
          return rv;
        },
        {})
      )
        .map(([name, children], id) => {
          return {
            id,
            name,
            children,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    });
    const activeLayerTableHeaders = [{ text: "Name", value: "name" }];

    function fetchDatasets() {
      if (!currentContext.value) return;
      getContextDatasets(currentContext.value.id).then((datasets) => {
        if (!currentContext.value) return;
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

    // function toggleMapLayer(mapLayer: VectorMapLayer | RasterMapLayer) {
    //   console.log("TODO: toggle map layer", mapLayer);

    // if (activeMapLayers.value.has(mapLayer.uid)) {
    //   hideMapLayerFromMap(mapLayer);
    // } else {
    //   addMapLayerToMap(mapLayer);
    // }
    // }

    const datasetIdToMapLayer = computed(() => {
      const map = new Map();
      availableMapLayers.value.forEach((ds) => {
        if (ds.dataset !== undefined) {
          map.set(ds.dataset.id, ds);
        }
      });
      MapLayer;

      return map;
    });

    const derivedRegionIdToMapLayer = computed(() => {
      const map = new Map();
      availableMapLayers.value.forEach((ds) => {
        if (ds.derivedRegion !== undefined) {
          map.set(ds.derivedRegion.id, ds);
        }
      });

      return map;
    });

    function datasetSelected(datasetId: number) {
      // TODO
      const uid = datasetIdToMapLayer.value.get(datasetId)?.uid;
      return uid && activeMapLayers.value.has(uid);
    }

    function derivedRegionSelected(derivedRegionId: number) {
      const uid = derivedRegionIdToMapLayer.value.get(derivedRegionId)?.uid;
      return uid && activeMapLayers.value.has(uid);
    }

    function toggleDataset(dataset: Dataset) {
      console.log("TODO: toggle dataset", dataset);
      // toggleMapLayer(new MapLayer({ dataset }));
    }

    function toggleDerivedRegion(derivedRegion: DerivedRegion) {
      console.log("TODO: toggle derived region", derivedRegion);
      // toggleMapLayer(new MapLayer({ derivedRegion }));
    }

    function expandOptionsPanelFromDataset(dataset: Dataset) {
      console.log("TODO: expand options panel", dataset);
      // currentMapLayer.value = new MapLayer({ dataset });
    }

    function fetchCharts() {
      if (!currentContext.value) return;
      activeChart.value = undefined;
      getContextCharts(currentContext.value.id).then((charts) => {
        availableCharts.value = charts;
      });
    }

    function activateChart(chart: Chart) {
      activeChart.value = chart;
    }

    function fetchSimulations() {
      if (!currentContext.value) return;
      activeSimulation.value = undefined;
      getContextSimulations(currentContext.value.id).then((sims) => {
        availableSimulations.value = sims;
      });
    }

    function activateSimulation(sim: Simulation) {
      activeSimulation.value = sim;
    }

    onMounted(fetchCharts);
    onMounted(fetchSimulations);
    onMounted(setDerivedRegions);

    return {
      currentContext,
      openPanels,
      openCategories,
      availableLayerTree,
      activeLayerTableHeaders,
      activeChart,
      availableCharts,
      activeSimulation,
      availableSimulations,
      availableDerivedRegions,
      selectedDerivedRegionIds,
      availableMapLayers,
      datasetIdToMapLayer,
      fetchDatasets,
      toggleDataset,
      expandOptionsPanelFromDataset,
      fetchCharts,
      activateChart,
      fetchSimulations,
      activateSimulation,
      toggleDerivedRegion,
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

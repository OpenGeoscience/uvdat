<script lang="ts">
import {
  currentContext,
  availableCharts,
  currentChart,
  availableSimulationTypes,
  currentSimulationType,
  availableDerivedRegions,
  availableMapLayers,
  // activeMapLayers,
} from "@/store";

import { MapLayer } from "@/data";
import { ref, computed, onMounted, watch } from "vue";
import {
  getContextDatasets,
  getContextCharts,
  getContextSimulationTypes,
  listDerivedRegions,
} from "@/api/rest";
import { Dataset, DerivedRegion } from "@/types";

export default {
  setup() {
    const openPanels = ref([0]);
    const expandedDatasetGroups = ref([0]);
    const availableDatasetGroups = computed(() => {
      if (!currentContext.value) return [];
      const groupKey = "category";
      const datasetGroups: Record<string, Dataset[]> = {};
      currentContext.value.datasets.forEach((dataset: Dataset) => {
        const currentGroup = dataset[groupKey];
        if (!datasetGroups[currentGroup]) datasetGroups[currentGroup] = [];
        datasetGroups[currentGroup].push(dataset);
      });

      const ret: {
        id: number;
        datasets: Dataset[];
        name: string;
      }[] = Object.entries(datasetGroups).map(([name, datasets], index) => ({
        id: index,
        datasets,
        name,
      }));

      // .sort((a, b) => a.name.localeCompare(b.name));
      return ret;
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

    // const derivedRegionIdToMapLayer = computed(() => {
    //   const map = new Map();
    //   availableMapLayers.value.forEach((ds) => {
    //     if (ds.derivedRegion !== undefined) {
    //       map.set(ds.derivedRegion.id, ds);
    //     }
    //   });

    //   return map;
    // });

    function datasetSelected(datasetId: number) {
      console.log("TODO: is dataset selected?", datasetId);
      // const uid = datasetIdToMapLayer.value.get(datasetId)?.uid;
      // return uid && activeMapLayers.value.has(uid);
    }

    function derivedRegionSelected(derivedRegionId: number) {
      console.log("TODO: is derived region selected?", derivedRegionId);
      // const uid = derivedRegionIdToMapLayer.value.get(derivedRegionId)?.uid;
      // return uid && activeMapLayers.value.has(uid);
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
      currentChart.value = undefined;
      getContextCharts(currentContext.value.id).then((charts) => {
        availableCharts.value = charts;
      });
    }

    function fetchSimulations() {
      if (!currentContext.value) return;
      currentSimulationType.value = undefined;
      getContextSimulationTypes(currentContext.value.id).then((sims) => {
        availableSimulationTypes.value = sims;
      });
    }

    onMounted(fetchCharts);
    onMounted(fetchSimulations);
    onMounted(setDerivedRegions);

    return {
      currentContext,
      openPanels,
      expandedDatasetGroups,
      availableDatasetGroups,
      activeLayerTableHeaders,
      currentChart,
      availableCharts,
      currentSimulationType,
      availableSimulationTypes,
      availableDerivedRegions,
      availableMapLayers,
      datasetIdToMapLayer,
      fetchDatasets,
      toggleDataset,
      expandOptionsPanelFromDataset,
      fetchCharts,
      fetchSimulations,
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
          v-model="expandedDatasetGroups"
          v-if="currentContext?.datasets[0].id"
        >
          <v-expansion-panel
            v-for="group in availableDatasetGroups"
            :title="group.name"
            :key="group.id"
          >
            <v-expansion-panel-text>
              <v-checkbox
                v-for="dataset in group.datasets"
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
            :active="currentChart && chart.id === currentChart.id"
            @click="currentChart = chart"
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
        <span v-if="availableSimulationTypes.length === 0"
          >No simulations available.</span
        >
        <v-list>
          <v-list-item
            v-for="sim in availableSimulationTypes"
            :key="sim.id"
            :value="sim.id"
            :active="
              currentSimulationType && sim.id === currentSimulationType.id
            "
            @click="currentSimulationType = sim"
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
.v-checkbox .v-selection-control {
  max-width: 100%;
}
.expand-icon {
  float: right;
}
</style>

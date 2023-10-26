<script lang="ts">
import { ref, computed, watch } from "vue";
import {
  availableCharts,
  currentChart,
  selectedDatasets,
  availableDatasets,
  availableSimulationTypes,
  currentSimulationType,
  availableDerivedRegions,
  availableMapLayers,
  currentMapLayer,
} from "@/store";
import {
  loadDatasets,
  loadCharts,
  loadSimulationTypes,
  loadDerivedRegions,
} from "../storeFunctions";
import { Dataset, DerivedRegion } from "@/types";
import {
  getDataObjectMapLayer,
  isMapLayerVisible,
  toggleMapLayer,
} from "@/layers";

export default {
  setup() {
    const openPanels = ref([0]);

    const expandedDatasetGroups = ref<string[]>([]);

    const availableDatasetGroups = computed(() => {
      const groupKey = "category";
      const datasetGroups: Record<string, Dataset[]> = {};
      availableDatasets.value.forEach((dataset: Dataset) => {
        const currentGroup = dataset[groupKey];
        if (!datasetGroups[currentGroup]) datasetGroups[currentGroup] = [];
        datasetGroups[currentGroup].push(dataset);
      });

      const ret: {
        id: number;
        datasets: Dataset[];
        name: string;
      }[] = Object.entries(datasetGroups)
        .map(([name, datasets], index) => ({
          id: index,
          datasets,
          name,
        }))
        .sort((a, b) => b.name.localeCompare(a.name));
      return ret;
    });

    const activeLayerTableHeaders = [{ text: "Name", value: "name" }];

    async function derivedRegionSelected(derivedRegion: DerivedRegion) {
      console.log("is derived region selected?", derivedRegion);
      const mapLayer = await getDataObjectMapLayer(derivedRegion);
      return isMapLayerVisible(mapLayer);
    }

    async function toggleDerivedRegion(derivedRegion: DerivedRegion) {
      console.log("toggling derived region", derivedRegion);
      const mapLayer = await getDataObjectMapLayer(derivedRegion);
      toggleMapLayer(mapLayer);
    }

    async function toggleDataset(dataset: Dataset) {
      if (selectedDatasets.value?.includes(dataset)) {
        selectedDatasets.value = selectedDatasets.value.filter(
          (d) => d.id !== dataset.id
        );
      } else {
        selectedDatasets.value?.push(dataset);
      }

      // Find first related MapLayer
      const mapLayer = await getDataObjectMapLayer(dataset);
      toggleMapLayer(mapLayer);
    }

    async function expandOptionsPanelFromDataset(dataset: Dataset) {
      const mapLayer = await getDataObjectMapLayer(dataset);
      currentMapLayer.value = mapLayer;
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

    watch(availableDatasets, () => {
      expandedDatasetGroups.value = availableDatasetGroups.value.map(
        (g) => g.name
      );
    });

    return {
      availableDatasets,
      selectedDatasets,
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
      currentMapLayer,
      loadDatasets,
      toggleDataset,
      expandOptionsPanelFromDataset,
      toggleDerivedRegion,
      derivedRegionSelected,
      loadCharts,
      loadSimulationTypes,
      loadDerivedRegions,
    };
  },
};
</script>

<template>
  <v-expansion-panels multiple variant="accordion" v-model="openPanels">
    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon @click.stop="loadDatasets" class="mr-2">mdi-refresh</v-icon>
        Available Datasets
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-expansion-panels
          multiple
          variant="accordion"
          v-model="expandedDatasetGroups"
          v-if="availableDatasets.length && availableDatasets[0].id"
        >
          <v-expansion-panel
            v-for="group in availableDatasetGroups"
            :title="group.name"
            :key="group.id"
            :value="group.name"
          >
            <v-expansion-panel-text>
              <v-checkbox
                v-for="dataset in group.datasets"
                v-model="selectedDatasets"
                :value="dataset"
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
                    v-show="
                      selectedDatasets && selectedDatasets.includes(dataset)
                    "
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
        <v-icon @click.stop="loadDerivedRegions" class="mr-2">
          mdi-refresh
        </v-icon>
        Available Derived Regions
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-checkbox
          v-for="region in availableDerivedRegions"
          :model-value="derivedRegionSelected(region)"
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
        <v-icon @click.stop="loadCharts" class="mr-2">mdi-refresh</v-icon>
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
        <v-icon @click.stop="loadSimulationTypes" class="mr-2"
          >mdi-refresh</v-icon
        >
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

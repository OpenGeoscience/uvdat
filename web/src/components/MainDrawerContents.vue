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
  currentDataset,
  availableDatasetLayers,
  selectedDerivedRegions,
} from "@/store";
import {
  loadDatasets,
  loadCharts,
  loadSimulationTypes,
  loadDerivedRegions,
} from "../storeFunctions";
import { Dataset, DerivedRegion } from "@/types";
import { getDatasetLayers } from "@/api/rest";
import {
  getDatasetLayerForDataObject,
  toggleDatasetLayer,
  getOrCreateLayerFromID,
  updateVisibleMapLayers,
} from "@/layers";

export default {
  setup() {
    const openPanels = ref([0]);

    const expandedDatasetGroups = ref<string[]>([]);

    const availableDatasetGroups = computed(() => {
      if (!availableDatasets.value) return [];
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

    async function toggleDerivedRegion(derivedRegion: DerivedRegion) {
      const datasetLayer = await getDatasetLayerForDataObject(derivedRegion);
      toggleDatasetLayer(datasetLayer);
    }

    async function toggleDataset(dataset: Dataset) {
      if (
        !selectedDatasets.value.map((d) => d.id).includes(dataset.id) &&
        currentDataset.value?.id === dataset.id
      ) {
        currentDataset.value = undefined;
      }

      // Ensure layer index is set
      dataset.current_layer_index = dataset.current_layer_index || 0;
      if (dataset.map_layers === undefined) {
        dataset.map_layers = await getDatasetLayers(dataset.id);
        availableDatasetLayers.value = [
          ...availableDatasetLayers.value,
          ...dataset.map_layers,
        ];
      }

      if (
        dataset.map_layers !== undefined &&
        dataset.current_layer_index !== undefined
      ) {
        const datasetLayer = dataset.map_layers[dataset.current_layer_index]
        toggleDatasetLayer(datasetLayer);
      }
    }

    // If new derived region created, open panel
    watch(availableDerivedRegions, (availableRegs, oldRegs) => {
      if (availableRegs === undefined || oldRegs === undefined) {
        return;
      }
      if (!(availableRegs.length > oldRegs.length)) {
        return;
      }

      if (!openPanels.value.includes(1)) {
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
      currentDataset,
      selectedDatasets,
      selectedDerivedRegions,
      openPanels,
      expandedDatasetGroups,
      availableDatasetGroups,
      activeLayerTableHeaders,
      currentChart,
      availableCharts,
      currentSimulationType,
      availableSimulationTypes,
      availableDerivedRegions,
      loadDatasets,
      toggleDataset,
      toggleDerivedRegion,
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
        <div v-if="!availableDatasets" style="text-align: center; width: 100%">
          <v-progress-circular indeterminate size="30" />
        </div>
        <v-card-subtitle v-if="availableDatasets && availableDatasets.length === 0">
          No Available Datasets.
        </v-card-subtitle>
        <v-expansion-panels multiple variant="accordion" v-model="expandedDatasetGroups" v-if="
          availableDatasets &&
          availableDatasets.length &&
          availableDatasets[0].id
        ">
          <v-expansion-panel v-for="group in availableDatasetGroups" :title="group.name" :key="group.id"
            :value="group.name">
            <v-expansion-panel-text>
              <v-checkbox v-for="dataset in group.datasets" v-model="selectedDatasets" :value="dataset"
                :key="dataset.name" :label="dataset.name" :disabled="dataset.processing"
                @change="() => toggleDataset(dataset)" density="compact" hide-details>
                <template v-slot:label>
                  {{ dataset.name }}
                  {{ dataset.processing ? "(processing)" : "" }}
                  <v-tooltip activator="parent" location="end" max-width="300">
                    {{ dataset.description }}
                  </v-tooltip>
                  <v-icon v-show="selectedDatasets && selectedDatasets.includes(dataset)
                    " size="small" class="expand-icon ml-1" @click.prevent="currentDataset = dataset">
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
        <template v-if="!availableDerivedRegions?.length">
          <div style="text-align: center; width: 100%">
            <v-progress-circular indeterminate size="30" />
          </div>
          <v-card-subtitle> No Available Derived Regions. </v-card-subtitle>
        </template>
        <v-checkbox v-for="region in availableDerivedRegions" v-model="selectedDerivedRegions" :value="region"
          :key="region.id" :label="region.name" hide-details density="compact" @click="toggleDerivedRegion(region)" />
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon @click.stop="loadCharts" class="mr-2">mdi-refresh</v-icon>
        Available Charts
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div v-if="!availableCharts" style="text-align: center; width: 100%">
          <v-progress-circular indeterminate size="30" />
        </div>
        <v-card-subtitle v-if="availableCharts && availableCharts.length === 0">
          No Available Charts.
        </v-card-subtitle>
        <v-list>
          <v-list-item v-for="chart in availableCharts" :key="chart.id" :value="chart.id"
            :active="currentChart && chart.id === currentChart.id" @click="currentChart = chart">
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
        <v-icon @click.stop="loadSimulationTypes" class="mr-2">mdi-refresh</v-icon>
        Available Simulations
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div v-if="!availableSimulationTypes" style="text-align: center; width: 100%">
          <v-progress-circular indeterminate size="30" />
        </div>
        <v-card-subtitle v-if="
          availableSimulationTypes && availableSimulationTypes.length === 0
        ">
          No Available Simulation Types.
        </v-card-subtitle>
        <v-list>
          <v-list-item v-for="sim in availableSimulationTypes" :key="sim.id" :value="sim.id" :active="currentSimulationType && sim.id === currentSimulationType.id
            " @click="currentSimulationType = sim">
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
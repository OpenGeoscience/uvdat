<script>
import draggable from "vuedraggable";
import {
  currentCity,
  currentMapDataSource,
  activeChart,
  availableCharts,
  activeSimulation,
  availableSimulations,
  selectedDatasetIds,
  availableDerivedRegions,
  selectedDerivedRegionIds,
  activeMapLayerIds,
  availableMapDataSources,
  selectedDataSourceIds,
} from "@/store";

import {
  MapDataSource,
  addDataSourceToMap,
  hideDataSourceFromMap,
} from "@/data";
import { getMapLayerById, updateVisibleLayers } from "@/layers";
import { ref, computed, onMounted, watch } from "vue";
import {
  getCityDatasets,
  getCityCharts,
  getCitySimulations,
  listDerivedRegions,
} from "@/api/rest";

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
      getCityDatasets(currentCity.value.id).then((datasets) => {
        currentCity.value.datasets = datasets;
      });
    }

    // Ensure that if any layers are active, the "active layers" panel is open
    // Since the "active layers" panel is the third panel, use index 2 to control it
    watch(activeMapLayerIds, (activeLayerIds) => {
      if (activeLayerIds.length && !openPanels.value.includes(2)) {
        openPanels.value.push(2);
      }
    });

    function updateActiveDatasets() {
      if (selectedDatasetIds.value.length) {
        openPanels.value = [0, 1];
      }
    }

    // If new derived regions added, open panel
    watch(availableDerivedRegions, (availableRegs) => {
      if (availableRegs.length && !openPanels.value.includes(1)) {
        openPanels.value.push(1);
      }
    });

    function toggleDataSource(dataSource) {
      if (selectedDataSourceIds.has(dataSource.getUid())) {
        hideDataSourceFromMap(dataSource);
      } else {
        addDataSourceToMap(dataSource);
      }
    }

    function toggleDataset(dataset) {
      toggleDataSource(new MapDataSource({ dataset }));
    }

    function toggleDerivedRegion(derivedRegion) {
      toggleDataSource(new MapDataSource({ derivedRegion }));
    }

    function getLayerName(layerId) {
      const layer = getMapLayerById(layerId);
      const dataSource = availableMapDataSources.value.get(
        layer.get("dataSourceId")
      );
      return dataSource.getName();
    }

    function reorderLayers() {
      updateVisibleLayers();
    }

    function expandOptionsPanelFromDataset(dataset) {
      currentMapDataSource.value = new MapDataSource({ dataset });
    }

    function expandOptionsPanelFromLayer(layerId) {
      const layer = getMapLayerById(layerId);
      const args = {};

      // Add dataset if applicable
      const dataSource = availableMapDataSources.value.get(
        layer.get("dataSourceId")
      );
      const datasetId = dataSource.dataset?.id;
      if (datasetId !== undefined) {
        const dataset = currentCity.value.datasets.find(
          (d) => d.id === datasetId
        );
        if (dataset === undefined) {
          throw new Error("Dataset not found!");
        }

        args.dataset = dataset;
      }

      // Add region if applicable
      const regionId = dataSource.derivedRegion?.id;
      if (regionId !== undefined) {
        const region = availableDerivedRegions.value.find(
          (r) => r.id === regionId
        );
        if (region === undefined) {
          throw new Error("Region not found!");
        }
        args.derivedRegion = region;
      }

      currentMapDataSource.value = new MapDataSource(args);
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
    onMounted(async () => {
      availableDerivedRegions.value = await listDerivedRegions();
    });
    watch(selectedDatasetIds, updateActiveDatasets);

    return {
      selectedDatasetIds,
      currentCity,
      fetchDatasets,
      openPanels,
      openCategories,
      toggleDataset,
      availableLayerTree,
      activeLayerTableHeaders,
      reorderLayers,
      expandOptionsPanelFromDataset,
      expandOptionsPanelFromLayer,
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
      activeMapLayerIds,
      getLayerName,
      availableMapDataSources,
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
                :model-value="selectedDatasetIds.has(dataset.id)"
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
                    v-show="selectedDatasetIds.has(dataset.id)"
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

    <v-expansion-panel title="Derived Regions">
      <v-expansion-panel-text>
        <v-checkbox
          v-for="region in availableDerivedRegions"
          :key="region.id"
          :label="region.name"
          hide-details
          density="compact"
          @click="toggleDerivedRegion(region)"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel title="Active Layers">
      <v-expansion-panel-text>
        <draggable
          v-model="activeMapLayerIds"
          @change="reorderLayers"
          item-key="id"
          item-value="id"
        >
          <template #item="{ element }">
            <v-card class="px-3 py-1">
              <v-icon>mdi-drag-horizontal-variant</v-icon>
              <v-icon
                size="small"
                class="expand-icon"
                @click="expandOptionsPanelFromLayer(element)"
              >
                mdi-cog
              </v-icon>
              {{ getLayerName(element) }}
            </v-card>
          </template>
        </draggable>
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

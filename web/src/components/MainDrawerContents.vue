<script>
import draggable from "vuedraggable";
import { currentCity, currentDataset, activeChart, map } from "@/store";
import { ref, computed, onMounted } from "vue";
import { addDatasetLayerToMap } from "@/utils.js";
import { getCityCharts } from "@/api/rest";

export default {
  components: {
    draggable,
  },
  setup() {
    const selectedDatasets = ref([]);
    const openPanels = ref([0]);
    const openCategories = ref([0]);
    const availableCharts = ref();
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
        .sort((a, b) => a.name > b.name);
    });
    const activeLayerTableHeaders = [{ text: "Name", value: "name" }];

    function updateActiveDatasets() {
      const datasetIdsWithExistingLayers = [];
      const currentMapLayers = map.value.getLayers();
      const selectedDatasetIds = selectedDatasets.value.map(
        (dataset) => dataset.id
      );
      if (selectedDatasetIds.length) {
        openPanels.value = [0, 1];
      }

      currentMapLayers.forEach((layer) => {
        const layerDatasetId = layer.getProperties().datasetId;
        if (layerDatasetId) {
          datasetIdsWithExistingLayers.push(layerDatasetId);
          const layerIndex = selectedDatasets.value.findIndex(
            (d) => d.id === layerDatasetId
          );
          if (layerIndex >= 0) {
            layer.setZIndex(selectedDatasets.value.length - layerIndex);
          }
          layer.setVisible(selectedDatasetIds.includes(layerDatasetId));
        }
      });
      selectedDatasets.value.forEach(async (dataset, index) => {
        if (!datasetIdsWithExistingLayers.includes(dataset.id)) {
          addDatasetLayerToMap(dataset, selectedDatasets.value.length - index);
        }
      });
    }

    function toggleDataset(dataset) {
      const enable = !selectedDatasets.value.includes(dataset);
      selectedDatasets.value = selectedDatasets.value.filter(
        (d) => d !== dataset
      );
      if (enable) {
        selectedDatasets.value = [dataset, ...selectedDatasets.value];
      } else if (
        currentDataset.value &&
        dataset.id === currentDataset.value.id
      ) {
        currentDataset.value = undefined;
      }
      updateActiveDatasets();
    }

    function reorderLayers() {
      map.value
        .getLayers()
        .getArray()
        .forEach((layer) => {
          const layerDatasetId = layer.getProperties().datasetId;
          if (layerDatasetId) {
            const layerIndex = selectedDatasets.value.findIndex(
              (d) => d.id === layerDatasetId
            );
            if (layerIndex >= 0) {
              layer.setZIndex(selectedDatasets.value.length - layerIndex);
            }
          }
        });
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

    onMounted(fetchCharts);

    return {
      selectedDatasets,
      currentCity,
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
    };
  },
};
</script>

<template>
  <v-expansion-panels multiple variant="accordion" v-model="openPanels">
    <v-expansion-panel title="Available Layers">
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
                :model-value="selectedDatasets.includes(dataset)"
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
                    v-show="selectedDatasets.includes(dataset)"
                    size="small"
                    class="expand-icon"
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

    <v-expansion-panel title="Active Layers">
      <v-expansion-panel-text>
        <draggable
          v-model="selectedDatasets"
          @change="reorderLayers"
          item-key="id"
        >
          <template #item="{ element }">
            <v-card class="px-3 py-1">
              <v-icon>mdi-drag-horizontal-variant</v-icon>
              <v-icon
                size="small"
                class="expand-icon"
                @click="expandOptionsPanel(element)"
              >
                mdi-cog
              </v-icon>
              {{ element.name }}
            </v-card>
          </template>
        </draggable>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel title="Available Charts">
      <v-expansion-panel-text>
        <v-icon @click.prevent="fetchCharts" style="float: right"
          >mdi-refresh</v-icon
        >
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

<script setup lang="ts">
import { ref, Ref, watch, computed, defineProps } from "vue";
import {
  Project,
  Dataset,
  Chart,
  DerivedRegion,
  SimulationType,
} from "../types";
import {
  getDatasetLayers,
  getProjectCharts,
  getProjectDatasets,
  getProjectDerivedRegions,
  getProjectSimulationTypes,
} from "@/api/rest";
import DatasetList from "./DatasetList.vue";
import {
  availableCharts,
  availableDatasetLayers,
  availableDatasets,
  availableDerivedRegions,
  availableSimulationTypes,
  currentChart,
  currentDataset,
  currentSimulationType,
  selectedDatasets,
} from "@/store";
import { getDatasetLayerForDataObject, toggleDatasetLayer } from "@/layers";

const props = defineProps<{
  project: Project;
}>();

const panels: {
  label: "Datasets" | "Regions" | "Charts" | "Simulations";
  loadFunction: (
    projectId: number
  ) => Promise<Dataset[] | DerivedRegion[] | Chart[] | SimulationType[]>;
  storeVar: Ref;
}[] = [
  {
    label: "Datasets",
    loadFunction: getProjectDatasets,
    storeVar: availableDatasets,
  },
  {
    label: "Regions",
    loadFunction: getProjectDerivedRegions,
    storeVar: availableDerivedRegions,
  },
  {
    label: "Charts",
    loadFunction: getProjectCharts,
    storeVar: availableCharts,
  },
  {
    label: "Simulations",
    loadFunction: getProjectSimulationTypes,
    storeVar: availableSimulationTypes,
  },
];

const openPanels: Ref<string[]> = ref([]);
const projectContents: Ref<{
  Datasets?: Dataset[];
  Regions?: DerivedRegion[];
  Simulations?: SimulationType[];
  Charts?: Chart[];
}> = ref({});
const selectedDatasetIds = computed(() =>
  selectedDatasets.value.map((d2) => d2.id)
);

function selectItem(
  panelLabel: string,
  item: Dataset | DerivedRegion | Chart | SimulationType
) {
  if (panelLabel == "Regions") {
    getDatasetLayerForDataObject(item as DerivedRegion).then((layer) => {
      toggleDatasetLayer(layer);
    });
  } else if (panelLabel == "Charts") {
    currentChart.value = item as Chart;
  } else if (panelLabel == "Simulations") {
    currentSimulationType.value = item as SimulationType;
  }
}

function toggleDatasets({
  show,
  datasets,
}: {
  show: boolean;
  datasets: Dataset[];
}) {
  datasets.forEach(async (dataset) => {
    // Ensure layer index is set
    dataset.current_layer_index = dataset.current_layer_index || 0;
    if (dataset.map_layers === undefined) {
      dataset.map_layers = await getDatasetLayers(dataset.id);
      availableDatasetLayers.value = [
        ...availableDatasetLayers.value,
        ...dataset.map_layers,
      ];
    }
    let layer = undefined;
    if (
      dataset.map_layers !== undefined &&
      dataset.current_layer_index !== undefined
    ) {
      layer = dataset.map_layers[dataset.current_layer_index];
    }
    if (show && !selectedDatasetIds.value.includes(dataset.id)) {
      selectedDatasets.value.push(dataset);
      if (layer) toggleDatasetLayer(layer);
    } else if (!show && selectedDatasetIds.value.includes(dataset.id)) {
      if (currentDataset.value?.id === dataset.id) {
        currentDataset.value = undefined;
      }
      selectedDatasets.value = selectedDatasets.value.filter((d) => {
        d.id != dataset.id;
      });
      if (layer) toggleDatasetLayer(layer);
    }
  });
}

watch(openPanels, () => {
  panels.forEach((panel) => {
    if (
      openPanels.value.includes(panel.label) &&
      !projectContents.value[panel.label]?.length
    ) {
      panel.loadFunction(props.project.id).then((data) => {
        if (panel.label === "Datasets") {
          projectContents.value["Datasets"] = data as Dataset[];
        } else if (panel.label === "Charts") {
          projectContents.value["Charts"] = data as Chart[];
        } else if (panel.label === "Regions") {
          projectContents.value["Regions"] = data as DerivedRegion[];
        } else if (panel.label === "Simulations") {
          projectContents.value["Simulations"] = data as SimulationType[];
        }
        panel.storeVar.value = data;
      });
    }
  });
});
</script>

<template>
  <v-expansion-panels multiple variant="accordion" v-model="openPanels">
    <v-expansion-panel
      v-for="panel in panels"
      :key="panel.label"
      :value="panel.label"
      style="margin-bottom: 6px"
    >
      <v-expansion-panel-title>
        {{ panel.label }}
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div
          v-if="
            !projectContents[panel.label] ||
            !projectContents[panel.label]?.length
          "
          style="color: grey"
          class="my-2 mx-6 text-caption"
        >
          No Available {{ panel.label }}.
        </div>
        <dataset-list
          v-else-if="panel.label == 'Datasets' && projectContents['Datasets']"
          :datasets="projectContents['Datasets']"
          :selected-ids="selectedDatasetIds"
          :eye-icon="true"
          @toggleDatasets="toggleDatasets"
        />
        <v-list v-else>
          <v-list-item
            v-for="item in projectContents[panel.label]"
            :key="item.id"
            :value="item"
            class="pa-2 mx-2"
            @click="selectItem(panel.label, item)"
          >
            {{ item.name }}
            <div class="text-caption" style="color: grey">
              {{ item.description }}
            </div>
          </v-list-item>
        </v-list>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style scoped>
.v-expansion-panel--active
  > .v-expansion-panel-title:not(.v-expansion-panel-title--static) {
  min-height: 30px;
}
.v-list-item--active > * {
  background: transparent !important;
}
</style>

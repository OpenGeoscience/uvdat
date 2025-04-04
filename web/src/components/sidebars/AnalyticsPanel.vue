<script setup lang="ts">
import { ref, watch, computed } from "vue";
import {
  currentSimulationType,
  currentProject,
  selectedLayers,
  availableDatasets,
  availableSimulationTypes,
  loadingSimulationTypes,
} from "@/store";
import {
  getDatasetLayers,
  getNetwork,
  getProjectDatasets,
  getSimulationResults,
  runSimulation,
} from "@/api/rest";
import NodeAnimation from "./NodeAnimation.vue";
import { SimulationResult, Layer, Dataset } from "@/types";


interface Input {
  key: string;
  type: string;
  value: any;
}

const searchText = ref();
const filteredSimulationTypes = computed(() => {
  return availableSimulationTypes.value?.filter((sim_type) => {
    return  !searchText.value ||
    sim_type.name.toLowerCase().includes(searchText.value.toLowerCase())
  })
})
const tab = ref();
const activeResult = ref<SimulationResult>();
const activeResultInputs = ref<Input[]>([]);
const availableResults = ref<SimulationResult[]>([]);
const inputForm = ref();
const selectedInputs = ref<Record<string, object[]>>({});
const outputPoll = ref();
const networkArg = ref();
const inputSelectionRules = [
  (v: any) => (v ? true : "Selection required."),
];

function getLayerForArg(arg: Input | undefined): Layer | undefined {
  let retLayer;
  if (arg) {
    availableDatasets.value?.forEach((dataset) => {
      dataset.layers.forEach((layer) => {
        layer.frames.forEach((frame) => {
          if (
            (arg.value.cloud_optimized_geotiff && frame.raster?.id === arg.value.id ) ||
            (arg.value.geojson_data && frame.vector?.id === arg.value.id) ||
            (arg.value.nodes && frame.vector?.id === arg.value.vector_data )
          ) {
            retLayer = layer;
          }
        })
      })
    })
  }
  return retLayer;
}

async function getNetworkArg() {
  let networkArg = activeResultInputs.value.find((input) => input.key === 'network');
  if (!networkArg) {
    // For simulations that use other results as inputs, those results may point to a network
    await Promise.all(activeResultInputs.value.map(async (input) => {
      if (input.type === 'SimulationResult') {
        const networkId = input.value.input_args.network;
        if (networkId) networkArg = {
          key: input.key,
          type: input.type,
          value: await getNetwork(networkId)
        }
      }
    }))
  }
  return networkArg;
}

function isArgVisible(arg: Input | undefined) {
  if (!arg) return false;
  const layer = getLayerForArg(arg);
  return !!selectedLayers.value.find((l) => l.id === layer?.id)?.visible
}

function toggleVisibleArg(arg: Input) {
  const layer = getLayerForArg(arg);
  if (!layer) return;
  toggleLayer(layer)
}

function toggleVisibleDataset(dataset: Dataset) {
  if (dataset.layers.length) {
    // select first layer by default
    toggleLayer(dataset.layers[0])
  }
}

function toggleLayer(layer: Layer) {
  if (selectedLayers.value.some((l) => l.id === layer.id)) {
    selectedLayers.value = selectedLayers.value.map((l) => {
      if (l.id === layer.id) l.visible = true;
      return l
    })
  } else {
    selectedLayers.value = [
    {...layer, name: layer.name, copy_id: 0, visible: true, current_frame: 0},
    ...selectedLayers.value,
    ];
  }
}

function run() {
  inputForm.value.validate().then(({ valid }: { valid: boolean }) => {
    if (valid && currentProject.value && currentSimulationType.value) {
      runSimulation(
        currentSimulationType.value.id,
        currentProject.value.id,
        selectedInputs.value
      ).then((result) => {
        tab.value = "old";
        activeResult.value = result;
      });
    }
  });
}

function fetchResults() {
  if (!currentProject.value || !currentSimulationType.value) return;
  getSimulationResults(
    currentSimulationType.value.id,
    currentProject.value.id
  ).then((results) => {
    availableResults.value = results;
    if (activeResult.value) {
      activeResult.value = availableResults.value.find(
        (r) => r.id === activeResult.value?.id
      );
    }
  });
}

function timestampToTitle(timestamp: string) {
  const date = new Date(Date.parse(timestamp));
  return date.toUTCString();
}

async function populateActiveResultInputs() {
  if (!activeResult.value?.input_args) return;
  activeResultInputs.value = [];
  const args = Object.entries(activeResult.value.input_args);
  const inputInfo = await Promise.all(
    args.map(async ([argName, argValue]) => {
      const argDef = currentSimulationType.value?.args.find(
        (a: { name: string }) => a.name === argName
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selectedOption: any = argDef?.options.find(
        (o: { id: number }) => o === argValue || o.id === argValue
      );
      if (!selectedOption) {
        return;
      }

      return {
        key: argName.replaceAll("_", " "),
        type: argDef?.type,
        value: selectedOption,
      };
    })
  );
  activeResultInputs.value = inputInfo.filter((v) => v !== undefined) as {
    key: string;
    type: string;
    datasetLayer: Layer | undefined;
    value: { name: string };
  }[];
  networkArg.value = await getNetworkArg()
}

async function populateActiveResultOutputs() {
  if (activeResult.value && currentProject.value) {
    getProjectDatasets(currentProject.value.id).then(async (datasets) => {
      availableDatasets.value = await Promise.all(datasets.map(async (dataset: Dataset) => {
        dataset.layers = await getDatasetLayers(dataset.id);
        return dataset;
      }));
    });
    const datasetIds = activeResult.value.output_data?.dataset_ids;
    if (datasetIds && availableDatasets.value) {
      activeResult.value.output_data.datasets = await Promise.all(
        availableDatasets.value
        .filter((d) => datasetIds.includes(d.id))
        .map(async (d) => {
          d.layers = await getDatasetLayers(d.id);
          return d;
        })
      );
    }
  }
}

function pollForActiveResultOutput() {
  if (!availableResults.value) {
    clearInterval(outputPoll.value);
    outputPoll.value = undefined;
  }
  const targetResult: SimulationResult | undefined =
    availableResults.value.find(
      (r: { id: number }) => r.id === activeResult.value?.id
    );
  if (
    targetResult &&
    !targetResult.output_data &&
    !targetResult.error_message
  ) {
    fetchResults();
  } else {
    clearInterval(outputPoll.value);
    outputPoll.value = undefined;
  }
}

watch(currentSimulationType, () => {
  availableResults.value = [];
  fetchResults();
});

watch(tab, () => {
  if (tab.value === "old") {
    fetchResults();
  }
});

watch(activeResult, () => {
  if (activeResult.value) {
    populateActiveResultInputs();
    populateActiveResultOutputs();
    if (!outputPoll.value && !activeResult.value.output_data) {
      outputPoll.value = setInterval(pollForActiveResultOutput, 3000);
    }
  }
});

watch(selectedLayers, populateActiveResultInputs);
</script>

<template>
  <div class="panel-content-outer with-search">
    <v-text-field
      v-model="searchText"
      label="Search Analytics"
      variant="outlined"
      density="compact"
      class="mb-2"
      append-inner-icon="mdi-magnify"
      hide-details
    />
    <v-card class="panel-content-inner">
      <div v-if="currentSimulationType" style="height: 100%; overflow: auto">
        <div style="position: absolute; right: 0">
          <v-tooltip text="Close" location="bottom">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-close"
                variant="plain"
                @click="currentSimulationType = undefined"
              />
            </template>
          </v-tooltip>
        </div>
        <v-card-title>{{ currentSimulationType.name }}</v-card-title>

        <v-tabs v-model="tab" align-tabs="center" fixed-tabs>
          <v-tab value="new">Run New</v-tab>
          <v-tab value="old">View Existing</v-tab>
        </v-tabs>

        <v-window v-model="tab">
          <v-window-item value="new">
            <v-form class="pa-3" @submit.prevent ref="inputForm">
              <v-card-subtitle class="px-1">Select inputs</v-card-subtitle>
              <v-select
                v-for="arg in currentSimulationType.args"
                v-model="selectedInputs[arg.name]"
                v-bind="arg"
                :key="arg.name"
                :label="arg.name.replaceAll('_', ' ')"
                :rules="inputSelectionRules"
                :items="arg.options"
                item-value="id"
                item-title="name"
                density="compact"
                hide-details="auto"
                class="my-1"
              />
              <v-btn @click="run" style="width: 100%" variant="tonal">
                Run Simulation
              </v-btn>
            </v-form>
          </v-window-item>
          <v-window-item value="old">
            <div
              v-if="availableResults && availableResults.length === 0"
              style="width: 100%; text-align: center"
              class="pa-3"
            >
              No previous runs of this simulation type exist.
            </div>
            <v-expansion-panels v-else v-model="activeResult" variant="accordion">
              <v-expansion-panel
                v-for="result in availableResults"
                :key="result.id"
                :value="result"
                :title="timestampToTitle(result.modified)"
                bg-color="background"
              >
                <v-expansion-panel-text>
                  <v-table class="bg-transparent arg-table">
                    <tbody>
                      <tr
                        v-for="arg in activeResultInputs"
                        v-bind="arg"
                        :key="arg.key"
                      >
                        <td>{{ arg.key }}</td>
                        <td>{{ arg.value.name || arg.value }}</td>
                        <td>
                          <v-btn
                            @click="toggleVisibleArg(arg)"
                            v-if="!isArgVisible(arg) && !['SimulationResult', 'str'].includes(arg.type)"
                            style="padding: 0px"
                            density="compact"
                            color="primary"
                          >
                            Show
                          </v-btn>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                  <div
                    v-if="!result.output_data && !result.error_message && outputPoll"
                    style="width: 100%; text-align: center"
                  >
                    <v-progress-circular indeterminate />
                    Waiting for simulation to complete...
                  </div>
                  <div v-else-if="result.error_message">
                    Simulation failed with error:
                    {{ result.error_message }}
                  </div>
                  <div v-else-if="result.output_data">
                    <v-card-title>Results</v-card-title>
                    <div
                      v-if="currentSimulationType.output_type === 'node_animation'"
                      class="pa-5"
                    >
                      <div v-if="result.output_data.node_failures?.length === 0">
                        No nodes are affected in this scenario.
                      </div>
                      <node-animation
                        v-else-if="isArgVisible(networkArg)"
                        :nodeFailures="result.output_data.node_failures"
                        :nodeRecoveries="result.output_data.node_recoveries"
                        :layer="getLayerForArg(networkArg)"
                      />
                      <div v-else>
                        Show network to begin.
                      </div>
                    </div>
                    <div
                      v-else-if="currentSimulationType.output_type === 'dataset'"
                      class="pa-5"
                    >
                      <v-table class="bg-transparent">
                        <tbody>
                          <tr
                            v-for="dataset in result.output_data.datasets"
                            :key="dataset.id"
                          >
                            <td>{{ dataset.name }}</td>
                            <td>
                              <v-btn
                                v-if="dataset.layers"
                                color="primary"
                                density="compact"
                                @click="toggleVisibleDataset(dataset)"
                              >
                                Show
                              </v-btn>
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </div>
                    <div v-else>
                      Unknown simulation output type
                      {{ currentSimulationType.output_type }}
                    </div>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-window-item>
        </v-window>
      </div>
      <v-list
        v-else-if="filteredSimulationTypes?.length"
        density="compact"
      >
        <v-list-item
          v-for="simType in filteredSimulationTypes"
          :key="simType.id"
          @click="currentSimulationType=simType"
        >
          {{ simType.name }}
          <template v-slot:append>
            <v-icon icon="mdi-information-outline" size="small" v-tooltip="simType.description"></v-icon>
            <v-icon icon="mdi-earth" size="small" class="ml-2"></v-icon>
          </template>
        </v-list-item>
      </v-list>
      <v-progress-linear v-else-if="loadingSimulationTypes" indeterminate></v-progress-linear>
      <v-card-text v-else class="help-text">No available Analytics.</v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.simulations-card {
  z-index: 99;
  position: absolute;
  top: 10px;
  right: 10px;
  width: 600px;
  max-width: calc(100% - 20px);
  max-height: 45%;
  overflow: auto;
}
.arg-table td {
  padding: 0px 5px !important;
}
</style>

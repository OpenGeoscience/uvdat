<script lang="ts">
import { ref, watch } from "vue";
import {
  currentSimulationType,
  currentProject,
  selectedDatasetLayers,
} from "@/store";
import { getSimulationResults, runSimulation } from "@/api/rest";
import NodeAnimation from "./NodeAnimation.vue";
import {
  isRasterDatasetLayer,
  isVectorDatasetLayer,
  RasterDatasetLayer,
  SimulationResult,
  VectorDatasetLayer,
} from "@/types";
import { isDatasetLayerVisible, toggleDatasetLayer } from "@/layers";

export default {
  components: {
    NodeAnimation,
  },
  setup() {
    const tab = ref();
    const activeResult = ref<SimulationResult>();
    const activeResultInputs = ref<
      {
        key: string;
        viewable: boolean;
        datasetLayer: VectorDatasetLayer | RasterDatasetLayer | undefined;
        value: { name: string };
      }[]
    >([]);
    const availableResults = ref<SimulationResult[]>([]);
    const inputForm = ref();
    const selectedInputs = ref<Record<string, object[]>>({});
    const outputPoll = ref();
    const inputSelectionRules = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any) => (v ? true : "Selection required."),
    ];

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
            (r) => r.id == activeResult.value?.id
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
          // const [argName, argValue] = args[i];
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

          let datasetLayer: VectorDatasetLayer | RasterDatasetLayer | undefined;
          if (
            isVectorDatasetLayer(selectedOption) ||
            isRasterDatasetLayer(selectedOption)
          ) {
            datasetLayer = selectedOption;
          }

          // TODO: Populate network objects with correct map layer

          return {
            key: argName.replaceAll("_", " "),
            value: selectedOption,
            datasetLayer,
            viewable: datasetLayer && !isDatasetLayerVisible(datasetLayer),
          };
        })
      );
      activeResultInputs.value = inputInfo.filter((v) => v !== undefined) as {
        key: string;
        viewable: boolean;
        datasetLayer: VectorDatasetLayer | RasterDatasetLayer | undefined;
        value: { name: string };
      }[];
    }

    function pollForActiveResultOutput() {
      if (!availableResults.value) {
        clearInterval(outputPoll.value);
        outputPoll.value = undefined;
      }
      const targetResult: SimulationResult | undefined =
        availableResults.value.find(
          (r: { id: number }) => r.id == activeResult.value?.id
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
        if (!outputPoll.value && !activeResult.value.output_data) {
          outputPoll.value = setInterval(pollForActiveResultOutput, 3000);
        }
      }
    });

    watch(selectedDatasetLayers, populateActiveResultInputs);

    return {
      currentSimulationType,
      tab,
      activeResult,
      activeResultInputs,
      inputForm,
      selectedInputs,
      availableResults,
      outputPoll,
      inputSelectionRules,
      run,
      timestampToTitle,
      toggleDatasetLayer,
    };
  },
};
</script>

<template>
  <v-card class="simulations-card" v-if="currentSimulationType">
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
          >
            <v-expansion-panel-text>
              <v-table>
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
                        @click="toggleDatasetLayer(arg.datasetLayer)"
                        v-if="arg.viewable"
                      >
                        Show on Map
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
              <div
                v-if="
                  !result.output_data && !result.error_message && outputPoll
                "
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
                  v-if="currentSimulationType.output_type == 'node_animation'"
                  class="pa-5"
                >
                  <div v-if="result.output_data.node_failures?.length === 0">
                    No nodes are affected in this scenario.
                  </div>
                  <node-animation
                    v-else
                    :nodeFailures="result.output_data.node_failures"
                    :nodeRecoveries="result.output_data.node_recoveries"
                  />
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
  </v-card>
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
</style>

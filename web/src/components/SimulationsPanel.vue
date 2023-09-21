<script>
import { ref, watch } from "vue";
import { activeSimulation, currentCity, selectedDatasetIds } from "@/store";
import { getSimulationResults, runSimulation } from "@/api/rest";
import NodeFailureAnimation from "./NodeFailureAnimation.vue";

export default {
  components: {
    NodeFailureAnimation,
  },
  setup() {
    const tab = ref();
    const activeResult = ref();
    const inputForm = ref();
    const selectedInputs = ref({});
    const availableResults = ref([]);
    const outputPoll = ref();

    function run() {
      inputForm.value.validate().then(({ valid }) => {
        if (valid) {
          runSimulation(activeSimulation.value.id, selectedInputs.value).then(
            ({ result }) => {
              tab.value = "old";
              activeResult.value = result.id;
            }
          );
        }
      });
    }

    function fetchResults() {
      getSimulationResults(activeSimulation.value.id).then((results) => {
        availableResults.value = results;
      });
    }

    function timestampToTitle(timestamp) {
      const date = new Date(Date.parse(timestamp));
      return date.toUTCString();
    }

    function resultInputArgs(result) {
      let args = [];
      Object.entries(result.input_args).forEach(([k, v]) => {
        const simArg = activeSimulation.value.args.find((a) => a.name === k);
        if (simArg) {
          const selectedOption = simArg.options.find((o) => o.id === v);
          if (selectedOption) {
            args.push({
              key: k,
              value: selectedOption,
              viewable:
                !selectedDatasetIds.value.includes(selectedOption.id) &&
                currentCity.value.datasets.some(
                  (d) => d.id === selectedOption.id
                ),
            });
          }
        }
      });
      return args;
    }

    function showDataset(dataset) {
      selectedDatasetIds.value = [dataset.id, ...selectedDatasetIds.value];
    }

    function pollForActiveDatasetOutput() {
      if (!availableResults.value) {
        clearInterval(outputPoll.value);
        outputPoll.value = undefined;
      }
      const targetResult = availableResults.value.find(
        (r) => r.id == activeResult.value
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

    watch(tab, () => {
      if (tab.value === "old") {
        fetchResults();
      }
    });

    watch(activeResult, () => {
      if (activeResult.value && !activeResult.value.output_data) {
        outputPoll.value = setInterval(pollForActiveDatasetOutput, 3000);
      }
    });

    return {
      activeSimulation,
      tab,
      activeResult,
      inputForm,
      selectedInputs,
      availableResults,
      outputPoll,
      run,
      timestampToTitle,
      resultInputArgs,
      showDataset,
    };
  },
};
</script>

<template>
  <v-card class="simulations-card">
    <div style="position: absolute; right: 0">
      <v-tooltip text="Close" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-close"
            variant="plain"
            @click="activeSimulation = undefined"
          />
        </template>
      </v-tooltip>
    </div>
    <v-card-title>{{ activeSimulation.name }}</v-card-title>

    <v-tabs v-model="tab" align-tabs="center" fixed-tabs>
      <v-tab value="new">Run New</v-tab>
      <v-tab value="old">View Existing</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="new">
        <v-form class="pa-3" @submit.prevent ref="inputForm">
          <v-card-subtitle class="px-1">Select inputs</v-card-subtitle>
          <v-select
            v-for="arg in activeSimulation.args"
            v-model="selectedInputs[arg.name]"
            v-bind="arg"
            :key="arg.name"
            :label="arg.name.replaceAll('_', ' ')"
            :rules="[(v) => (v ? true : 'Selection required.')]"
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
          v-if="availableResults.length === 0"
          style="width: 100%; text-align: center"
          class="pa-3"
        >
          No previous runs of this simulation type exist.
        </div>
        <v-expansion-panels v-else v-model="activeResult" variant="accordion">
          <v-expansion-panel
            v-for="result in availableResults"
            :key="result.id"
            :value="result.id"
            :title="timestampToTitle(result.modified)"
          >
            <v-expansion-panel-text>
              <v-table>
                <tbody>
                  <tr
                    v-for="arg in resultInputArgs(result)"
                    v-bind="arg"
                    :key="arg.key"
                  >
                    <td>{{ arg.key }}</td>
                    <td>{{ arg.value.name }}</td>
                    <td>
                      <v-btn
                        @click="showDataset(arg.value)"
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
                  v-if="
                    activeSimulation.output_type === 'node_failure_animation'
                  "
                  class="pa-5"
                >
                  <div v-if="result.output_data.length === 0">
                    No nodes are affected in this scenario.
                  </div>
                  <node-failure-animation
                    v-else
                    :nodeFailures="result.output_data"
                  />
                </div>
                <div v-else>
                  Unknown simulation output type
                  {{ activeSimulation.output_type }}
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

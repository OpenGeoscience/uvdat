<script>
import { ref, watch } from "vue";
import { activeSimulation, currentCity, selectedDatasetIds } from "@/store";
import { getSimulationResults, runSimulation } from "@/api/rest";

export default {
  setup() {
    const tab = ref();
    const activeResult = ref();
    const inputForm = ref();
    const selectedInputs = ref({});
    const availableResults = ref([]);

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
      });
      return args;
    }

    function showDataset(dataset) {
      selectedDatasetIds.value = [dataset.id, ...selectedDatasetIds.value];
    }

    watch(tab, () => {
      if (tab.value === "old") {
        fetchResults();
      }
    });

    return {
      activeSimulation,
      tab,
      activeResult,
      inputForm,
      selectedInputs,
      availableResults,
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
          <v-btn @click="run" style="width: 100%" variant="tonal"
            >Run Simulation</v-btn
          >
        </v-form>
      </v-window-item>
      <v-window-item value="old">
        <v-expansion-panels v-model="activeResult">
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
  width: 800px;
  max-width: calc(100% - 20px);
  max-height: 90%;
  overflow: auto;
}
</style>

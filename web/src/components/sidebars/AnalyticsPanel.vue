<script setup lang="ts">
import { ref, watch, computed } from "vue";
import {
  currentProject,
  currentChart,
  availableAnalysisTypes,
  loadingAnalysisTypes,
  currentAnalysisType,
  mapSources,
  selectedLayers,
} from "@/store";
import {
  getDatasetLayers,
  getAnalysisResults,
  runAnalysis,
  getDataset,
  getProjectAnalysisTypes,
} from "@/api/rest";
import NodeAnimation from "./NodeAnimation.vue";
import { AnalysisResult, Layer, Chart } from "@/types";
import { addLayer, updateLayersShown } from "@/layers";


const searchText = ref();
const filteredAnalysisTypes = computed(() => {
  return availableAnalysisTypes.value?.filter((sim_type) => {
    return  !searchText.value ||
    sim_type.name.toLowerCase().includes(searchText.value.toLowerCase())
  })
})
const tab = ref();
const availableResults = ref<AnalysisResult[]>([]);
const newestFirstResults = computed(() => {
  return availableResults.value.toSorted((a, b)=> {
    const aCreated = new Date(a.created);
    const bCreated = new Date(b.created);
    return bCreated.getTime() - aCreated.getTime();
  })
})
const currentResult = ref<AnalysisResult>();
const fullInputs = ref<Record<string, any>>();
const fullOutputs = ref<Record<string, any>>();
const networkInput = computed(() => {
  if (!fullInputs.value) return undefined;
  if (fullInputs.value['network_failure']) {
    const analysis = fullInputs.value['network_failure']
    const analysisType = availableAnalysisTypes.value?.find((t) => t.db_value === analysis.analysis_type)
    const network = analysisType?.input_options.network.find(
      (o: any) => o.id ===  analysis.inputs.network
    )
    network.type = 'Network'
    const visible = isVisible(network)
    return {
      ...network,
      visible
    }
  }
  return Object.values(fullInputs.value).find(
    (input) => input.type === 'Network'
  )
})
const selectedInputs = ref<Record<string, any>>({});
const inputSelectionRules = [
  (v: any) => (v ? true : "Selection required."),
];
const additionalAnimationLayers = ref();
const inputForm = ref();
const ws = ref();

function isVisible(value: any): boolean {
  if (value.type == 'Chart') {
    return currentChart.value?.id == value.id
  } else if (value.type === 'Dataset') {
    return selectedLayers.value.some((layer) => {
      return layer.dataset.id === value.id && layer.visible
    })
  } else if (value.type === 'Layer') {
    return selectedLayers.value.some((layer) => {
      return layer.id === value.id && layer.visible
    });
  } else if (value.type === 'Network') {
    return isVisible({
      ...value.dataset,
      type: 'Dataset',
    })
  } else if (value.type === 'AnalysisResult') {
    const analysisType = availableAnalysisTypes.value?.find((t) => t.db_value === value.analysis_type)
    if (analysisType) {
      const showables: Record<string, any>[] = []
       Object.entries(value.outputs).forEach(
        ([outputKey, outputValue]) => {
          const type = analysisType?.output_types[outputKey]
          if (showableTypes.includes(type)) {
            showables.push({
              id: outputValue,
              type
            })
          }
        }
      );
      Object.entries(value.inputs).forEach(
        ([inputKey, inputValue])=> {
          const type = analysisType?.input_types[inputKey]
          const value: Record<string, any> = analysisType.input_options[inputKey]?.find((o: any) => o.id === inputValue)
          if (showableTypes.includes(type)) {
            showables.push({
              ...value,
              type
            })
          }
        }
      );
      return showables.every((o) => isVisible(o))
    }
  }
  return false;
}

function show(value: any) {
  if (value.type === 'Chart') {
    currentChart.value = value as Chart
  } else if (value.type === 'Dataset') {
    getDatasetLayers(value.id).then((layers) => {
      layers.forEach((layer) => {
        show({
          ...layer,
          type: 'Layer'
        })
      })
    })
  } else if (value.type === 'Layer') {
    let add = true
    selectedLayers.value = selectedLayers.value.map((layer) => {
        if (add && layer.id === value.id) {
          layer.visible = true;
          add = false;
        }
        return layer
    })
    if (add) addLayer(value as Layer)
    else updateLayersShown
  } else if (value.type === 'Network') {
    show({
      ...value.dataset,
      type: 'Dataset',
    })
  } else if (value.type === 'AnalysisResult') {
    const analysisType = availableAnalysisTypes.value?.find((t) => t.db_value === value.analysis_type)
    if (analysisType) {
      Object.entries(value.outputs).map(([outputKey, outputValue]) => {
        const type = analysisType.output_types[outputKey]
        if (showableTypes.includes(type)) {
          show({
            id: outputValue,
            type
          })
        }
      })
      Object.entries(value.inputs).map(([inputKey, inputValue]) => {
        const type = analysisType.input_types[inputKey]
        const value: Record<string, any> = analysisType.input_options[inputKey].find((o: any) => o.id === inputValue)
        if (showableTypes.includes(type)) {
          show({
            ...value,
            type
          })
        }
      })
    }
  }
}

const showableTypes = ['Chart', 'Dataset', 'Network', 'Layer', 'AnalysisResult']

function run() {
  inputForm.value.validate().then(({ valid }: { valid: boolean }) => {
    if (valid && currentProject.value && currentAnalysisType.value) {
      runAnalysis(
        currentAnalysisType.value.db_value,
        currentProject.value.id,
        selectedInputs.value,
      ).then((result) => {
        tab.value = 'old';
        currentResult.value = result;
        fetchResults();
      })
    }
  });
}

function fetchResults() {
  if (!currentProject.value || !currentAnalysisType.value) return;
  getAnalysisResults(
    currentAnalysisType.value.db_value,
    currentProject.value.id
  ).then((results) => {
    availableResults.value = results;
    if (currentResult.value) {
      currentResult.value = availableResults.value.find(
        (r) => r.id === currentResult.value?.id
      );
    }
  });
}

async function fillInputsAndOutputs() {
  if (!currentResult.value?.inputs){
    fullInputs.value = undefined;
    additionalAnimationLayers.value = undefined;
  } else {
    fullInputs.value = Object.fromEntries(
      Object.entries(currentResult.value.inputs).map(([key, value]) => {
        value = currentAnalysisType.value?.input_options[key]?.find(
          (o: any) => o.id == value
        );
        value.type = currentAnalysisType.value?.input_types[key]
        value.visible = isVisible(value)
        value.showable = showableTypes.includes(value.type)
        return [key, value];
      })
    );
    if (fullInputs.value?.flood_simulation && !additionalAnimationLayers.value) {
      const floodDataset = fullInputs.value?.flood_simulation.outputs.flood
      getDatasetLayers(floodDataset).then((layers) => {
        additionalAnimationLayers.value = layers;
      })
    }
  }
  if (!currentResult.value?.outputs) fullOutputs.value = undefined;
  else {
    fullOutputs.value = Object.fromEntries(
      await Promise.all(
        Object.entries(currentResult.value.outputs).map(async ([key, value]) => {
          const type = currentAnalysisType.value?.output_types[key];
          if (type == 'Dataset') {
            value = await getDataset(value)
          }
          value.type = type;
          value.visible = isVisible(value)
          value.showable = showableTypes.includes(value.type)
          return [key, value];
        })
      )
    );
  }
}

function createWebSocket() {
  if (ws.value) ws.value.close()
  if (currentProject.value) {
    const urlBase = `${process.env.VUE_APP_API_ROOT}ws/`
    const url = `${urlBase}analytics/project/${currentProject.value.id}/results/`
    ws.value = new WebSocket(url);
    ws.value.onmessage = (event: any) => {
      const data = JSON.parse(JSON.parse(event.data))
      if (currentResult.value && data.id === currentResult.value.id) {
        // only overwrite attributes expecting updates
        // overwriting the whole currentResult object will cause
        // the expansion panel to collapse
        currentResult.value.error = data.error
        currentResult.value.outputs = data.outputs
        currentResult.value.status = data.status
        currentResult.value.completed = data.completed
        currentResult.value.name = data.name
        availableResults.value = availableResults.value.map(
          (result) => result.id === data.id ? data : result
        )
      }
      if (data.completed && currentProject.value) {
        // completed result object may become an input option
        // for another analysis type, refresh available types
        getProjectAnalysisTypes(currentProject.value.id).then((types) => {
          availableAnalysisTypes.value = types;
        })
      }
    }
  }
}

watch(currentProject, createWebSocket)

watch(currentAnalysisType, () => {
  fetchResults()
})

watch(tab, () => {
  if (tab.value === "old") {
    fetchResults();
  }
});

watch(
  [currentResult, mapSources, selectedLayers, currentChart],
  fillInputsAndOutputs,
  {deep: true}
);
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
      <div v-if="currentAnalysisType" style="height: 100%; overflow: auto">
        <v-card-title class="analysis-title">
          {{ currentAnalysisType.name }}
            <v-tooltip text="Close" location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-close"
                  variant="plain"
                  @click="currentAnalysisType = undefined"
                />
              </template>
            </v-tooltip>
        </v-card-title>

        <v-tabs v-model="tab" align-tabs="center" fixed-tabs>
          <v-tab value="new">Run New</v-tab>
          <v-tab value="old">View Existing</v-tab>
        </v-tabs>

        <v-window v-model="tab">
          <v-window-item value="new">
            <v-form class="pa-3" @submit.prevent ref="inputForm">
              <v-card-subtitle class="px-1">Select inputs</v-card-subtitle>
              <v-select
                v-for="[key, value] in Object.entries(currentAnalysisType.input_options)"
                v-model="selectedInputs[key]"
                :key="key"
                :label="key.replaceAll('_', ' ')"
                :items="value"
                :rules="inputSelectionRules"
                item-value="id"
                item-title="name"
                density="compact"
                hide-details="auto"
                class="my-1"
              />
              <v-btn @click="run" style="width: 100%" variant="tonal">
                Run Analysis
              </v-btn>
            </v-form>
          </v-window-item>
          <v-window-item value="old">
            <div
              v-if="availableResults && availableResults.length === 0"
              style="width: 100%; text-align: center"
              class="pa-3"
            >
              No previous runs of this analysis type exist.
            </div>
            <v-expansion-panels v-else v-model="currentResult" variant="accordion">
              <v-expansion-panel
                v-for="result in newestFirstResults"
                :key="result.id"
                :value="result"
                :title="result.name"
                bg-color="background"
              >
                <v-expansion-panel-text class="px-3 pb-5">
                  <v-card-subtitle>Inputs</v-card-subtitle>
                  <v-table class="bg-transparent">
                    <tbody v-if="fullInputs" style="width: 100%;">
                      <tr
                        v-for="[key, value] in Object.entries(fullInputs)"
                        :key="key"
                      >
                        <td>{{ key.replaceAll('_', ' ') }}</td>
                        <td>
                          {{ value.name || value }}
                          <v-btn
                            v-if="value.showable && !value.visible"
                            density="compact"
                            color="primary"
                            @click="() => show(value)"
                          >
                            Show
                        </v-btn>
                      </td>
                      </tr>
                    </tbody>
                  </v-table>
                  <div v-if="result.error" class="pa-2">
                    <span style="color:rgb(var(--v-theme-error))">Error: </span>
                    {{ result.error }}
                  </div>
                  <div
                    v-else
                    class="pa-3"
                    style="width: 100%; text-align: center"
                  >
                    <v-progress-linear
                      v-if="!result.completed"
                      class="my-3 py-1"
                      indeterminate
                    />
                    {{ result.status }}
                  </div>
                  <div v-if="fullOutputs">
                    <v-card-subtitle>Outputs</v-card-subtitle>
                    <v-table class="bg-transparent">
                      <tbody>
                        <tr
                          v-for="[key, value] in Object.entries(fullOutputs)"
                          :key="key"
                        >
                        <template v-if="value.type == 'network_animation'">
                          <td>
                            <div v-if="value?.length === 0">
                              No nodes are affected in this scenario.
                            </div>
                            <node-animation
                              v-else-if="networkInput?.visible"
                              :nodeFailures="key === 'failures' ? value : undefined"
                              :nodeRecoveries="key === 'recoveries' ? value : undefined"
                              :network="networkInput"
                              :additionalAnimationLayers="additionalAnimationLayers"
                            />
                            <div v-else>
                              Show network to view animation.
                            </div>
                          </td>
                        </template>
                        <template v-else>
                          <td>{{ key.replaceAll('_', ' ') }}</td>
                          <td>
                            {{ value.name }}
                            <v-btn
                              v-if="value.showable && !value.visible"
                              color="primary"
                              density="compact"
                              style="display: block"
                              @click="() => show(value)"
                            >
                              Show
                            </v-btn>
                          </td>
                        </template>
                        </tr>
                      </tbody>
                    </v-table>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-window-item>
        </v-window>
      </div>
      <v-list
        v-else-if="filteredAnalysisTypes?.length"
        density="compact"
      >
        <v-list-item
          v-for="simType in filteredAnalysisTypes"
          :key="simType.id"
          @click="currentAnalysisType=simType"
        >
          {{ simType.name }}
          <template v-slot:append>
            <v-icon icon="mdi-information-outline" size="small" v-tooltip="simType.description"></v-icon>
            <v-icon icon="mdi-earth" size="small" class="ml-2"></v-icon>
          </template>
        </v-list-item>
      </v-list>
      <v-progress-linear v-else-if="loadingAnalysisTypes" indeterminate></v-progress-linear>
      <v-card-text v-else class="help-text">No available Analytics.</v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.analysis-title {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}
</style>

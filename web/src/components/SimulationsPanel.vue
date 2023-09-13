<script>
import { ref } from "vue";
import { activeSimulation } from "@/store";
import { runSimulation } from "@/api/rest";

export default {
  setup() {
    const inputForm = ref();
    const selectedInputs = ref({});
    const simResult = ref();

    function run() {
      inputForm.value.validate().then(({ valid }) => {
        if (valid) {
          runSimulation(activeSimulation.value.id, selectedInputs.value).then(
            (result) => {
              console.log(result);
            }
          );
        }
      });
    }

    return {
      activeSimulation,
      inputForm,
      selectedInputs,
      simResult,
      run,
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
    <v-form class="pa-3" v-if="!simResult" @submit.prevent ref="inputForm">
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

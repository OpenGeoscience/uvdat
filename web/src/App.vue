<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import {
  currentError,
  currentDataset,
  currentCity,
  cities,
  loading,
  loadCities,
  activeChart,
  activeSimulation,
  showMapBaseLayer,
} from "./store";
import { updateVisibleLayers } from "./utils";
import OpenLayersMap from "./components/OpenLayersMap.vue";
import MainDrawerContents from "./components/MainDrawerContents.vue";
import OptionsDrawerContents from "./components/OptionsDrawerContents.vue";
import ChartJS from "./components/ChartJS.vue";
import SimulationsPanel from "./components/SimulationsPanel.vue";

export default defineComponent({
  components: {
    OpenLayersMap,
    MainDrawerContents,
    OptionsDrawerContents,
    ChartJS,
    SimulationsPanel,
  },
  setup() {
    const drawer = ref(true);

    onMounted(loadCities);
    currentDataset.value = undefined;

    return {
      drawer,
      currentCity,
      currentDataset,
      cities,
      loading,
      currentError,
      activeChart,
      activeSimulation,
      showMapBaseLayer,
      updateVisibleLayers,
    };
  },
});
</script>

<template>
  <v-app>
    <v-overlay v-model="loading" absolute class="align-center justify-center">
      <v-progress-circular
        indeterminate
        color="white"
        size="60"
      ></v-progress-circular>
    </v-overlay>
    <v-app-bar app prominent>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>UVDAT</v-toolbar-title>
      <v-spacer />
      {{ currentError }}
      <v-spacer />
      <v-list-item prepend-icon="mdi-city">
        <v-select
          v-model="currentCity"
          :items="cities"
          item-title="name"
          density="compact"
          return-object
          :style="{ marginTop: '15px' }"
        />
      </v-list-item>
      <v-checkbox
        v-model="showMapBaseLayer"
        @change="updateVisibleLayers"
        true-icon="mdi-map-check"
        false-icon="mdi-map-outline"
        style="max-width: 50px"
        hide-details
      />
    </v-app-bar>
    <v-navigation-drawer
      v-if="currentCity"
      v-model="drawer"
      permanent
      width="250"
      class="main-area drawer"
    >
      <MainDrawerContents />
    </v-navigation-drawer>
    <v-navigation-drawer
      :model-value="currentDataset !== undefined"
      permanent
      width="250"
      location="right"
      class="main-area drawer"
    >
      <OptionsDrawerContents />
    </v-navigation-drawer>
    <div
      :class="
        drawer
          ? currentDataset
            ? 'main-area shifted-2'
            : 'main-area shifted-1'
          : 'main-area'
      "
    >
      <OpenLayersMap />
      <ChartJS v-if="activeChart" />
      <SimulationsPanel v-if="activeSimulation" />
    </div>
  </v-app>
</template>

<style scoped>
.main-area {
  position: absolute;
  top: 65px;
  height: calc(100% - 70px);
  width: 100%;
}
.options-drawer {
  left: 250px;
}
.shifted-1 {
  left: 250px;
  width: calc(100% - 250px);
}
.shifted-2 {
  left: 250px;
  right: 250px;
  width: calc(100% - 500px);
}
</style>

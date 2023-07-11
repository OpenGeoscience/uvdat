<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { currentCity, cities, loading, loadCities } from "./store";
import OpenLayersMap from "./components/OpenLayersMap.vue";
import DrawerContents from "./components/DrawerContents.vue";
import { currentError, currentDataset } from "./store";
import OptionsDrawerContents from "./components/OptionsDrawerContents.vue";

export default defineComponent({
  components: {
    OpenLayersMap,
    DrawerContents,
    OptionsDrawerContents,
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
    </v-app-bar>
    <v-navigation-drawer
      v-if="currentCity"
      v-model="drawer"
      permanent
      width="250"
      class="main-area drawer"
    >
      <DrawerContents />
    </v-navigation-drawer>
    <v-navigation-drawer
      :model-value="currentDataset !== undefined"
      permanent
      width="250"
      class="main-area drawer options-drawer"
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
  left: 500px;
  width: calc(100% - 500px);
}
</style>

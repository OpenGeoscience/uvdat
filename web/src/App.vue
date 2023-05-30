<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { currentCity, cities, loading, loadCities } from "@/store";
import OpenLayersMap from "@/components/OpenLayersMap.vue";
import DrawerContents from "./components/DrawerContents.vue";
import { currentError } from "./store";

export default defineComponent({
  components: {
    OpenLayersMap,
    DrawerContents,
  },
  setup() {
    const drawer = ref(true);

    onMounted(loadCities);

    return {
      drawer,
      currentCity,
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
      <v-toolbar-title>UVDAT Prototype</v-toolbar-title>
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
      class="map-area"
    >
      <DrawerContents />
    </v-navigation-drawer>
    <div :class="drawer ? 'map-area shifted' : 'map-area'">
      <OpenLayersMap />
    </div>
  </v-app>
</template>

<style scoped>
.map-area {
  position: absolute;
  top: 65px;
  height: calc(100% - 70px);
  width: 100%;
}
.map-area.shifted {
  left: 250px;
  width: calc(100% - 250px);
}
</style>

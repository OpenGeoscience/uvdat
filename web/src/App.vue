<script setup lang="ts">
import { watch, onMounted, computed } from "vue";
import { oauthClient } from "./api/auth";
import Map from "./components/map/Map.vue";
import SideBars from "./components/sidebars/SideBars.vue";
import ControlsBar from "./components/ControlsBar.vue";

import { useAppStore, usePanelStore, useProjectStore } from "@/store";
const appStore = useAppStore();
const panelStore = usePanelStore();
const projectStore = useProjectStore();

const showError = computed(() => appStore.currentError !== undefined);

function onReady() {
  if (appStore.currentUser) {
    projectStore.clearState();
    projectStore.loadProjects();
  }
}

const login = () => {
  oauthClient.redirectToLogin();
};

onMounted(onReady);
watch(() => appStore.currentUser, onReady);

</script>

<template>
  <v-app>
    <v-overlay
      :model-value="!appStore.currentUser"
      absolute
      persistent
      :opacity="0.8"
      scrim="secondary"
      class="align-center justify-center"
    >
      <v-btn @click="login"> Log in to Continue </v-btn>
    </v-overlay>
    <v-overlay
      v-if="appStore.currentUser"
      :model-value="showError"
      absolute
      :opacity="0.8"
      class="align-center justify-center"
    >
      <v-card class="pa-3">
        <v-btn
          icon
          variant="flat"
          @click.stop="appStore.currentError = undefined"
          class="pa-3"
          style="float: right"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-card-title> Error: </v-card-title>
        <v-card-text>
          {{ appStore.currentError }}
        </v-card-text>
      </v-card>
    </v-overlay>
    <div>
      <div
        :class="panelStore.draggingPanel ? 'main-area no-select' : 'main-area'"
        @mousemove="panelStore.dragPanel"
        @mouseup="panelStore.stopDrag"
      >
        <Map />
        <SideBars />
        <ControlsBar />
      </div>
    </div>
  </v-app>
</template>

<style>
* {
  font-family: "Inter", serif;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
}
.main-area {
  position: absolute;
  height: 100%;
  width: 100%;
}
.no-select * {
  /* Prevent text highlighting during drag events */
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>

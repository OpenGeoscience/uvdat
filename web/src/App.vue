<script setup lang="ts">
import { watch, onMounted, computed } from "vue";
import {
  currentUser,
  currentError,
  projectConfigMode,
  draggingPanel,
} from "./store";
import { oauthClient } from "./api/auth";
import { clearState, loadProjects } from "./storeFunctions";
import { dragPanel, stopDrag } from "@/drag";
import Map from "./components/map/Map.vue";
import SideBars from "./components/SideBars.vue";
import ControlsBar from "./components/ControlsBar.vue";

const showError = computed(() => currentError.value !== undefined);

function onReady() {
  if (currentUser.value) {
    clearState();
    loadProjects();
  }
}

const login = () => {
  oauthClient.redirectToLogin();
};

onMounted(onReady);
watch(currentUser, onReady);
watch(projectConfigMode, loadProjects);
</script>

<template>
  <v-app>
    <v-overlay
      :model-value="!currentUser"
      absolute
      persistent
      :opacity="0.8"
      scrim="secondary-darken-1"
      class="align-center justify-center"
    >
      <v-btn @click="login"> Log in to Continue </v-btn>
    </v-overlay>
    <v-overlay
      v-if="currentUser"
      :model-value="showError"
      absolute
      :opacity="0.8"
      class="align-center justify-center"
    >
      <v-card class="pa-3">
        <v-btn
          icon
          variant="flat"
          @click.stop="currentError = undefined"
          class="pa-3"
          style="float: right"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-card-title> Error: </v-card-title>
        <v-card-text>
          {{ currentError }}
        </v-card-text>
      </v-card>
    </v-overlay>
    <div>
      <div
        :class="draggingPanel ? 'main-area no-select' : 'main-area'"
        @mousemove="dragPanel"
        @mouseup="stopDrag"
      >
        <Map />
        <SideBars />
        <ControlsBar />
      </div>
    </div>
  </v-app>
</template>

<style scoped>
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

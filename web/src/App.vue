<script lang="ts">
import { defineComponent, ref, watch, onMounted, computed } from "vue";
import {
  currentUser,
  currentError,
  currentProject,
  currentDataset,
  availableProjects,
  currentChart,
  currentSimulationType,
  projectConfigMode,
} from "./store";
import { oauthClient, logout } from "./api/auth";
import { loadProjects } from "./storeFunctions";
import Map from "./components/map/Map.vue";
import MainDrawerContents from "./components/MainDrawerContents.vue";
import OptionsDrawerContents from "./components/OptionsDrawerContents.vue";
import ChartJS from "./components/ChartJS.vue";
import SimulationsPanel from "./components/SimulationsPanel.vue";
import ProjectConfig from "./components/ProjectConfig.vue";

export default defineComponent({
  components: {
    Map,
    MainDrawerContents,
    OptionsDrawerContents,
    ChartJS,
    SimulationsPanel,
    ProjectConfig,
  },
  setup() {
    const drawer = ref(true);
    const showError = computed(() => currentError.value !== undefined);

    function onReady() {
      if (currentUser.value) {
        loadProjects();
      }
    }

    const login = () => {
      oauthClient.redirectToLogin();
    };

    onMounted(onReady);
    watch(currentUser, onReady);
    watch(projectConfigMode, loadProjects);

    return {
      login,
      logout,
      currentUser,
      drawer,
      currentProject,
      currentDataset,
      availableProjects,
      currentError,
      showError,
      currentChart,
      currentSimulationType,
      projectConfigMode,
    };
  },
});
</script>

<template>
  <v-app>
    <v-overlay
      :model-value="!currentUser"
      absolute
      persistent
      :opacity="0.8"
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
    <v-app-bar app prominent>
      <v-app-bar-nav-icon
        @click.stop="drawer = !drawer"
        v-if="!projectConfigMode"
      />
      <v-toolbar-title>UVDAT</v-toolbar-title>
      <v-spacer />
      <div v-if="currentUser" class="px-3">
        {{ currentUser.first_name }}
        <v-btn icon>
          <v-icon>mdi-logout</v-icon>
          <v-dialog activator="parent" max-width="300">
            <template v-slot:default="{ isActive }">
              <v-card class="pa-3">
                <v-card-title>Log out?</v-card-title>
                <v-btn @click="isActive.value = false" text="Cancel" />
                <v-btn @click="logout" color="red" text="Confirm" />
              </v-card>
            </template>
          </v-dialog>
        </v-btn>
      </div>
    </v-app-bar>
    <ProjectConfig v-if="projectConfigMode" />
    <div v-else>
      <v-navigation-drawer
        v-model="drawer"
        permanent
        width="350"
        class="main-area drawer"
      >
        <MainDrawerContents />
      </v-navigation-drawer>
      <v-navigation-drawer
        :model-value="currentDataset !== undefined"
        permanent
        width="300"
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
        <Map />
        <ChartJS v-if="currentChart" />
        <SimulationsPanel v-if="currentSimulationType" />
      </div>
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
  left: 350px;
  width: calc(100% - 350px);
}
.shifted-2 {
  left: 350px;
  right: 300px;
  width: calc(100% - 650px);
}
</style>

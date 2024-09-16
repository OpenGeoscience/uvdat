<script lang="ts">
import { ref, computed } from "vue";
import { availableProjects, currentProject } from "@/store";
import ProjectContents from "./ProjectContents.vue";

export default {
  components: { ProjectContents },
  setup() {
    const searchText = ref();
    const filteredProjects = computed(() => {
      return availableProjects.value.filter((proj) => {
        return (
          !searchText.value ||
          proj.name.toLowerCase().includes(searchText.value.toLowerCase())
        );
      });
    });

    function openProjectConfig(create = false) {
      // TODO: open project config
      console.log("Open project config. create=", create);
    }

    return {
      filteredProjects,
      currentProject,
      searchText,
      openProjectConfig,
    };
  },
};
</script>

<template>
  <div>
    <v-card flat class="position-sticky top-0 pa-3" style="z-index: 2">
      <div class="d-flex mb-2">
        <v-text-field
          v-model="searchText"
          label="Search Projects"
          variant="outlined"
          density="compact"
          append-inner-icon="mdi-magnify"
          hide-details
        />
        <v-btn
          color="primary"
          variant="flat"
          style="min-width: 40px; min-height: 40px"
          class="px-0 ml-2"
          @click="() => openProjectConfig(true)"
        >
          <v-icon icon="mdi-plus" size="large" />
          <v-tooltip activator="parent" location="end">
            Create New Project
          </v-tooltip>
        </v-btn>
      </div>
      <div class="d-flex" style="justify-content: space-between">
        <v-card-subtitle>All Projects</v-card-subtitle>
        <v-icon icon="mdi-cog" color="primary" id="open-config" />
        <v-tooltip activator="#open-config" location="end">
          Configure Projects
        </v-tooltip>
      </div>
    </v-card>
    <div
      v-if="!filteredProjects || !filteredProjects.length"
      style="color: grey"
      class="my-2 mx-6 text-caption"
    >
      No Available Projects.
    </div>
    <v-expansion-panels flat rounded v-model="currentProject" class="px-3">
      <v-expansion-panel
        v-for="project in filteredProjects"
        :key="project.id"
        :value="project"
      >
        <v-expansion-panel-title color="grey-lighten-4">
          <div>
            {{ project.name }}
            <div style="color: grey" class="mt-2">
              <v-icon icon="mdi-database-outline" size="small" />
              <span class="mr-3">{{ project.item_counts.datasets }}</span>
              <v-icon icon="mdi-border-none-variant" size="small" />
              <span class="mr-3">{{ project.item_counts.regions }}</span>
              <v-icon icon="mdi-chart-bar" size="small" />
              <span class="mr-3">{{ project.item_counts.charts }}</span>
              <v-icon icon="mdi-earth" size="small" />
              <span class="mr-3">{{ project.item_counts.simulations }}</span>
            </div>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text class="pa-0">
          <v-card rounded="0" flat color="grey-lighten-2" class="pa-2">
            <project-contents
              v-if="project == currentProject"
              :project="project"
            />
          </v-card>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<style>
.v-expansion-panel {
  margin-bottom: 6px;
}
.v-expansion-panel-text__wrapper {
  padding: 0 !important;
}

.v-checkbox .v-selection-control {
  max-width: 100%;
}

.expand-icon {
  float: right;
}
</style>

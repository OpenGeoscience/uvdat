<script lang="ts">
import { ref, Ref, computed } from "vue";
import { availableProjects, currentProject, projectConfigMode } from "@/store";
import ProjectContents from "./ProjectContents.vue";
import { getCurrentMapPosition, resetMap } from "@/storeFunctions";
import { Project } from "@/types";
import { patchProject } from "@/api/rest";

export default {
  components: { ProjectContents },
  setup() {
    const searchText = ref();
    const saving: Ref<string | boolean> = ref(false);
    const filteredProjects = computed(() => {
      return availableProjects.value.filter((proj) => {
        return (
          !searchText.value ||
          proj.name.toLowerCase().includes(searchText.value.toLowerCase())
        );
      });
    });

    function openProjectConfig(create = false) {
      projectConfigMode.value = create ? "new" : true;
    }

    function saveProjectMapLocation(project: Project) {
      const { center, zoom } = getCurrentMapPosition();
      saving.value = true;
      patchProject(project.id, {
        default_map_center: center,
        default_map_zoom: zoom,
      }).then((project) => {
        availableProjects.value = availableProjects.value.map((p) => {
          if (p.id == project.id) {
            p.default_map_center = project.default_map_center;
            p.default_map_zoom = project.default_map_zoom;
          }
          return p;
        });
        resetMap(project);
        saving.value = "done";
      });
    }

    return {
      filteredProjects,
      currentProject,
      searchText,
      saving,
      openProjectConfig,
      resetMap,
      saveProjectMapLocation,
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
        <v-icon
          icon="mdi-cog"
          color="primary"
          id="open-config"
          @click="() => openProjectConfig(false)"
        />
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
        style="margin-bottom: 6px"
      >
        <v-expansion-panel-title color="grey-lighten-4">
          <div>
            {{ project.name }}
            <div style="color: grey" class="mt-2">
              <v-icon icon="mdi-database-outline" size="small" />
              <span class="mr-3" style="vertical-align: text-bottom">
                {{ project.item_counts.datasets }}
              </span>
              <v-icon icon="mdi-border-none-variant" size="small" />
              <span class="mr-3" style="vertical-align: text-bottom">
                {{ project.item_counts.regions }}
              </span>
              <v-icon icon="mdi-chart-bar" size="small" />
              <span class="mr-3" style="vertical-align: text-bottom">
                {{ project.item_counts.charts }}
              </span>
              <v-icon icon="mdi-earth" size="small" />
              <span class="mr-3" style="vertical-align: text-bottom">
                {{ project.item_counts.simulations }}
              </span>
            </div>
          </div>
          <div class="location-menu">
            <v-icon icon="mdi-map-marker-right" size="small" color="primary" />
            <v-menu
              activator="parent"
              location="end"
              open-on-hover
              :close-on-content-click="false"
              @update:model-value="saving = false"
            >
              <v-card width="250">
                <v-list selectable>
                  <v-list-item @click="resetMap(project)">
                    Go to project default map position
                  </v-list-item>
                  <v-list-item @click="saveProjectMapLocation(project)">
                    Set current map position as project default
                    <v-icon
                      v-if="saving == 'done'"
                      icon="mdi-check"
                      color="green"
                      style="float: right"
                    />
                    <v-progress-circular
                      v-else-if="saving"
                      size="15"
                      indeterminate
                      style="float: right"
                    />
                  </v-list-item>
                </v-list>
              </v-card>
            </v-menu>
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
.v-expansion-panel-text__wrapper {
  padding: 0 !important;
}
.v-checkbox .v-selection-control {
  max-width: 100%;
}
.expand-icon {
  float: right;
}
.v-expansion-panel-title__overlay {
  background-color: transparent !important;
}
.v-expansion-panel:not(:first-child)::after {
  border-top-width: 0px !important;
}
.v-expansion-panel-title__icon {
  align-self: flex-start;
}
.location-menu {
  position: absolute;
  right: 25px;
  bottom: 15px;
}
</style>

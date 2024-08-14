<script lang="ts">
import { ref, watch } from "vue";
import { currentUser, currentProject, availableProjects } from "@/store";
import { createProject, patchProject, deleteProject } from "@/api/rest";
import { getCurrentMapPosition, loadProjects } from "@/storeFunctions";

export default {
  setup() {
    const newProjectName = ref();
    const savedPosition = ref(false);
    const currentTab = ref(0);

    function create() {
      const { center, zoom } = getCurrentMapPosition();
      createProject(newProjectName.value, center, zoom).then(() => {
        newProjectName.value = undefined;
        loadProjects();
      });
    }

    function del() {
      if (currentProject.value) {
        deleteProject(currentProject.value.id).then(() => {
          currentProject.value = undefined;
          loadProjects();
        });
      }
    }

    function savePosition() {
      if (currentProject.value) {
        const { center, zoom } = getCurrentMapPosition();
        patchProject(currentProject.value.id, {
          default_map_center: center,
          default_map_zoom: zoom,
        }).then((proj) => {
          if (proj) {
            if (currentProject.value) {
              currentProject.value.default_map_center = proj.default_map_center;
              currentProject.value.default_map_zoom = proj.default_map_zoom;
            }
            savedPosition.value = true;
          }
        });
      }
    }

    watch(currentProject, () => {
      newProjectName.value = undefined;
      savedPosition.value = false;
    });

    return {
      currentUser,
      currentProject,
      availableProjects,
      newProjectName,
      savedPosition,
      currentTab,
      create,
      del,
      savePosition,
    };
  },
};
</script>

<template>
  <v-dialog max-width="70%" max-height="90%">
    <template v-slot:activator="{ props: activatorProps }">
      <v-btn v-bind="activatorProps" variant="flat" icon>
        <v-icon>mdi-cog</v-icon>
      </v-btn>
    </template>

    <template v-slot:default="{ isActive }">
      <v-card title="Project Config">
        <v-btn
          style="position: absolute; right: 0"
          variant="flat"
          icon
          @click="isActive.value = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>

        <div class="d-flex pa-2">
          <div>
            <v-tabs
              v-model="currentProject"
              v-if="availableProjects.length"
              :mandatory="false"
              direction="vertical"
              prev-icon="mdi-menu-up"
              next-icon="mdi-menu-down"
              style="max-height: 60vh"
            >
              <v-tab
                v-for="project in availableProjects"
                :key="project.id"
                :value="project"
              >
                {{ project.name }}
              </v-tab>
            </v-tabs>
            <v-card-text v-else> You do not have any projects. </v-card-text>
            <v-expansion-panels>
              <v-expansion-panel title="Create New Project">
                <v-expansion-panel-text>
                  <v-form @submit.prevent="create">
                    <v-text-field
                      v-model="newProjectName"
                      label="Name"
                      :autofocus="true"
                    ></v-text-field>
                    <v-btn v-if="newProjectName" color="green" type="submit">
                      Create
                    </v-btn>
                  </v-form>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>

          <div v-if="!currentProject" class="pa-3">
            Select a Project from the list.
          </div>
          <v-tabs-window
            v-model="currentProject"
            direction="vertical"
            style="flex: 1; align-self: stretch"
          >
            <v-tabs-window-item
              v-for="project in availableProjects"
              :key="project.id"
              :value="project"
              class="fill"
            >
              <v-card
                variant="outlined"
                :title="project.name"
                class="fill pb-10"
              >
                <v-tabs v-model="currentTab">
                  <v-tab value="0">Dataset Selection</v-tab>
                  <v-tab value="1">Access Control</v-tab>
                </v-tabs>
                <v-tabs-window v-model="currentTab">
                  <v-tabs-window-item value="0">
                    <div class="pa-2">TODO</div>
                  </v-tabs-window-item>
                  <v-tabs-window-item value="1">
                    <div class="pa-2">TODO</div>
                  </v-tabs-window-item>
                </v-tabs-window>

                <div
                  class="d-flex"
                  style="
                    position: absolute;
                    bottom: 0;
                    width: 100%;
                    justify-content: space-between;
                  "
                >
                  <v-btn
                    v-if="!savedPosition"
                    @click="savePosition"
                    style="max-width: 50%"
                  >
                    Set current map position as project default
                  </v-btn>
                  <v-card-text v-else>Saved Default Map Position.</v-card-text>
                  <v-btn v-if="currentUser?.is_superuser" color="red">
                    Delete Project
                    <v-dialog
                      v-if="currentUser?.is_superuser"
                      activator="parent"
                      max-width="300"
                    >
                      <template v-slot:default="{ isActive }">
                        <v-card class="pa-3">
                          <v-card-title>
                            Delete {{ currentProject?.name }}?
                          </v-card-title>
                          <v-btn
                            @click="isActive.value = false"
                            text="Cancel"
                          />
                          <v-btn @click="del" color="red" text="Confirm" />
                        </v-card>
                      </template>
                    </v-dialog>
                  </v-btn>
                </div>
              </v-card>
            </v-tabs-window-item>
          </v-tabs-window>
        </div>
      </v-card>
    </template>
  </v-dialog>
</template>

<style>
.fill {
  height: 100%;
  width: 100%;
}
.v-window__container {
  height: 100% !important;
}
</style>

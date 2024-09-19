<script lang="ts">
import { ref, Ref, computed, onMounted, ComputedRef } from "vue";
import { availableProjects, projectConfigMode, currentProject } from "@/store";
import DatasetList from "./DatasetList.vue";
import {
  getUsers,
  getDatasets,
  getProjectDatasets,
  setProjectDatasets,
} from "@/api/rest";
import { User, Project, Dataset } from "@/types";

export default {
  components: { DatasetList },
  setup() {
    const currentTab = ref();
    const searchText = ref();
    const filteredProjects = computed(() => {
      return availableProjects.value.filter((proj) => {
        return (
          !searchText.value ||
          proj.name.toLowerCase().includes(searchText.value.toLowerCase())
        );
      });
    });
    const selectedProject: Ref<Project | undefined> = ref();
    const allDatasets: Ref<Dataset[]> = ref([]);
    const projDatasets: Ref<Dataset[]> = ref([]);
    const projSelectedDatasetIds: Ref<number[]> = ref([]);
    const otherDatasets: ComputedRef<Dataset[]> = computed(() => {
      return allDatasets.value.filter(
        (d1) => !projDatasets.value.map((d2) => d2.id).includes(d1.id)
      );
    });
    const otherSelectedDatasetIds: Ref<number[]> = ref([]);
    const allUsers: Ref<User[]> = ref([]);
    const saving: Ref<boolean> = ref(false);

    // const newProjectName = ref();
    // const savedPosition = ref(false);

    // function create() {
    //   const { center, zoom } = getCurrentMapPosition();
    //   createProject(newProjectName.value, center, zoom).then(() => {
    //     newProjectName.value = undefined;
    //     loadProjects();
    //   });
    // }

    // function del() {
    //   if (currentProject.value) {
    //     deleteProject(currentProject.value.id).then(() => {
    //       currentProject.value = undefined;
    //       loadProjects();
    //     });
    //   }
    // }

    // function savePosition() {
    //   if (currentProject.value) {
    //     const { center, zoom } = getCurrentMapPosition();
    //     patchProject(currentProject.value.id, {
    //       default_map_center: center,
    //       default_map_zoom: zoom,
    //     }).then((proj) => {
    //       if (proj) {
    //         if (currentProject.value) {
    //           currentProject.value.default_map_center = proj.default_map_center;
    //           currentProject.value.default_map_zoom = proj.default_map_zoom;
    //         }
    //         savedPosition.value = true;
    //       }
    //     });
    //   }
    // }

    // watch(currentProject, () => {
    //   newProjectName.value = undefined;
    //   savedPosition.value = false;
    // });

    function selectProject(v: Record<string, unknown>) {
      getProjectDatasets(v.id as number).then((data) => {
        projDatasets.value = data;
      });
      selectedProject.value = availableProjects.value.find((p) => p.id == v.id);
    }

    function loadSelectedProject() {
      currentProject.value = selectedProject.value;
      projectConfigMode.value = false;
    }

    function toggleOtherDatasetSelection({
      show,
      datasets,
    }: {
      show: boolean;
      datasets: Dataset[];
    }) {
      datasets.forEach((dataset: Dataset) => {
        if (show && !otherSelectedDatasetIds.value.includes(dataset.id)) {
          otherSelectedDatasetIds.value.push(dataset.id);
        } else if (
          !show &&
          otherSelectedDatasetIds.value.includes(dataset.id)
        ) {
          otherSelectedDatasetIds.value = otherSelectedDatasetIds.value.filter(
            (id) => id != dataset.id
          );
        }
      });
    }

    function toggleProjDatasetSelection({
      show,
      datasets,
    }: {
      show: boolean;
      datasets: Dataset[];
    }) {
      datasets.forEach((dataset: Dataset) => {
        if (show && !projSelectedDatasetIds.value.includes(dataset.id)) {
          projSelectedDatasetIds.value.push(dataset.id);
        } else if (!show && projSelectedDatasetIds.value.includes(dataset.id)) {
          projSelectedDatasetIds.value = projSelectedDatasetIds.value.filter(
            (id) => id != dataset.id
          );
        }
      });
    }

    function addAllSelectionToProject() {
      saveDatasetsToProject([
        ...projDatasets.value.map((d) => d.id),
        ...otherSelectedDatasetIds.value,
      ]);
      otherSelectedDatasetIds.value = [];
    }

    function removeProjSelectionFromProject() {
      saveDatasetsToProject(
        projDatasets.value
          .map((d) => d.id)
          .filter((id) => !projSelectedDatasetIds.value.includes(id))
      );
      projSelectedDatasetIds.value = [];
    }

    function saveDatasetsToProject(ids: number[]) {
      saving.value = true;
      if (selectedProject.value) {
        setProjectDatasets(selectedProject.value.id, ids).then((project) => {
          projDatasets.value = project.datasets;
          saving.value = false;
        });
      }
    }

    onMounted(() => {
      getUsers().then((data) => {
        allUsers.value = data;
      });
      getDatasets().then((data) => {
        allDatasets.value = data;
      });
    });

    return {
      currentTab,
      projectConfigMode,
      searchText,
      filteredProjects,
      selectedProject,
      otherDatasets,
      otherSelectedDatasetIds,
      projDatasets,
      projSelectedDatasetIds,
      allUsers,
      saving,
      selectProject,
      loadSelectedProject,
      toggleOtherDatasetSelection,
      toggleProjDatasetSelection,
      addAllSelectionToProject,
      removeProjSelectionFromProject,
      // currentUser,
      // availableProjects,
      // newProjectName,
      // savedPosition,
      // currentTab,
      // create,
      // del,
      // savePosition,
    };
  },
};
</script>

<template>
  <v-card flat class="config">
    <v-card-title class="pa-3 bg-grey-lighten-2 text-grey-darken-2">
      Projects Configuration
      <v-btn
        class="close-button transparent"
        variant="flat"
        icon
        @click="projectConfigMode = false"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text class="d-flex pa-0" style="height: 100%">
      <div class="bg-grey-lighten-4 sidebar">
        <v-card
          flat
          class="position-sticky top-0 pa-3 bg-grey-lighten-4"
          style="z-index: 2"
        >
          <v-text-field
            v-model="searchText"
            label="Search Projects"
            variant="outlined"
            density="compact"
            append-inner-icon="mdi-magnify"
            hide-details
          />
        </v-card>
        <v-list
          :items="filteredProjects"
          item-title="name"
          item-value="id"
          class="transparent"
          color="primary"
          selectable
          @click:select="selectProject"
        />
        <v-btn
          v-if="selectedProject"
          class="options"
          @click="loadSelectedProject"
          color="primary"
        >
          Load Project On Map
        </v-btn>
      </div>
      <div v-if="selectedProject" class="tab-content">
        <v-tabs v-model="currentTab" color="primary">
          <v-tab value="datasets" class="text-grey">Dataset Selection</v-tab>
          <v-tab value="users" class="text-grey">Access Control</v-tab>
          <v-tab value="map" class="text-grey">Default Map Position</v-tab>
        </v-tabs>
        <div
          v-if="currentTab == 'datasets' && projDatasets.length"
          class="py-3 px-6 d-flex"
        >
          <div style="width: 30%">
            <v-card-text class="text-grey">Available Datasets</v-card-text>
            <v-card class="pa-2 dataset-card">
              <dataset-list
                :datasets="otherDatasets"
                :selected-ids="otherSelectedDatasetIds"
                @toggle-datasets="toggleOtherDatasetSelection"
                id-prefix="all"
              />
            </v-card>
            <v-btn
              color="primary"
              @click="addAllSelectionToProject"
              :disabled="saving || !otherSelectedDatasetIds.length"
              class="mt-2"
            >
              Add
              <v-icon icon="mdi-chevron-double-right" />
              <v-progress-circular
                size="25"
                indeterminate
                v-if="saving"
                class="ml-4"
              />
            </v-btn>
          </div>
          <div class="ml-10" style="width: 30%">
            <v-card-text class="text-grey">Project Datasets</v-card-text>
            <v-card class="pa-2 dataset-card">
              <dataset-list
                :datasets="projDatasets"
                :selected-ids="projSelectedDatasetIds"
                @toggle-datasets="toggleProjDatasetSelection"
                id-prefix="proj"
              />
            </v-card>
            <v-btn
              color="primary"
              @click="removeProjSelectionFromProject"
              :disabled="saving || !projSelectedDatasetIds.length"
              class="mt-2"
            >
              <v-icon icon="mdi-chevron-double-left" />
              Remove
              <v-progress-circular
                size="25"
                indeterminate
                v-if="saving"
                class="ml-4"
              />
            </v-btn>
          </div>
        </div>
        <div v-if="currentTab == 'users'" class="py-3 px-6">Users</div>
        <div v-if="currentTab == 'map'" class="py-3 px-6">Map</div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style>
.config {
  top: 65px;
  height: calc(100% - 65px);
  width: 100%;
}
.transparent {
  background-color: transparent !important;
}
.close-button {
  position: absolute !important;
  top: 5px;
  right: 5px;
}
.sidebar {
  width: 300px;
  height: 100%;
}
.options {
  position: absolute !important;
  bottom: 0px;
  width: inherit;
}
.tab-content {
  width: calc(100% - 300px);
  height: inherit;
}
.dataset-card {
  max-height: calc(100vh - 300px);
  overflow: auto !important;
}
</style>

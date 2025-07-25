<script setup lang="ts">
import { ref, Ref, computed, onMounted, ComputedRef, watch } from "vue";
import DatasetSelect from "@/components/projects/DatasetSelect.vue";
import AccessControl from "@/components/projects/AccessControl.vue";
import {
  getDatasets,
  getProjectDatasets,
  createProject,
  deleteProject,
  patchProject,
} from "@/api/rest";
import { Project, Dataset } from "@/types";

import { useMapStore, useAppStore, useProjectStore, useLayerStore } from "@/store";
const projectStore = useProjectStore();
const appStore = useAppStore();
const mapStore = useMapStore();
const layerStore = useLayerStore()

const currentTab = ref();
const searchText = ref<string | undefined>();
const filteredProjects = computed(() => {
  return projectStore.availableProjects.filter((proj) => {
    return (
      !searchText.value ||
      proj.name.toLowerCase().includes(searchText.value.toLowerCase())
    );
  });
});
const selectedProject: Ref<Project | undefined> = ref();
const allDatasets: Ref<Dataset[]> = ref([]);
const projDatasets: Ref<Dataset[] | undefined> = ref();
const projSelectedDatasetIds: Ref<number[]> = ref([]);
const otherDatasets: ComputedRef<Dataset[]> = computed(() => {
  return allDatasets.value.filter(
    (d1) => !projDatasets.value?.map((d2) => d2.id).includes(d1.id)
  );
});
const otherSelectedDatasetIds: Ref<number[]> = ref([]);

const permissions = computed(() => {
  const ret = Object.fromEntries(
    projectStore.availableProjects.map((p) => {
      let perm = "follower";
      if (p.id === selectedProject.value?.id) {
        p = selectedProject.value;
      }
      if (
        p.owner?.id === appStore.currentUser?.id ||
        appStore.currentUser?.is_superuser
      ) {
        perm = "owner";
      } else if (
        appStore.currentUser &&
        p.collaborators.map((u) => u.id).includes(appStore.currentUser.id)
      ) {
        perm = "collaborator";
      }
      return [p.id, perm];
    })
  );
  return ret;
});
const saving = ref<"waiting" | "done">();
const newProjectName = ref();
const projectToEdit: Ref<Project | undefined> = ref();
const projectToDelete: Ref<Project | undefined> = ref();

function openProjectConfig(create = false) {
  projectStore.projectConfigMode = create ? "new" : "existing";
}

function create() {
  const { center, zoom } = mapStore.getCurrentMapPosition();
  createProject(newProjectName.value, center, zoom).then((project) => {
    newProjectName.value = undefined;
    projectStore.projectConfigMode = "existing";
    projectStore.loadProjects();
    selectProject(project);
  });
}

function del() {
  if (projectToDelete.value) {
    deleteProject(projectToDelete.value.id).then(() => {
      projectStore.loadProjects();
      if (selectedProject.value?.id === projectToDelete.value?.id) {
        selectedProject.value = undefined;
      }
      projectToDelete.value = undefined;
    });
  }
}

function saveProjectName() {
  if (!newProjectName.value) {
    projectToEdit.value = undefined;
    return;
  }
  saving.value = "waiting";
  if (projectToEdit.value) {
    patchProject(projectToEdit.value.id, {
      name: newProjectName.value,
    }).then(() => {
      projectToEdit.value = undefined;
      newProjectName.value = undefined;
      saving.value = "done";
      projectStore.loadProjects();
      setTimeout(() => {
        saving.value = undefined;
      }, 2000);
    });
  }
}

function saveProjectMapLocation(project: Project | undefined) {
  if (project) {
    saving.value = "waiting";
    const { center, zoom } = mapStore.getCurrentMapPosition();
    patchProject(project.id, {
      default_map_center: center,
      default_map_zoom: zoom,
    }).then((project) => {
      projectStore.availableProjects = projectStore.availableProjects.map((p) => {
        if (p.id === project.id) {
          p.default_map_center = project.default_map_center;
          p.default_map_zoom = project.default_map_zoom;
        }
        return p;
      });
      if (projectStore.currentProject) {
        projectStore.currentProject.default_map_center = project.default_map_center
        projectStore.currentProject.default_map_zoom = project.default_map_zoom
      }
      mapStore.setMapCenter(project);
      saving.value = "done";
      setTimeout(() => {
        saving.value = undefined;
      }, 2000);
    });
  }
}

function selectProject(project: Project) {
  if (selectedProject.value?.id !== project.id) {
    selectedProject.value = project;
    projectStore.loadingDatasets = true;
    getDatasets().then(async (datasets) => {
      allDatasets.value = datasets
      allDatasets.value.forEach((dataset: Dataset) => {
        layerStore.fetchAvailableLayersForDataset(dataset.id)
      })
    })
    refreshProjectDatasets(null);
  }
}

function loadSelectedProject() {
  projectStore.currentProject = selectedProject.value;
  projectStore.projectConfigMode = undefined;
}

function toggleOtherDatasetSelection(datasets: Dataset[]) {
  datasets.forEach((dataset: Dataset) => {
    if (!otherSelectedDatasetIds.value.includes(dataset.id)) {
      otherSelectedDatasetIds.value.push(dataset.id);
    } else {
      otherSelectedDatasetIds.value = otherSelectedDatasetIds.value.filter(
        (id) => id !== dataset.id
      );
    }
  });
}

function toggleProjDatasetSelection(datasets: Dataset[]) {
  datasets.forEach((dataset: Dataset) => {
    if (!projSelectedDatasetIds.value.includes(dataset.id)) {
      projSelectedDatasetIds.value.push(dataset.id);
    } else {
      projSelectedDatasetIds.value = projSelectedDatasetIds.value.filter(
        (id) => id !== dataset.id
      );
    }
  });
}

function addAllSelectionToProject() {
  if (projDatasets.value) {
    saveDatasetsToProject([
      ...projDatasets.value.map((d) => d.id),
      ...otherSelectedDatasetIds.value,
    ]);
    otherSelectedDatasetIds.value = [];
  }
}

function removeProjSelectionFromProject() {
  if (projDatasets.value) {
    saveDatasetsToProject(
      projDatasets.value
        .map((d) => d.id)
        .filter((id) => !projSelectedDatasetIds.value.includes(id))
    );
    projSelectedDatasetIds.value = [];
  }
}

function saveDatasetsToProject(ids: number[]) {
  saving.value = "waiting";
  if (selectedProject.value) {
    patchProject(selectedProject.value.id, {
      datasets: ids,
    }).then(() => {
      refreshProjectDatasets(() => {
        saving.value = "done";
        setTimeout(() => {
          saving.value = undefined;
        }, 2000);
      })
    });
  }
}

function updateSelectedProject(newProjectData: Project) {
  projectStore.loadProjects();
  selectedProject.value = newProjectData;
}

function refreshProjectDatasets(callback: Function | null) {
  if (selectedProject.value) {
    getProjectDatasets(selectedProject.value.id).then(async (datasets) => {
      projDatasets.value = datasets
      projDatasets.value.forEach((dataset: Dataset) => {
        layerStore.fetchAvailableLayersForDataset(dataset.id)
      })
      if (callback) callback();
    });
  }
}

function resetProjectEdit() {
  projectStore.projectConfigMode = "existing";
  newProjectName.value = undefined;
  projectToDelete.value = undefined;
  projectToEdit.value = undefined;
}

function handleEditFocus(focused: boolean) {
  if (!focused && !newProjectName) {
    resetProjectEdit();
  }
}

onMounted(() => {
  window.addEventListener("keydown", (e) => {
    if (e.key == "Escape" && projectStore.projectConfigMode) {
      projectStore.projectConfigMode = undefined;
    }
  });
});

watch(selectedProject, resetProjectEdit);

watch(otherDatasets, () => {
  if (allDatasets.value && projDatasets.value) {
    projectStore.loadingDatasets = false;
  }
})

watch(() => projectStore.projectConfigMode, () => {
  if (projectStore.currentProject) {
    if (projectStore.projectConfigMode) selectProject(projectStore.currentProject)
    else projectStore.currentProject = projectStore.availableProjects.find(
      (p) => p.id === projectStore.currentProject?.id
    )  // trigger project reload
  }
})
</script>

<template>
  <div>
    <div class="project-row my-5">
      <v-select
        label="Current Project"
        placeholder="Select a Project"
        no-data-text="No available projects."
        :items="projectStore.availableProjects"
        :autofocus="!projectStore.currentProject"
        v-model="projectStore.currentProject"
        item-title="name"
        item-value="id"
        density="compact"
        variant="outlined"
        hide-details
        return-object
      ></v-select>
      <v-btn
        color="primary"
        variant="flat"
        style="min-width: 30px; height: 30px"
        class="px-0 ml-2"
        @click="() => openProjectConfig(true)"
      >
        <v-icon icon="mdi-plus" size="large" />
        <v-tooltip activator="parent" location="end">
          Create New Project
        </v-tooltip>
      </v-btn>
      <v-btn
        color="secondary"
        variant="flat"
        style="min-width: 30px; height: 30px"
        class="px-0 ml-2"
        @click="() => openProjectConfig(false)"
      >
        <v-icon icon="mdi-cog" size="large" color="primary" />
        <v-tooltip activator="parent" location="end">
          Configure Projects
        </v-tooltip>
      </v-btn>
    </div>
    <v-card
      v-if="!projectStore.loadingProjects && projectStore.availableProjects.length === 0"
      class="tutorial-popup"
    >
      <v-card-text>
        To get started, create a project and add datasets to it.
      </v-card-text>
    </v-card>
    <div class="project-row" v-if="projectStore.currentProject">
      <span class="item-counts">
        <v-icon icon="mdi-database-outline" v-tooltip="'Datasets'"></v-icon>
        {{ projectStore.currentProject.item_counts.datasets || 0 }}
        <v-icon
          icon="mdi-border-none-variant"
          v-tooltip="'Regions'"
          class="ml-3"
        ></v-icon>
        {{ projectStore.currentProject.item_counts.regions || 0 }}
        <v-icon icon="mdi-poll" v-tooltip="'Charts'" class="ml-3"></v-icon>
        {{ projectStore.currentProject.item_counts.charts || 0 }}
        <v-icon icon="mdi-earth" v-tooltip="'Analyses'" class="ml-3"></v-icon>
        {{ projectStore.currentProject.item_counts.analyses || 0 }}
      </span>
      <v-menu
        location="end"
        open-on-hover
        open-delay="150"
        :close-on-content-click="false"
      >
        <template v-slot:activator="{ props }">
          <v-icon
            v-bind="props"
            icon="mdi-map-marker-right"
            size="small"
            color="primary"
            @click.stop
          />
        </template>
        <v-card width="250">
          <v-list selectable>
            <v-list-item @click="() => mapStore.setMapCenter(projectStore.currentProject)">
              Go to project default map position
            </v-list-item>
            <v-list-item @click="() => saveProjectMapLocation(projectStore.currentProject)">
              Set current map position as project default
              <v-icon
                v-if="saving === 'done'"
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
    <v-card v-if="projectStore.projectConfigMode" flat class="config" color="background">
      <v-card-title class="pa-3">
        Projects Configuration
        <v-btn
          class="close-button transparent"
          variant="flat"
          icon
          @click="projectStore.projectConfigMode = undefined"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="d-flex pa-0" style="height: 100%">
        <div class="sidebar">
          <v-card flat class="position-sticky top-0 pa-3" style="z-index: 2" color="background">
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
            class="transparent"
            color="primary"
            selectable
          >
            <v-list-item
              v-for="project in filteredProjects"
              :title="project.name"
              :active="project.id === selectedProject?.id"
              @click="() => selectProject(project)"
            >
            <template v-slot:title="{ title }">
              <v-text-field
                v-if="projectToEdit?.id === project.id"
                v-model="newProjectName"
                :placeholder="project.name"
                label="Project Name"
                density="compact"
                hide-details
                autofocus
                @keydown.stop
                @keydown.esc="resetProjectEdit"
                @keydown.enter="saveProjectName"
                @update:focused="handleEditFocus"
              />
              <span v-else>{{ title }}</span>
            </template>
            <template v-slot:append>
              <div
                v-if="['owner', 'collaborator'].includes(permissions[project.id])"
              >
                <v-icon
                  icon="mdi-pencil"
                  v-if="!projectToEdit && !projectToDelete"
                  @click.stop="projectToEdit = project"
                />
                <v-btn
                  v-else-if="projectToEdit?.id === project.id"
                  color="primary"
                  variant="flat"
                  style="min-width: 40px; min-height: 40px"
                  :disabled="!newProjectName"
                  @click="saveProjectName"
                >
                  <v-icon icon="mdi-content-save" />
                </v-btn>
              </div>
              <div v-if="['owner'].includes(permissions[project.id])">
                <v-icon
                  icon="mdi-trash-can"
                  v-if="!projectToEdit && !projectToDelete"
                  @click.stop="projectToDelete = project"
                />
              </div>
            </template>
            </v-list-item>
          </v-list>
          <div class="pa-2 d-flex" v-if="projectStore.projectConfigMode === 'new'">
            <v-text-field
              v-model="newProjectName"
              label="Project Name"
              density="compact"
              autofocus
              @keydown.enter="create"
              @keydown.esc="resetProjectEdit"
              @update:focused="handleEditFocus"
            />
            <v-btn
              color="primary"
              variant="flat"
              style="min-width: 40px; min-height: 40px"
              :disabled="!newProjectName"
              @click="create"
            >
              <v-icon icon="mdi-arrow-right" />
            </v-btn>
          </div>
          <v-btn
            v-else
            variant="tonal"
            width="100%"
            @click="projectStore.projectConfigMode = 'new'"
            >+ New</v-btn
          >
          <v-btn
            v-if="selectedProject"
            class="options"
            @click="loadSelectedProject"
            color="primary"
          >
            Load Project
          </v-btn>
        </div>
        <div v-if="selectedProject" class="tab-content">
          <v-tabs v-model="currentTab" color="primary">
            <v-tab value="datasets">Dataset Selection</v-tab>
            <v-tab value="users">Access Control</v-tab>
          </v-tabs>
          <div
            v-if="currentTab === 'datasets'"
          >
            <v-progress-linear v-if="projectStore.loadingDatasets" indeterminate></v-progress-linear>
            <div v-else class="py-3 px-6 d-flex">
              <div style="width: 30%">
                <v-card-text>Available Datasets</v-card-text>
                <v-card class="pa-2 dataset-card">
                  <DatasetSelect
                    :datasets="otherDatasets"
                    :selected-ids="otherSelectedDatasetIds"
                    @toggleDatasets="toggleOtherDatasetSelection"
                  />
                </v-card>
                <v-btn
                  color="primary"
                  @click="addAllSelectionToProject"
                  :disabled="!!saving || !otherSelectedDatasetIds.length"
                  class="mt-2"
                >
                  Add
                  <v-icon icon="mdi-chevron-double-right" />
                  <v-icon
                    v-if="saving === 'done'"
                    icon="mdi-check"
                    color="green"
                    class="ml-4"
                  />
                  <v-progress-circular
                    v-else-if="saving"
                    size="25"
                    indeterminate
                    class="ml-4"
                  />
                </v-btn>
              </div>
              <div class="ml-10" style="width: 30%">
                <v-card-text>Project Datasets</v-card-text>
                <v-card class="pa-2 dataset-card">
                  <DatasetSelect
                    :datasets="projDatasets"
                    :selected-ids="projSelectedDatasetIds"
                    @toggleDatasets="toggleProjDatasetSelection"
                  />
                </v-card>
                <v-btn
                  color="primary"
                  @click="removeProjSelectionFromProject"
                  :disabled="!!saving || !projSelectedDatasetIds.length"
                  class="mt-2"
                >
                  <v-icon icon="mdi-chevron-double-left" />
                  Remove
                  <v-icon
                    v-if="saving === 'done'"
                    icon="mdi-check"
                    color="green"
                    class="ml-4"
                  />
                  <v-progress-circular
                    v-else-if="saving"
                    size="25"
                    indeterminate
                    class="ml-4"
                  />
                </v-btn>
              </div>
            </div>
          </div>
          <div v-if="currentTab === 'users'" class="py-3 px-6">
            <AccessControl
              :project="selectedProject"
              :permissions="permissions"
              @updateSelectedProject="updateSelectedProject"
            />
          </div>
        </div>
      </v-card-text>
      <v-dialog :model-value="!!projectToDelete" width="300">
        <v-card v-if="projectToDelete">
          <v-card-title class="pa-3">
            Delete project
            <v-btn
              class="close-button transparent"
              variant="flat"
              icon
              @click="projectToDelete = undefined"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            Are you sure you want to delete "{{ projectToDelete.name }}"?
          </v-card-text>
          <v-card-actions class="d-flex" style="justify-content: space-evenly">
            <v-btn color="red" @click="del">Delete</v-btn>
            <v-btn
              color="primary"
              @click="projectToDelete = undefined"
              variant="tonal"
            >
              Cancel
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </div>
</template>

<style>
.project-row {
  display: flex;
  margin: 0px 8px;
  align-items: center;
  justify-content: space-between;
}
.item-counts {
  display: flex;
  align-items: baseline;
  column-gap: 4px;
}
.tutorial-popup {
  position: absolute !important;
  z-index: 1 !important;
  left: 275px;
  top: 110px;
  width: 250px;
  background-color: rgba(1, 1, 1, 0.8) !important;
  color: white !important;
}
.config {
  top: 0px;
  margin: 0px;
  height: calc(100vh - 20px);
  width: calc(100vw - 20px);
  position: absolute !important;
  z-index: 10001 !important;
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
  left: 0px;
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

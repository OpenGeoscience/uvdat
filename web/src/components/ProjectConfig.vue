<script setup lang="ts">
import { ref, Ref, computed, onMounted, ComputedRef, watch } from "vue";
import {
  availableProjects,
  projectConfigMode,
  currentProject,
  currentUser,
} from "@/store";
import DatasetList from "./DatasetList.vue";
import AccessControl from "./AccessControl.vue";
import {
  getDatasets,
  getProjectDatasets,
  createProject,
  deleteProject,
  patchProject,
} from "@/api/rest";
import { Project, Dataset } from "@/types";
import {
  getCurrentMapPosition,
  loadProjects,
  setMapCenter,
} from "@/storeFunctions";

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
    availableProjects.value.map((p) => {
      let perm = "follower";
      if (p.id === selectedProject.value?.id) {
        p = selectedProject.value;
      }
      if (
        p.owner?.id === currentUser.value?.id ||
        currentUser.value?.is_superuser
      ) {
        perm = "owner";
      } else if (
        currentUser.value &&
        p.collaborators.map((u) => u.id).includes(currentUser.value.id)
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
  projectConfigMode.value = create ? "new" : "existing";
}

function create() {
  const { center, zoom } = getCurrentMapPosition();
  createProject(newProjectName.value, center, zoom).then(() => {
    newProjectName.value = undefined;
    projectConfigMode.value = "existing";
    loadProjects();
  });
}

function del() {
  if (projectToDelete.value) {
    deleteProject(projectToDelete.value.id).then(() => {
      loadProjects();
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
      loadProjects();
      setTimeout(() => {
        saving.value = undefined;
      }, 2000);
    });
  }
}

function saveProjectMapLocation(project: Project | undefined) {
  if (project) {
    saving.value = "waiting";
    const { center, zoom } = getCurrentMapPosition();
    patchProject(project.id, {
      default_map_center: center,
      default_map_zoom: zoom,
    }).then((project) => {
      availableProjects.value = availableProjects.value.map((p) => {
        if (p.id === project.id) {
          p.default_map_center = project.default_map_center;
          p.default_map_zoom = project.default_map_zoom;
        }
        return p;
      });
      setMapCenter(project);
      saving.value = "done";
      setTimeout(() => {
        saving.value = undefined;
      }, 2000);
    });
  }
}

function selectProject(v: Record<string, unknown>) {
  if (selectedProject.value?.id !== v.id) {
    getProjectDatasets(v.id as number).then((data) => {
      projDatasets.value = data;
    });
    selectedProject.value = availableProjects.value.find((p) => p.id === v.id);
  }
}

function loadSelectedProject() {
  currentProject.value = selectedProject.value;
  projectConfigMode.value = undefined;
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
    } else if (!show && otherSelectedDatasetIds.value.includes(dataset.id)) {
      otherSelectedDatasetIds.value = otherSelectedDatasetIds.value.filter(
        (id) => id !== dataset.id
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
    }).then((project) => {
      getProjectDatasets(project.id).then((datasets) => {
        projDatasets.value = datasets;
        saving.value = "done";
        setTimeout(() => {
          saving.value = undefined;
        }, 2000);
      });
    });
  }
}

function updateSelectedProject(newProjectData: Project) {
  loadProjects();
  selectedProject.value = newProjectData;
}

watch(selectedProject, () => {
  resetProjectEdit();
});

watch(projectConfigMode, () => {
  if (projectConfigMode) {
    getDatasets().then((data) => {
      allDatasets.value = data;
    });
  }
});

onMounted(() => {
  window.addEventListener("keydown", (e) => {
    if (e.key == "Escape" && projectConfigMode.value) {
      projectConfigMode.value = undefined;
    }
  });
});

function resetProjectEdit() {
  projectConfigMode.value = "existing";
  newProjectName.value = undefined;
  projectToDelete.value = undefined;
  projectToEdit.value = undefined;
}

function handleEditFocus(focused: boolean) {
  if (!focused) {
    resetProjectEdit();
  }
}
</script>

<template>
  <div>
    <div class="project-row">
      <v-select
        label="Current Project"
        placeholder="Select a Project"
        :items="availableProjects"
        :autofocus="!currentProject"
        v-model="currentProject"
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
    <div class="project-row" v-if="currentProject">
      <span>
        <v-icon icon="mdi-database-outline" v-tooltip="'Datasets'"></v-icon>
        {{ currentProject.item_counts.datasets || 0 }}
        <v-icon
          icon="mdi-border-none-variant"
          v-tooltip="'Regions'"
          class="ml-3"
        ></v-icon>
        {{ currentProject.item_counts.regions || 0 }}
        <v-icon icon="mdi-poll" v-tooltip="'Charts'" class="ml-3"></v-icon>
        {{ currentProject.item_counts.charts || 0 }}
        <v-icon icon="mdi-earth" v-tooltip="'Analyses'" class="ml-3"></v-icon>
        {{ currentProject.item_counts.simulations || 0 }}
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
            <v-list-item @click="() => setMapCenter(currentProject)">
              Go to project default map position
            </v-list-item>
            <v-list-item @click="() => saveProjectMapLocation(currentProject)">
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
    <v-card v-if="projectConfigMode" flat class="config">
      <v-card-title class="pa-3">
        Projects Configuration
        <v-btn
          class="close-button transparent"
          variant="flat"
          icon
          @click="projectConfigMode = undefined"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="d-flex pa-0" style="height: 100%">
        <div class="sidebar">
          <v-card flat class="position-sticky top-0 pa-3" style="z-index: 2">
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
          >
            <template v-slot:title="{ title, item }">
              <v-text-field
                v-if="projectToEdit?.id === item.id"
                v-model="newProjectName"
                :placeholder="item.name"
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
            <template v-slot:append="{ item }">
              <div
                v-if="['owner', 'collaborator'].includes(permissions[item.id])"
              >
                <v-icon
                  icon="mdi-pencil"
                  v-if="!projectToEdit && !projectToDelete"
                  @click.stop="projectToEdit = item"
                />
                <v-btn
                  v-else-if="projectToEdit?.id === item.id"
                  color="primary"
                  variant="flat"
                  style="min-width: 40px; min-height: 40px"
                  :disabled="!newProjectName"
                  @click="saveProjectName"
                >
                  <v-icon icon="mdi-content-save" />
                </v-btn>
              </div>
              <div v-if="['owner'].includes(permissions[item.id])">
                <v-icon
                  icon="mdi-trash-can"
                  v-if="!projectToEdit && !projectToDelete"
                  @click.stop="projectToDelete = item"
                />
              </div>
            </template>
          </v-list>
          <div class="pa-2 d-flex" v-if="projectConfigMode === 'new'">
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
            @click="projectConfigMode = 'new'"
            >+ New</v-btn
          >
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
            <v-tab value="datasets">Dataset Selection</v-tab>
            <v-tab value="users">Access Control</v-tab>
          </v-tabs>
          <div
            v-if="currentTab === 'datasets' && projDatasets"
            class="py-3 px-6 d-flex"
          >
            <div style="width: 30%">
              <v-card-text>Available Datasets</v-card-text>
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

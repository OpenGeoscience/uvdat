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
import { getCurrentMapPosition, loadProjects } from "@/storeFunctions";

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
      let perm = "view";
      if (p.id === selectedProject.value?.id) {
        p = selectedProject.value;
      }
      if (
        p.owner?.id === currentUser.value?.id ||
        currentUser.value?.is_superuser
      ) {
        perm = "own";
      } else if (
        currentUser.value &&
        p.collaborators.map((u) => u.id).includes(currentUser.value.id)
      ) {
        perm = "edit";
      }
      return [p.id, perm];
    })
  );
  return ret;
});
const saving: Ref<boolean> = ref(false);
const newProjectName = ref();
const projectToEdit: Ref<Project | undefined> = ref();
const projectToDelete: Ref<Project | undefined> = ref();

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
  saving.value = true;
  if (projectToEdit.value) {
    patchProject(projectToEdit.value.id, {
      name: newProjectName.value,
    }).then(() => {
      projectToEdit.value = undefined;
      newProjectName.value = undefined;
      saving.value = false;
      loadProjects();
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
  saving.value = true;
  if (selectedProject.value) {
    patchProject(selectedProject.value.id, {
      datasets: ids,
    }).then((project) => {
      getProjectDatasets(project.id).then((datasets) => {
        projDatasets.value = datasets;
        saving.value = false;
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

onMounted(() => {
  getDatasets().then((data) => {
    allDatasets.value = data;
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
  <v-card flat class="config">
    <v-card-title class="pa-3 bg-grey-lighten-2 text-grey-darken-2">
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
              v-if="['own', 'edit'].includes(permissions[item.id])"
              class="text-grey-darken-1"
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
            <div
              v-if="['own'].includes(permissions[item.id])"
              class="text-grey-darken-1"
            >
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
          <v-tab value="datasets" class="text-grey">Dataset Selection</v-tab>
          <v-tab value="users" class="text-grey">Access Control</v-tab>
        </v-tabs>
        <div
          v-if="currentTab === 'datasets' && projDatasets"
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
        <v-card-title class="pa-3 bg-grey-lighten-2 text-grey-darken-2">
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

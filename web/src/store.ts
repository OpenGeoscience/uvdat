import { ref } from "vue";
import {
  Project,
  Dataset,
} from "./types.js";


// Project
export const loadingProjects = ref<boolean>(true);
export const availableProjects = ref<Project[]>([]);
export const currentProject = ref<Project>();
export const projectConfigMode = ref<"new" | "existing">();
export const polls = ref<Record<number, number>>({});
export const loadingDatasets = ref<boolean>(false);
export const availableDatasets = ref<Dataset[]>();

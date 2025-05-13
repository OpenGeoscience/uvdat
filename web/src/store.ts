import { ref } from "vue";
import {
  User,
  Project,
  Chart,
  Dataset,
  SourceRegion,
  AnalysisType,
  FloatingPanelConfig,
  Network,
  NetworkNode,
  NetworkEdge
} from "./types.js";

// UI Config
export const theme = ref<"dark" | "light">("light");
export const openSidebars = ref<("left" | "right")[]>(["left", "right"]);
export const panelArrangement = ref<FloatingPanelConfig[]>([]);
export const draggingPanel = ref<string | undefined>();
export const draggingFrom = ref<{ x: number; y: number } | undefined>();
export const dragModes = ref<("position" | "height" | "width")[]>();

// Project
export const loadingProjects = ref<boolean>(true);
export const availableProjects = ref<Project[]>([]);
export const currentProject = ref<Project>();
export const projectConfigMode = ref<"new" | "existing">();

// Datasets
export const loadingDatasets = ref<boolean>(false);
export const availableDatasets = ref<Dataset[]>();

// Charts & Analyses
export const loadingCharts = ref<boolean>(false);
export const availableCharts = ref<Chart[]>();
export const currentChart = ref<Chart>();
export const loadingAnalysisTypes = ref<boolean>(false);
export const availableAnalysisTypes = ref<AnalysisType[]>();
export const currentAnalysisType = ref<AnalysisType>();

// Regions
export const selectedSourceRegions = ref<SourceRegion[]>([]);

// Network
export const loadingNetworks = ref<boolean>(false);
export const availableNetworks = ref<Network[]>([]);
export const currentNetwork = ref<Network>();
export const currentNetworkNodes = ref<NetworkNode[]>([]);
export const currentNetworkEdges = ref<NetworkEdge[]>([]);

// ETC
export const currentUser = ref<User>();
export const currentError = ref<string>();
export const polls = ref<Record<number, number>>({});

import { ref } from "vue";
import {
  User,
  Project,
  Chart,
  Dataset,
  Layer,
  SourceRegion,
  AnalysisType,
  ClickedFeatureData,
  RasterDataValues,
  FloatingPanelConfig,
  Style,
  Network
} from "./types.js";
import { Map, Popup, Source } from "maplibre-gl";

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

// Layers
export const selectedLayers = ref<Layer[]>([]);
export const selectedLayerStyles = ref<Record<string, Style>>({});

// Data Sources
export const rasterTooltipDataCache = ref<Record<number, RasterDataValues | undefined>>({});

// Map
export const map = ref<Map>();
export const mapSources = ref<Record<string, Source>>({});
export const showMapBaseLayer = ref(true);
export const tooltipOverlay = ref<Popup>();
export const clickedFeature = ref<ClickedFeatureData>();

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
export const availableNetworks = ref<Network[]>([]);
export const currentNetwork = ref<Network>();

// ETC
export const currentUser = ref<User>();
export const currentError = ref<string>();
export const polls = ref<Record<number, number>>({});

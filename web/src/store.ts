import { reactive, ref } from "vue";
import {
  User,
  Project,
  Chart,
  Dataset,
  DerivedRegion,
  SourceRegion,
  SimulationType,
  VectorDatasetLayer,
  RasterDatasetLayer,
  ClickedFeatureData,
  RasterTooltipData,
} from "./types.js";
// import { MapLayer } from "@/data";
import { Map, Popup } from "maplibre-gl";

// Project
export const availableProjects = ref<Project[]>([]);
export const currentProject = ref<Project>();
export const projectConfigMode = ref<"new" | "existing">();

// Datasets
export const availableDatasets = ref<Dataset[]>();
export const selectedDatasets = ref<Dataset[]>([]);
export const currentDataset = ref<Dataset>();

// Map
export const map = ref<Map>();
export const availableDatasetLayers = ref<
  (VectorDatasetLayer | RasterDatasetLayer)[]
>([]);
export const selectedDatasetLayers = ref<
  (VectorDatasetLayer | RasterDatasetLayer)[]
>([]);
export const clickedDatasetLayer = ref<
  VectorDatasetLayer | RasterDatasetLayer
>();
export const showMapBaseLayer = ref(true);
export const showMapTooltip = ref(false);
export const tooltipOverlay = ref<Popup>();
export const rasterTooltipEnabled = ref(false);

// Features
export const clickedFeatureCandidates = reactive<ClickedFeatureData[]>([]);
export const clickedFeature = ref<ClickedFeatureData>();
export const rasterTooltipValue = ref<RasterTooltipData | undefined>();

// Charts & Simulations
export const availableCharts = ref<Chart[]>();
export const currentChart = ref<Chart>();
export const availableSimulationTypes = ref<SimulationType[]>();
export const currentSimulationType = ref<SimulationType>();

// Regions
export const availableDerivedRegions = ref<DerivedRegion[]>();
export const selectedSourceRegions = ref<SourceRegion[]>([]);
export const selectedDerivedRegions = ref<DerivedRegion[]>([]);
export const regionGroupingActive = ref(false);
export const regionGroupingType = ref<"intersection" | "union" | undefined>();

// Network
export const currentNetworkDataset = ref<Dataset>();
export const currentNetworkDatasetLayer = ref<VectorDatasetLayer>();
export const deactivatedNodes = ref<number[]>([]);
export const currentNetworkGCC = ref();

// ETC
export const currentUser = ref<User>();
export const currentError = ref<string>();
export const polls = ref<Record<number, number>>({});

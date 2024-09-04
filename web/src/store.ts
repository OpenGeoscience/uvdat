import { ref } from "vue";
import {
  Context,
  Chart,
  Dataset,
  DerivedRegion,
  SourceRegion,
  SimulationType,
  VectorDatasetLayer,
  RasterDatasetLayer,
} from "./types.js";
// import { MapLayer } from "@/data";
import { Map, MapGeoJSONFeature, Popup } from "maplibre-gl";

// Context
export const availableContexts = ref<Context[]>([]);
export const currentContext = ref<Context>();

// Datasets
export const availableDatasets = ref<Dataset[]>();
export const selectedDatasets = ref<Dataset[]>([]);
export const currentDataset = ref<Dataset>();

// Map
export const map = ref<Map>();
export const availableDatasetLayers = ref<(VectorDatasetLayer | RasterDatasetLayer)[]>([]);
export const selectedDatasetLayers = ref<(VectorDatasetLayer | RasterDatasetLayer)[]>([]);
export const clickedDatasetLayer = ref<VectorDatasetLayer | RasterDatasetLayer>();
export const showMapBaseLayer = ref(true);
export const showMapTooltip = ref(false);
export const tooltipOverlay = ref<Popup>();
export const clickedFeature = ref<MapGeoJSONFeature>();
export const rasterTooltip = ref();

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
export const loading = ref<boolean>(false);
export const currentError = ref<string>();
export const polls = ref<Record<number, number>>({});

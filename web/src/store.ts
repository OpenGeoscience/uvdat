import { ref } from "vue";
import {
  Context,
  Chart,
  Dataset,
  DerivedRegion,
  SourceRegion,
  SimulationType,
} from "./types.js";
import { MapLayer } from "@/data";
import { Map as olMap, Feature } from "ol";

// Context
export const availableContexts = ref<Context[]>([]);
export const currentContext = ref<Context>();

// Map
export const map = ref<olMap>();
export const availableMapLayers = ref<MapLayer[]>([]);
export const activeMapLayers = ref<MapLayer[]>([]);
export const currentMapLayer = ref<MapLayer>();
export const clickedMapLayer = ref<MapLayer>();
export const showMapBaseLayer = ref(true);
export const showMapTooltip = ref(false);
export const selectedFeature = ref<Feature>();
export const rasterTooltip = ref();

// Charts & Simulations
export const availableCharts = ref<Chart[]>([]);
export const currentChart = ref<Chart>();
export const availableSimulationTypes = ref<SimulationType[]>([]);
export const currentSimulationType = ref<SimulationType>();

// Regions
export const availableDerivedRegions = ref<DerivedRegion[]>([]);
export const selectedSourceRegions = ref<SourceRegion[]>([]);
export const selectedDerivedRegions = ref<DerivedRegion[]>([]);
export const regionGroupingActive = ref(false);
export const regionGroupingType = ref<"intersection" | "union" | null>(null);

// Network
export const networkVis = ref<Dataset>();
export const deactivatedNodes = ref<number[]>([]);
export const currentNetworkGCC = ref();

// ETC
export const loading = ref<boolean>(false);
export const currentError = ref<string>();
export const polls = ref<Record<number, number>>({});

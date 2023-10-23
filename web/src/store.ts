import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import * as olProj from "ol/proj";

import { computed, reactive, ref, watch } from "vue";
import { Context, Dataset, DerivedRegion, Region } from "./types.js";
import { getContexts, getDataset } from "@/api/rest";
import { MapDataSource } from "@/data";
import { Map as olMap, getUid, Feature } from "ol";

export const loading = ref<boolean>(false);
export const currentError = ref<string>();

export const contexts = ref<Context[]>([]);
export const currentContext = ref<Context>();

export const map = ref<olMap>();
export function getMap() {
  if (map.value === undefined) {
    throw new Error("Map not yet initialized!");
  }
  return map.value;
}

export const showMapTooltip = ref(false);
export const selectedFeature = ref<Feature>();
export const selectedDataSource = ref<MapDataSource>();

// Represents the number of layers active and their ordering
// This is the sole source of truth regarding visible layers
export const activeMapLayerIds = ref<string[]>([]);

// All data sources combined into one list
export const availableMapDataSources = computed(() => {
  const datasets = currentContext.value?.datasets || [];
  return [
    ...availableDerivedRegions.value.map(
      (derivedRegion) => new MapDataSource({ derivedRegion })
    ),
    ...datasets.map((dataset) => new MapDataSource({ dataset })),
  ];
});

/** Maps  data source IDs to the sources themselves */
export const availableDataSourcesTable = computed(() => {
  const dsMap = new Map<string, MapDataSource>();
  availableMapDataSources.value.forEach((ds) => {
    dsMap.set(ds.uid, ds);
  });

  return dsMap;
});

// The currently selected data source (if any)
export const currentMapDataSource = ref<MapDataSource>();

/**
 * Keeps track of which data sources are being actively shown
 * Maps data source ID to the source itself
 */
export const activeDataSources = computed(() => {
  const dsmap = new Map<string, MapDataSource>();
  if (map.value === undefined) {
    return dsmap;
  }

  // Get list of active map layers
  const activeLayersIdSet = new Set(activeMapLayerIds.value);
  const allMapLayers = getMap().getLayers().getArray();

  // Get all data source IDs which have an entry in activeMapLayerIds
  const activeDataSourceIds = new Set<string>(
    allMapLayers
      .filter((layer) => activeLayersIdSet.has(getUid(layer)))
      .map((layer) => layer.get("dataSourceId"))
  );

  // Filter available data sources to this list
  availableMapDataSources.value
    .filter((ds) => activeDataSourceIds.has(ds.uid))
    .forEach((ds) => {
      dsmap.set(ds.uid, ds);
    });

  return dsmap;
});

export const showMapBaseLayer = ref(true);
export const rasterTooltip = ref();

export const activeChart = ref();
export const availableCharts = ref([]);
export const activeSimulation = ref();
export const availableSimulations = ref([]);

// Regions
export const regionGroupingActive = ref(false);
export const regionGroupingType = ref<"intersection" | "union" | null>(null);
export const selectedRegions = ref<Region[]>([]);
export function cancelRegionGrouping() {
  selectedRegions.value = [];
  regionGroupingActive.value = false;
  regionGroupingType.value = null;

  showMapTooltip.value = false;
}

export const availableDerivedRegions = ref<DerivedRegion[]>([]);
export const selectedDerivedRegionIds = reactive(new Set<number>());

// Network
export const networkVis = ref<Dataset>();
export const deactivatedNodes = ref<number[]>([]);
export const currentNetworkGCC = ref();

export function loadContexts() {
  getContexts().then((data) => {
    contexts.value = data;
    if (data.length) {
      currentContext.value = data[0];
    }
    if (currentContext.value?.datasets) {
      currentContext.value?.datasets.forEach((d) => {
        if (d.processing) {
          pollForProcessingDataset(d.id);
        }
      });
    }
    clearMap();
  });
}

export function clearMap() {
  if (!currentContext.value) {
    return;
  }

  getMap().setView(
    new View({
      center: olProj.fromLonLat(currentContext.value.center),
      zoom: currentContext.value.default_zoom,
    })
  );
  getMap().setLayers([
    new TileLayer({
      source: new OSM(),
      properties: {
        baseLayer: true,
      },
    }),
  ]);
}
watch(currentContext, clearMap);

const polls = ref<Record<number, number>>({});

export function pollForProcessingDataset(datasetId: number) {
  // fetch dataset every 10 seconds until it is not in a processing state
  polls.value[datasetId] = setInterval(() => {
    const currentVersion = currentContext.value?.datasets.find(
      (d) => d.id === datasetId
    );
    if (currentContext.value && currentVersion?.processing) {
      getDataset(datasetId).then((newVersion) => {
        if (currentContext.value && !newVersion.processing) {
          currentContext.value.datasets = currentContext.value.datasets.map(
            (d) => (d.id === datasetId ? newVersion : d)
          );
        }
      });
    } else {
      clearInterval(polls.value[datasetId]);
      delete polls.value[datasetId];
    }
  }, 10000);
}

export function currentDatasetChanged() {
  rasterTooltip.value = undefined;
}

watch(currentMapDataSource, currentDatasetChanged);

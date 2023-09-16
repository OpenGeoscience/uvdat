import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import * as olProj from "ol/proj";

import { computed, reactive, ref, watch } from "vue";
import { City, Dataset, DerivedRegion, Region } from "./types.js";
import { getCities, getDataset } from "@/api/rest";
import { MapDataSource } from "@/data";
import { getUid } from "ol";
import { Layer } from "ol/layer.js";

export const loading = ref<boolean>(false);
export const currentError = ref<string>();

export const cities = ref<City[]>([]);
export const currentCity = ref<City>();

export const map = ref();

// Represents the number of layers active and their ordering
// This is the sole source of truth regarding visible layers
export const activeMapLayerIds = ref<string[]>([]);

// All data sources combined into one list
export const availableMapDataSources = computed(() => {
  const datasets = currentCity.value?.datasets || [];
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
    dsMap.set(ds.getUid(), ds);
  });

  return dsMap;
});

// The currently selected data source (if any)
export const currentMapDataSource = ref<MapDataSource>();

/**
 * Keeps track of which data sources are being actively shown
 * Maps data source ID to the source itself
 */
export const selectedDataSources = computed(() => {
  const dsmap = new Map<string, MapDataSource>();
  if (map.value === undefined) {
    return dsmap;
  }

  // Get list of active map layers
  const activeLayersIdSet = new Set(activeMapLayerIds.value);
  const allMapLayers: Layer[] = map.value.getLayers().getArray();

  // Get all data source IDs which have an entry in activeMapLayerIds
  const activeDataSourceIds = new Set<string>(
    allMapLayers
      .filter((layer) => activeLayersIdSet.has(getUid(layer)))
      .map((layer) => layer.get("dataSourceId"))
  );

  // Filter available data sources to this list
  availableMapDataSources.value
    .filter((ds) => activeDataSourceIds.has(ds.getUid()))
    .forEach((ds) => {
      dsmap.set(ds.getUid(), ds);
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
export const regionIntersectionActive = ref(false);
export const regionUnionActive = ref(false);
export const selectedRegions = ref<Region[]>([]);
export const availableDerivedRegions = ref<DerivedRegion[]>([]);
export const selectedDerivedRegionIds = reactive(new Set<number>());

// Network
export const networkVis = ref<Dataset>();
export const deactivatedNodes = ref<number[]>([]);
export const currentNetworkGCC = ref();

export function loadCities() {
  getCities().then((data) => {
    cities.value = data;
    if (data.length) {
      currentCity.value = data[0];
    }
    if (currentCity.value?.datasets) {
      currentCity.value?.datasets.forEach((d) => {
        if (d.processing) {
          pollForProcessingDataset(d.id);
        }
      });
    }
    clearMap();
  });
}

export function clearMap() {
  if (!currentCity.value || !map.value) {
    return;
  }
  map.value.setView(
    new View({
      center: olProj.fromLonLat(currentCity.value.center),
      zoom: currentCity.value.default_zoom,
    })
  );
  map.value.setLayers([
    new TileLayer({
      source: new OSM(),
      properties: {
        baseLayer: true,
      },
    }),
  ]);
}
watch(currentCity, clearMap);

const polls = ref<Record<number, number>>({});

export function pollForProcessingDataset(datasetId: number) {
  // fetch dataset every 10 seconds until it is not in a processing state
  polls.value[datasetId] = setInterval(() => {
    const currentVersion = currentCity.value?.datasets.find(
      (d) => d.id === datasetId
    );
    if (currentCity.value && currentVersion?.processing) {
      getDataset(datasetId).then((newVersion) => {
        if (currentCity.value && !newVersion.processing) {
          currentCity.value.datasets = currentCity.value.datasets.map((d) =>
            d.id === datasetId ? newVersion : d
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

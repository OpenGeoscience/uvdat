import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import * as olProj from "ol/proj";

import { computed, reactive, ref, watch } from "vue";
import { City, DerivedRegion, Region } from "./types.js";
import { getCities, getDataset } from "@/api/rest";
import { Layer } from "ol/layer.js";
import { getUid } from "ol";
import { MapDataSource } from "./data.js";

export const loading = ref<boolean>(false);
export const currentError = ref<string>();

export const cities = ref<City[]>([]);
export const currentCity = ref<City>();
export const currentMapDataSource = ref<MapDataSource>();
export const selectedDatasetIds = reactive(new Set<number>());

export const map = ref();
export const activeMapLayerIds = ref<string[]>([]);
export const activeMapLayers = computed<Layer[]>(() => {
  const activeLayerIdSet = new Set(activeMapLayerIds.value);
  return map.value
    .getLayers()
    .getArray()
    .filter((layer: Layer) => activeLayerIdSet.has(getUid(layer)));
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
export const networkVis = ref();
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

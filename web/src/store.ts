import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import * as olProj from "ol/proj";

import { ref, watch } from "vue";
import { City, Dataset } from "./types.js";
import { getCities, getDataset } from "@/api/rest";

export const loading = ref<boolean>(false);
export const currentError = ref<string>();

export const cities = ref<City[]>([]);
export const currentCity = ref<City>();
export const currentDataset = ref<Dataset>();
export const selectedDatasetIds = ref<number[]>([]);

export const map = ref();
export const mapLayers = ref();
export const rasterTooltip = ref();
export const activeChart = ref();
export const availableCharts = ref();

export const networkVis = ref();
export const deactivatedNodes = ref([]);
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
  mapLayers.value = [];
  map.value.setView(
    new View({
      center: olProj.fromLonLat(currentCity.value.center),
      zoom: currentCity.value.default_zoom,
    })
  );
  map.value.addLayer(
    new TileLayer({
      source: new OSM(),
    })
  );
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

import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import * as olProj from "ol/proj";

import { ref, watch } from "vue";
import { City } from "./types.js";
import { getCities } from "@/api/rest";

export const loading = ref<boolean>(false);
export const currentError = ref<string>();

export const cities = ref<City[]>([]);
export const currentCity = ref<City>();

export const map = ref();
export const mapLayers = ref();

export function loadCities() {
  getCities().then((data) => {
    cities.value = data;
    if (data.length) {
      currentCity.value = data[0];
    }
  });
}
export function switchCity() {
  if (!currentCity.value) {
    return;
  }
  // clear map
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
watch(currentCity, switchCity);

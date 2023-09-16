<script setup lang="ts">
import Map from "ol/Map.js";
import Overlay from "ol/Overlay";
import { computed, onMounted, ref, watch } from "vue";
import {
  clearMap,
  map,
  selectedRegions,
  regionGroupingActive,
  regionGroupingType,
  deactivatedNodes,
  networkVis,
  availableDerivedRegions,
  availableMapDataSources,
  availableDataSourcesTable,
  selectedDataSources,
} from "@/store";
import { displayRasterTooltip, toggleNodeActive } from "@/utils";
import type { MapBrowserEvent, Feature } from "ol";
import type { Layer } from "ol/layer";
import Control from "ol/control/Control";
import type { Region } from "@/types";

import { postDerivedRegion, listDerivedRegions } from "@/api/rest";
import { MapDataSource, getDatasetUid } from "@/data";

// OpenLayers variables
const tooltip = ref();
const showTooltip = ref(false);
const context = ref();
let tooltipOverlay: Overlay;
let contextControl: Control;

// Features
const selectedLayer = ref<Layer>();
const selectedDataSource = ref<MapDataSource>();
const selectedDatasetCategory = ref<string>("");
const selectedFeature = ref<Feature>();
const selectedFeatureProperties = computed(() => {
  if (selectedFeature.value === undefined) {
    return [];
  }
  const unwantedKeys = new Set([
    "colors",
    "geometry",
    "type",
    "id",
    "node",
    "edge",
  ]);
  return Object.fromEntries(
    Object.entries(selectedFeature.value.getProperties()).filter(
      ([k, v]: [string, unknown]) => k && !unwantedKeys.has(k) && v
    )
  );
});

// Regions
const newRegionName = ref("");
const selectedRegion = computed(() => {
  if (selectedDatasetCategory.value !== "region") {
    return undefined;
  }

  return selectedFeature.value?.getProperties() as Region;
});
const selectedRegionID = computed(() => selectedRegion.value?.pk);
const selectedRegionIsGrouped = computed(() => {
  if (selectedRegion.value === undefined) {
    return false;
  }

  const { pk } = selectedRegion.value;
  return selectedRegions.value.find((region) => region.pk === pk) !== undefined;
});

// Ensure that if any regions of the currently selected datasets are
// de-selected, their regions are removed from the selection
watch(selectedDataSources, (dsMap) => {
  // If the currently selected region was part of a data source that was removed, de-select it
  if (selectedRegion.value !== undefined) {
    const selectedRegionDataSource = availableMapDataSources.value.find(
      (ds) => ds.dataset?.id === selectedRegion.value?.dataset
    );
    if (
      selectedRegionDataSource === undefined ||
      !dsMap.has(selectedRegionDataSource.getUid())
    ) {
      deselectFeature();
    }
  }

  // Filter out any regions from un-selected data sources
  selectedRegions.value = selectedRegions.value.filter((region) =>
    dsMap.has(getDatasetUid(region.dataset))
  );

  // Check if the list is now empty
  if (selectedRegions.value.length === 0) {
    cancelRegionGrouping();
  }
});

function zoomToRegion() {
  // Set map zoom to match bounding box of region
  map.value.getView().fit(selectedFeature.value?.getGeometry(), {
    size: map.value.getSize(),
    duration: 300,
  });
}

function beginRegionGrouping(groupingType: "intersection" | "union") {
  if (selectedRegion.value === undefined) {
    throw new Error("Began region grouping with no selected region");
  }

  regionGroupingActive.value = true;
  regionGroupingType.value = groupingType;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  selectedRegions.value = [selectedRegion.value];
}

function cancelRegionGrouping() {
  selectedRegions.value = [];
  newRegionName.value = "";
  regionGroupingActive.value = false;
  regionGroupingType.value = null;

  showTooltip.value = false;
}

function deselectFeature() {
  showTooltip.value = false;
  selectedLayer.value = undefined;
  selectedFeature.value = undefined;
  selectedDatasetCategory.value = "";
}

function removeRegionFromGrouping() {
  if (selectedRegionID.value === undefined) {
    throw new Error("Tried to remove non-existent region from grouping");
  }

  selectedRegions.value = selectedRegions.value.filter(
    (region) => region.pk !== selectedRegionID.value
  );

  // Check if that element was the last removed
  if (selectedRegions.value.length === 0) {
    cancelRegionGrouping();
  }
}

async function createDerivedRegion() {
  if (selectedRegions.value.length === 0) {
    throw new Error("Cannot created derived region with no selected regions");
  }
  if (regionGroupingType.value === null) {
    throw new Error("Region grouping type is null");
  }

  const city = selectedRegions.value[0].city;
  await postDerivedRegion(
    newRegionName.value,
    city,
    selectedRegions.value.map((reg) => reg.pk),
    regionGroupingType.value
  );

  // Close dialog
  cancelRegionGrouping();
  availableDerivedRegions.value = await listDerivedRegions();
}

function handleMapClick(e: MapBrowserEvent<MouseEvent>) {
  // Check if any features are clicked, exit if not
  let res: [Feature, Layer] = map.value.forEachFeatureAtPixel(
    e.pixel,
    (feature: Feature, layer: Layer) => [feature, layer]
  );
  if (!res) {
    deselectFeature();
    return;
  }

  // Get feature and layer, exit if data source isn't provided through the layer
  const [feature, layer] = res;
  const dataSource = availableDataSourcesTable.value.get(
    layer.get("dataSourceId")
  );
  if (!dataSource) {
    return;
  }

  selectedDataSource.value = dataSource;
  selectedLayer.value = layer;
  selectedFeature.value = feature;
  selectedDatasetCategory.value = dataSource.dataset?.category || "";

  // Show tooltip and set position
  showTooltip.value = true;
  tooltipOverlay.setPosition(e.coordinate);
}

function createMap() {
  map.value = new Map({
    target: "mapContainer",
  });
  map.value.on("loadstart", function () {
    setTimeout(() => {
      if (!map.value.loaded_) {
        map.value.getTargetElement().classList.add("spinner");
      }
    }, 1000);
  });
  map.value.on("loadend", function () {
    map.value.getTargetElement().classList.remove("spinner");
  });

  // Add overlay to display contextual info
  contextControl = new Control({ element: context.value });
  contextControl.setMap(map.value);

  // Add tooltip overlay
  tooltipOverlay = new Overlay({
    element: tooltip.value,
    offset: [10, 0],
    positioning: "bottom-left",
  });
  tooltipOverlay.setMap(map.value);

  // Handle clicks and pointer moves
  map.value.on("click", handleMapClick);
  map.value.on("pointermove", (e: MouseEvent) =>
    displayRasterTooltip(e, tooltip, tooltipOverlay)
  );
}

onMounted(() => {
  createMap();
  clearMap();
});
</script>

<template>
  <div id="mapContainer" class="map">
    <div ref="context" class="context-control" v-show="regionGroupingActive">
      <v-card>
        <v-card-title class="text-capitalize pb-0">
          <v-icon size="small">mdi-vector-{{ regionGroupingType }}</v-icon>
          Performing {{ regionGroupingType }} Grouping
        </v-card-title>
        <v-card-subtitle>
          Grouping {{ selectedRegions.length }} Regions
        </v-card-subtitle>

        <v-row no-gutters class="px-2 mt-2">
          <v-text-field
            v-model="newRegionName"
            hide-details
            label="New Region Name"
          />
        </v-row>
        <v-card-actions>
          <v-row no-gutters>
            <v-spacer />
            <v-btn
              variant="tonal"
              color="error"
              prepend-icon="mdi-cancel"
              @click="cancelRegionGrouping"
            >
              Cancel
            </v-btn>
            <v-btn
              color="success"
              variant="flat"
              prepend-icon="mdi-check"
              :disabled="selectedRegions.length < 2 || !newRegionName"
              @click="createDerivedRegion"
            >
              Save
            </v-btn>
          </v-row>
        </v-card-actions>
      </v-card>
    </div>
    <div ref="tooltip" class="tooltip" v-show="showTooltip">
      <!-- Render for Regions -->
      <div v-if="selectedFeature && selectedDatasetCategory === 'region'">
        <v-row no-gutters>ID: {{ selectedRegionID }}</v-row>
        <v-row no-gutters>Name: {{ selectedFeature.get("name") }}</v-row>
        <v-row>
          <v-btn
            class="my-1"
            variant="outlined"
            block
            prepend-icon="mdi-vector-square"
            @click="zoomToRegion"
            >Zoom To Region</v-btn
          >
        </v-row>

        <template v-if="regionGroupingActive && selectedRegion">
          <template v-if="selectedRegionIsGrouped">
            <v-row>
              <v-btn
                variant="outlined"
                block
                class="my-1"
                @click="removeRegionFromGrouping"
              >
                <template v-slot:prepend>
                  <v-icon>
                    {{
                      regionGroupingType === "intersection"
                        ? "mdi-vector-intersection"
                        : "mdi-vector-union"
                    }}
                  </v-icon>
                </template>
                Ungroup Region
              </v-btn>
            </v-row>
          </template>
          <template v-else>
            <v-row>
              <v-btn
                variant="outlined"
                block
                class="my-1"
                @click="selectedRegions.push(selectedRegion)"
              >
                <template v-slot:prepend>
                  <v-icon>
                    {{
                      regionGroupingType === "intersection"
                        ? "mdi-vector-intersection"
                        : "mdi-vector-union"
                    }}
                  </v-icon>
                </template>
                Add region to grouping
              </v-btn>
            </v-row>
          </template>
        </template>
        <template v-else>
          <v-row>
            <v-btn
              variant="outlined"
              block
              class="my-1"
              prepend-icon="mdi-vector-intersection"
              @click="beginRegionGrouping('intersection')"
            >
              Begin region intersection
            </v-btn>
          </v-row>
          <v-row>
            <v-btn
              variant="outlined"
              block
              class="my-1"
              prepend-icon="mdi-vector-union"
              @click="beginRegionGrouping('union')"
            >
              Begin region union
            </v-btn>
          </v-row>
        </template>
      </div>
      <!-- Render for networks -->
      <div v-else-if="selectedDataSource?.dataset?.network" class="pa-2">
        <v-row no-gutters v-for="(v, k) in selectedFeatureProperties" :key="k">
          {{ k }}: {{ v }}
        </v-row>
        <template v-if="selectedFeature && networkVis">
          <v-btn
            variant="outlined"
            v-if="deactivatedNodes.includes(selectedFeature.get('id'))"
            @click="toggleNodeActive(selectedFeature.get('id'))"
          >
            Reactivate Node
          </v-btn>
          <v-btn
            variant="outlined"
            @click="toggleNodeActive(selectedFeature.get('id'))"
            v-else
          >
            Deactivate Node
          </v-btn>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import "~ol/ol.css";
.map {
  height: 100%;
  width: 100%;
  position: relative;
}
@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}
.spinner:after {
  content: "";
  box-sizing: border-box;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin-top: -20px;
  margin-left: -20px;
  border-radius: 50%;
  border: 5px solid rgba(180, 180, 180, 0.6);
  border-top-color: rgba(0, 0, 0, 0.6);
  animation: spinner 0.6s linear infinite;
}
.tooltip {
  background-color: white;
  border-radius: 5px;
  padding: 10px 20px;
  word-break: break-word;
}

.context-control {
  float: left;
  position: relative;
  top: 2%;
  left: 3%;
}
</style>

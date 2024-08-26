<script lang="ts">
import { Map, IControl, Popup, MapLayerMouseEvent, ControlPosition } from 'maplibre-gl';
import { Ref, onMounted, ref, watch } from "vue";
import {
    map,
    showMapTooltip,
    clickedFeature,
    clickedMapLayer,
    rasterTooltip,
} from "@/store";
import { getMap, clearMap } from "@/storeFunctions";
import { displayRasterTooltip } from "@/utils";
import "maplibre-gl/dist/maplibre-gl.css";

import RegionGrouping from "./RegionGrouping.vue";
import ActiveLayers from "./ActiveLayers.vue";
import MapTooltip from "./MapTooltip.vue";
import { getOrCreateLayerFromID } from "@/layers";


class VueMapControl implements IControl {
    _vueElement: HTMLElement

    _map: Map | undefined;
    _container: HTMLElement | undefined;

    constructor(vueElement: HTMLElement) {
        this._vueElement = vueElement;
        this._container = undefined;
        this._map = undefined;
    }

    onAdd(map: Map) {
        this._map = map;
        this._container = this._vueElement;
        return this._container;
    }

    onRemove() {
        if (this._container === undefined) {
            return;
        }

        this._container.parentNode?.removeChild(this._container);
        this._map = undefined;
    }

    getDefaultPosition(): ControlPosition {
        return 'top-left';
    }
}


export default {
    components: {
        RegionGrouping,
        ActiveLayers,
        MapTooltip,
    },
    setup() {
        // OpenLayers refs
        const tooltip = ref<HTMLElement>();
        const regiongrouping = ref<HTMLElement>();
        const activelayers = ref<HTMLElement>();

        let tooltipOverlay: Popup

        // async function handleMapClick(e: MapBrowserEvent<MouseEvent>) {
        async function handleMapClick(e: MapLayerMouseEvent) {
            // Retrieve first clicked feature, and its layer
            // let res = getMap().forEachFeatureAtPixel(e.pixel, (feature, layer) => [
            //     feature,
            //     layer,
            // ]) as [Feature, Layer] | undefined;

            tooltipOverlay.remove()
            clickedFeature.value = undefined;
            showMapTooltip.value = false;
            if (!e.features) {
                return;
            }

            const feature = e.features[0];
            clickedFeature.value = feature;
            console.log('---', feature);
            tooltipOverlay.setLngLat(e.lngLat);
            showMapTooltip.value = true;
            tooltipOverlay.addTo(map.value!)


            // tooltip.value!.innerHTML = "<h1>HEYY</h1>";
            // showMapTooltip.value = true;

            // If nothing clicked, reset values and return
            // if (!res) {
            //     showMapTooltip.value = false;
            //     clickedMapLayer.value = undefined;
            //     clickedFeature.value = undefined;
            // } else {
            //     const [feature, openlayer] = res;
            //     const props = openlayer.getProperties();
            //     const mapLayer = await getOrCreateLayerFromID(props.id, props.type);

            //     if (mapLayer) {
            //         clickedMapLayer.value = mapLayer;
            //         clickedFeature.value = feature;
            //         // Show tooltip and set position
            //         showMapTooltip.value = true;
            //         tooltipOverlay.setPosition(e.coordinate);
            //         tooltip.value.style.display = "";
            //     }
            // }
        }

        function createMap() {
            const newMap = new Map({
                container: "mapContainer",
                style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${process.env.VUE_APP_MAPTILER_KEY}`,
                center: [-75.5, 43.0], // Coordinates for the center of New York State
                zoom: 7, // Initial zoom level
            });
            // newMap.getTargetElement().classList.add("spinner");
            // newMap.on("loadend", function () {
            //     getMap().getTargetElement().classList.remove("spinner");
            // });

            // Handle clicks and pointer moves
            newMap.on("click", handleMapClick);
            // newMap.on("click", 'map-layer-1-vector-tile-line', handleMapClick);
            newMap.on("click", 'map-layer-1-vector-tile-circle', handleMapClick);
            // newMap.on("mouseenter", 'map-layer-1-vector-tile-circle', handleMapClick);
            newMap.on("pointermove", (e) => {
                displayRasterTooltip(e, tooltip, tooltipOverlay);
            });

            map.value = newMap;
            createMapControls();
        }

        function createMapControls() {
            if (map.value) {
                // Add overlay to display region grouping
                // map.value.addControl(new Control({ element: regiongrouping.value }));
                // map.value.addControl(new VueMapControl(regiongrouping.value!));

                // Add overlay to display active layers
                // map.value.addControl(new Control({ element: activelayers.value }));
                map.value.addControl(new VueMapControl(activelayers.value!));

                // Add tooltip overlay
                tooltipOverlay = new Popup({
                    anchor: 'bottom-left',
                    offset: [10, 0],
                    closeOnClick: false,
                    maxWidth: 'none',
                    closeButton: true,
                });
                tooltipOverlay.setDOMContent(tooltip.value!);
            }
        }

        watch(rasterTooltip, () => {
            tooltip.value!.innerHTML = "";
            tooltip.value!.style.display = "none";
        });

        onMounted(() => {
            createMap();
            clearMap();
        });

        return {
            activelayers,
            regiongrouping,
            tooltip,
            showMapTooltip,
        };
    },
};
</script>

<template>
    <div id="mapContainer" class="map">
        <div ref="activelayers" class="maplibregl-ctrl active-layers-control">
            <ActiveLayers />
        </div>
        <!-- <div ref="regiongrouping" class=" maplibregl-ctrl region-grouping-control">
            <RegionGrouping />
        </div> -->
        <div ref="tooltip" class="tooltip" v-show="showMapTooltip">
            <MapTooltip />
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
    text-wrap: wrap;
}

.active-layers-control {
    /* float: left; */
    position: relative;
    /* position: absolute; */
    /* z-index: 30; */
    /* top: 10%; */
    /* left: 3%; */
}

.region-grouping-control {
    /* float: left; */
    /* position: absolute; */
    /* bottom: 2%; */
    /* left: 3%; */
}
</style>
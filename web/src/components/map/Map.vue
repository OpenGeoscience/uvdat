<script lang="ts">
import { Map, IControl, Popup, MapLayerMouseEvent, ControlPosition } from 'maplibre-gl';
import { Ref, onMounted, ref, watch } from "vue";
import {
    map,
    showMapTooltip,
    rasterTooltip,
    tooltipOverlay,
    clickedFeature,
} from "@/store";
import { getMap, clearMap, getTooltip } from "@/storeFunctions";
import { displayRasterTooltip } from "@/utils";
import "maplibre-gl/dist/maplibre-gl.css";

import RegionGrouping from "./RegionGrouping.vue";
import ActiveLayers from "./ActiveLayers.vue";
import MapTooltip from "./MapTooltip.vue";
import { getOrCreateLayerFromID, handleLayerClick } from "@/layers";


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

        function createMap() {
            const newMap = new Map({
                container: "mapContainer",
                style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${process.env.VUE_APP_MAPTILER_KEY}`,
                center: [-75.5, 43.0], // Coordinates for the center of New York State
                zoom: 7, // Initial zoom level
            });

            // Add spinner while loading
            const mapContainer = document.getElementById('mapContainer')!;
            mapContainer.classList.add("spinner");
            newMap.on("load", () => {
                mapContainer.classList.remove("spinner");
            });

            // TODO: Convert to work with new setup
            // newMap.on("pointermove", (e) => {
            //     if (tooltip.value !== undefined) {
            //         displayRasterTooltip(e, tooltip.value, tooltipOverlay.value!);
            //     }
            // });


            /**
             * This is called on every click, and technically hides the tooltip on every click.
             * However, if a feature layer is clicked, that event is fired after this one, and the
             * tooltip is re-enabled and rendered with the desired contents. The net result is that
             * this only has a real effect when the base map is clicked, as that means that no other
             * feature layer can "catch" the event, and the tooltip stays hidden.
            */
            newMap.on('click', (e) => {
                clickedFeature.value = undefined;
                showMapTooltip.value = false;
                getTooltip().remove();
            });

            // Order is important as the following function relies on the ref being set
            map.value = newMap;
            createMapControls();
        }

        function createMapControls() {
            if (!map.value || !tooltip.value || !activelayers.value) {
                throw new Error('Map or refs not initialized!');
            }

            // Add overlay to display region grouping
            // map.value.addControl(new VueMapControl(regiongrouping.value!));

            // Add overlay to display active layers
            map.value.addControl(new VueMapControl(activelayers.value));

            // Add tooltip overlay
            tooltipOverlay.value = new Popup({
                anchor: 'bottom-left',
                offset: [10, 0],
                closeOnClick: false,
                maxWidth: 'none',
                closeButton: true,
            });

            // Link overlay ref to dom, allowing for modification elsewhere
            tooltipOverlay.value.setDOMContent(tooltip.value);
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
        <div id="map-tooltip" ref="tooltip" class="tooltip" v-show="showMapTooltip">
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
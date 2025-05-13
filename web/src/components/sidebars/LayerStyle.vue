<script setup lang="ts">
import { rasterColormaps } from '@/layerStyles';
import { useLayerStore } from '@/store/layer';
import { Layer } from '@/types';
import { computed, watch } from 'vue';
import _ from 'lodash';

const props = defineProps<{
  layer: Layer;
}>();

const layerStore = useLayerStore();

const styleKey = computed(() => {
    return `${props.layer.id}.${props.layer.copy_id}`;
})

const currentStyle = computed(() => {
    if (!layerStore.selectedLayerStyles[styleKey.value]) {
        layerStore.selectedLayerStyles[styleKey.value] = {
            visible: true,
            opacity: 1,
        }
    }
    if (!layerStore.selectedLayerStyles[styleKey.value].colormap_range) {
        layerStore.selectedLayerStyles[styleKey.value].colormap_range = dataRange.value
    }
    return layerStore.selectedLayerStyles[styleKey.value];
});

const showRasterOptions = computed(() => {
    return props.layer.frames.some((frame) => frame.raster)
})

const dataRange = computed(() => {
    let absMin: number | undefined, absMax: number | undefined;
    props.layer.frames.forEach((frame) => {
        if (frame.raster) {
            Object.values(frame.raster.metadata.bands).forEach(({min, max}) => {
                if (!absMin || min < absMin) absMin = min;
                if (!absMax || max < absMax) absMax = max;
            })
        }
    })
    if(absMin && absMax){
        return [Math.floor(absMin), Math.ceil(absMax)];
    }
})

function getFrameInputWidth(value: number) {
    // With a minimum of 40 pixels, add 10 pixels for each digit shown in the input
    let width = 40;
    width += Math.round(value).toString().length * 10;
    return width + 'px';
}

watch(currentStyle, _.debounce(() => {
    layerStore.updateLayerStyles(props.layer)
}, 100), {deep: true})
</script>

<template>
    <v-card v-if="currentStyle" class="layer-style-card" color="background">
        <v-card-subtitle class="pa-2">
          <span style="font-weight: bold;">Layer: </span>
          {{ layer.name }}
        </v-card-subtitle>

        <v-card-text class="pa-2">
            <v-slider
                v-model="currentStyle.opacity"
                label="Opacity"
                max="1"
                min="0"
                step="0.1"
                color="primary"
                show-ticks="always"
                tick-size="6"
                thumb-size="15"
                track-size="8"
                hide-details
                type="number"
            >
                <template v-slot:append>
                    <v-text-field
                        v-model="currentStyle.opacity"
                        max="1"
                        min="0"
                        step="0.1"
                        density="compact"
                        class="frame-input"
                        style="width: 60px"
                        type="number"
                        hide-details
                        single-line
                    >
                    </v-text-field>
                </template>
            </v-slider>

            <div v-if="showRasterOptions">
                <v-label class="pa-2 mt-3">
                    Raster Data Options
                </v-label>
                <v-select
                    v-model="currentStyle.colormap"
                    :items="rasterColormaps"
                    label="Color Map"
                    density="compact"
                />
                <v-label v-if="currentStyle.colormap" class="pa-2">
                    Colormap Range
                </v-label>
                <v-range-slider
                    v-if="currentStyle.colormap && dataRange"
                    v-model="currentStyle.colormap_range"
                    color="primary"
                    :min="dataRange[0]"
                    :max="dataRange[1]"
                    step="1"
                >
                    <template v-slot:prepend>
                        <v-text-field
                            v-if="currentStyle.colormap_range"
                            v-model="currentStyle.colormap_range[0]"
                            :min="dataRange[0]"
                            :max="currentStyle.colormap_range[1]"
                            :step="1"
                            density="compact"
                            class="frame-input"
                            :style="{'width': getFrameInputWidth(currentStyle.colormap_range[0])}"
                            type="number"
                            hide-details
                            single-line
                        >
                        </v-text-field>
                    </template>
                    <template v-slot:append>
                        <v-text-field
                            v-if="currentStyle.colormap_range"
                            v-model="currentStyle.colormap_range[1]"
                            :min="currentStyle.colormap_range[0]"
                            :max="dataRange[1]"
                            :step="1"
                            density="compact"
                            class="frame-input"
                            :style="{'width': getFrameInputWidth(currentStyle.colormap_range[1])}"
                            type="number"
                            hide-details
                            single-line
                        >
                        </v-text-field>
                    </template>
                </v-range-slider>
            </div>
        </v-card-text>
    </v-card>
</template>

<style>
.layer-style-card {
    width: 400px;
}
.layer-style-card  .v-label {
    font-size: 14px;
}
</style>

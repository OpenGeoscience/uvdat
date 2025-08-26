<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStyleStore, useAppStore } from '@/store';
import { ColorMap } from '@/types';
import ColormapPreview from './ColormapPreview.vue';
import { THEMES } from '@/themes';

interface MarkerBox {
    color: string,
    index: number,
    xRange: [number, number],
    yRange: [number, number]
}

const styleStore = useStyleStore();
const appStore = useAppStore();
const colormaps: ColorMap[] = styleStore.colormaps;

const emit = defineEmits(['close'])

const name = ref()
const markers = ref([
    {color: '#000', value: 0},
    {color: '#fff', value: 1},
])
const canvas = ref()
const draggingMarker = ref()
const markerSize = 16
const outlineSize = 1

const markerBoxes = computed(() => markers.value.map((m: {color: string, value: number}, index: number) => {
    const width = canvas.value.width
    const height = canvas.value.height
    const start = (width - markerSize - (outlineSize * 2)) * m.value + outlineSize
    const xRange = [start, start + markerSize]
    const yRange = [height - markerSize, height - outlineSize]
    return { color: m.color, xRange, yRange, index } as MarkerBox
}))

const markerOutlineColor = computed(() => {
    return THEMES[appStore.theme].colors['on-surface-variant']
})

const nameExistsRule = () => !colormaps?.map((c) => c.name).includes(name.value) || `Colormap ''${name.value}'' already exists.`

const valid = computed(() => {
    return name.value && name.value.length && markers.value && markers.value.length && nameExistsRule() === true
})

const currentColormap = computed(() => {
    return  {
        name: name.value,
        markers: markers.value,
        discrete: false,
        n_colors: 5,
        null_color: 'transparent',
    }
})

function createColormap() {
    if (valid.value) {
        colormaps.push(currentColormap.value)
        emit('close')
    }
}

function drawMarkerBox( mbox: MarkerBox, ctx: any) {
    const {color, xRange, yRange} = mbox
    const centerX = (xRange[1] - xRange[0]) / 2 + xRange[0]
    ctx.fillStyle = color
    ctx.strokeStyle = markerOutlineColor.value
    ctx.moveTo(xRange[0], yRange[0])
    ctx.beginPath()
    ctx.lineTo(centerX, yRange[0] - (markerSize / 2))
    ctx.lineTo(xRange[1], yRange[0])
    ctx.lineTo(xRange[1], yRange[1])
    ctx.lineTo(xRange[0], yRange[1])
    ctx.lineTo(xRange[0], yRange[0])
    ctx.closePath()
    ctx.stroke()
    ctx.fill()
}

function drawMarkers() {
    if (canvas.value) {
        // Update canvas drawing buffer dimensions to match CSS dimensions
        canvas.value.width = canvas.value.clientWidth;
        canvas.value.height = canvas.value.clientHeight;
        const rect = [0, 0, canvas.value.width, canvas.value.height]
        const ctx = canvas.value.getContext("2d")
        ctx.clearRect(...rect)
        markerBoxes.value.forEach((mbox) => drawMarkerBox(mbox, ctx))
    }
}

function mouseDown(e: any) {
    const x = e.layerX
    const y = e. layerY
    draggingMarker.value = markerBoxes.value.find((mbox) => {
        const {xRange, yRange} = mbox
        return xRange[0] <= x && xRange[1] >= x && yRange[0] <= y && yRange[1] >= y
    })
}

function mouseUp(e: any) {
    draggingMarker.value = undefined
}

function mouseMove(e: any) {
    const x = e.layerX
    const y = e. layerY
    if (draggingMarker.value) {
        const width = canvas.value.width
        const newValue = (x - outlineSize) / (width - markerSize - (outlineSize * 2))
        if (newValue >= 0 && newValue <= 1) {
            markers.value[draggingMarker.value.index].value = newValue
            drawMarkers()
        }
    }
}

onMounted(drawMarkers)
</script>

<template>
    <v-card color="background">
        <v-card-subtitle class="pa-2" style="background-color: rgb(var(--v-theme-surface))">
            New Colormap
            <v-icon
                icon="mdi-close"
                style="float:right"
                @click="emit('close')"
            />
        </v-card-subtitle>

        <v-card-text>
            <v-text-field
                label="Name"
                v-model="name"
                autofocus
                :rules="[nameExistsRule]"
            />
            <div style="width: 100%; position: relative;">
                <canvas
                    ref="canvas"
                    class="marker-canvas"
                    @mousedown="mouseDown"
                    @mouseup="mouseUp"
                    @mousemove="mouseMove"
                />
                <div style="padding: 0px 8px">
                    <ColormapPreview
                        :colormap="currentColormap"
                        :discrete="false"
                        :nColors="-1"
                    />
                </div>
            </div>
        </v-card-text>

        <v-card-actions>
            <v-btn class="secondary-button" @click="emit('close')">
                <v-icon color="primary" class="mr-1">mdi-close-circle</v-icon>
                close
            </v-btn>
            <v-btn class="primary-button" variant="tonal" @click="createColormap" :disabled="!valid">
                <v-icon color="button-text" class="mr-1">mdi-plus-circle</v-icon>
                Create Colormap
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<style>
.marker-canvas {
    height: 45px;
    left: 0;
    right: 0;
    width: 100%;
    position: absolute;
}</style>

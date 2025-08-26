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
    yRange: [number, number],
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
const hoverMarkerValue = ref()
const markerSize = 16
const outlineSize = 1

const markerBoxes = computed(() => markers.value.map((m: {color: string, value: number}, index: number) => {
    const {xRange, yRange} = getMarkerBoxRanges(m.value)
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

function getMarkerBoxRanges(value: number) {
    const width = canvas.value.width
    const height = canvas.value.height
    const start = (width - markerSize - (outlineSize * 2)) * value + outlineSize
    const xRange: [number, number] = [start, start + markerSize]
    const yRange: [number, number] = [height - markerSize, height - outlineSize]
    return {xRange, yRange}
}

function drawMarkerPolygon(xRange: [number, number], yRange: [number, number], ctx: any) {
    const centerX = (xRange[1] - xRange[0]) / 2 + xRange[0]
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
}

function drawMarkerBox(mbox: MarkerBox, ctx: any) {
    const {color, xRange, yRange} = mbox
    ctx.fillStyle = color
    drawMarkerPolygon(xRange, yRange, ctx)
    ctx.fill()
}

function drawHoverMarker(value: number, ctx: any) {
    const {xRange, yRange} = getMarkerBoxRanges(value)
    drawMarkerPolygon(xRange, yRange, ctx)
    const centerX = (xRange[1] - xRange[0]) / 2 + xRange[0]
    const centerY = (yRange[1] - yRange[0]) / 2 + yRange[0] - outlineSize * 2
    const plusSignSize = markerSize - 6
    ctx.moveTo(centerX, centerY - plusSignSize / 2)
    ctx.lineTo(centerX, centerY + plusSignSize / 2)
    ctx.moveTo(centerX - plusSignSize / 2, centerY)
    ctx.lineTo(centerX + plusSignSize / 2, centerY)
    ctx.stroke()
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
        if (hoverMarkerValue.value) {
            drawHoverMarker(hoverMarkerValue.value, ctx)
        }
    }
}

function mouseDown(e: any) {
    const x = e.layerX
    const y = e. layerY
    draggingMarker.value = markerBoxes.value.find((mbox) => {
        const {xRange, yRange} = mbox
        return xRange[0] <= x && xRange[1] >= x && yRange[0] <= y && yRange[1] >= y
    })
    if (hoverMarkerValue.value) {
        markers.value.push({
            color: '#000',
            value:hoverMarkerValue.value,
        })
    }
}

function mouseUp(e: any) {
    draggingMarker.value = undefined
}

function mouseMove(e: any) {
    const x = e.layerX
    const y = e. layerY
    const width = canvas.value.width
    const newValue = (x - markerSize / 2) / (width - markerSize - (outlineSize * 2))
    hoverMarkerValue.value = undefined
    if (newValue >= 0 && newValue <= 1) {
        if (draggingMarker.value) {
            // dragging existing marker
            markers.value[draggingMarker.value.index].value = newValue
        } else if (y < 20) {
            // hovering over gradient while not dragging
            hoverMarkerValue.value = newValue
        }
    }
    drawMarkers()
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

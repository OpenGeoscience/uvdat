<script setup lang="ts">
import { ColorMap } from '@/types';
import { watch, ref, onMounted } from 'vue';
import { useStyleStore } from '@/store';

const styleStore = useStyleStore();

const canvas = ref();
const props = defineProps<{
  colormap: ColorMap,
  discrete: boolean,
  nColors: number,
}>();


function draw() {
    let markers = props.colormap.markers
    if (!markers) return
    const ctx = canvas.value.getContext("2d");
    const rect = [0, 0, canvas.value.width, canvas.value.height]
    ctx.clearRect(...rect)
    if (props.discrete) {
        if (props.nColors > 0 && props.nColors < markers.length) {
            markers = styleStore.colormapMarkersSubsample({
                name: 'colormap',
                markers,
                discrete: props.discrete,
                n_colors: props.nColors,
            })
        }
        if (markers) markers.forEach((marker, index) => {
            if (markers) {
                ctx.fillStyle = marker.color;
                const start = canvas.value.width / markers.length * index
                const end = canvas.value.width / markers.length * (index + 1)
                ctx.fillRect(start, 0, end, canvas.value.height)
            }
        })
    } else {
        const gradient = ctx.createLinearGradient(0, 0, canvas.value.width, 0);
        markers.forEach((marker) => {
            gradient.addColorStop(marker.value, marker.color);
        })
        ctx.fillStyle = gradient;
        ctx.fillRect(...rect);
    }
}
onMounted(draw)
watch([props.colormap, () => props.discrete], draw, {deep: true})
</script>

<template>
    <canvas ref="canvas" class="canvas"></canvas>
</template>

<style scoped>
.canvas {
    border: 1px solid rgb(var(--v-theme-on-surface-variant));
    height: 20px;
    width: 300px;
}
</style>

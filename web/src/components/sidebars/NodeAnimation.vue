<script setup lang="ts">
import { setNetworkDeactivatedNodes } from "@/networks";
import { Layer } from "@/types";
import { ref, watch, computed } from "vue";
import { Network } from '../../types';
import { selectedLayers } from "@/store";
import { updateLayersShown } from "@/layers";

const props = defineProps<{
  nodeFailures?: Record<number, number[]>,
  nodeRecoveries?:  Record<number, number[]>,
  network: Network,
  additionalAnimationLayers: Layer[],
}>();

const currentTick = ref(0);
const ticker = ref();
const seconds = ref(1);

const nodeChanges = computed(() => {
  if (props.nodeRecoveries) return props.nodeRecoveries;
  else return props.nodeFailures;
});

function pause() {
  clearInterval(ticker.value);
  ticker.value = undefined;
}

function play() {
  pause();
  ticker.value = setInterval(() => {
    if (nodeChanges.value && currentTick.value < Object.keys(nodeChanges.value).length) {
      currentTick.value += 1;
    } else {
      pause();
    }
  }, seconds.value * 1000);
}

function rewind() {
  pause();
  ticker.value = setInterval(() => {
    if (currentTick.value > 0) {
      currentTick.value -= 1;
    } else {
      pause();
    }
  }, seconds.value * 1000);
}

watch(currentTick, async () => {
  if (nodeChanges.value) {
    let deactivated = nodeChanges.value[currentTick.value];
    if (props.network) setNetworkDeactivatedNodes(props.network, deactivated || []);
    if (props.additionalAnimationLayers) {
      props.additionalAnimationLayers.forEach((layer) => {
        selectedLayers.value = selectedLayers.value.map((l) => {
          if (l.id === layer.id) l.current_frame = currentTick.value
          return l;
        })
        updateLayersShown();
      })
    }
  }
});
</script>

<template>
  <div class="d-flex pb-3" style="align-items: center" v-if="nodeChanges">
    <v-icon @click="play" icon="mdi-play" variant="text" />
    <v-icon @click="pause" icon="mdi-pause" variant="text" />
    <v-icon @click="rewind" icon="mdi-rewind" variant="text" />
    <v-slider
      v-model="currentTick"
      show-ticks="always"
      color="primary"
      class="ml-5"
      tick-size="6"
      thumb-size="15"
      track-size="8"
      min="0"
      step="1"
      :max="Object.keys(nodeChanges).length"
      hide-details
    />
  </div>
</template>

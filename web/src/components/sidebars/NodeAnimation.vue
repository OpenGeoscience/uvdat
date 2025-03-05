<script setup lang="ts">
import { getNetwork, setNetworkDeactivatedNodes } from "@/networks";
import { Layer } from "@/types";
import { ref, watch, computed } from "vue";

const props = defineProps<{
  nodeFailures: Array<number>,
  nodeRecoveries?:  Array<number>,
  layer: Layer | undefined,
}>();

const currentTick = ref(0);
const ticker = ref();
const seconds = ref(1);

const startState = computed(() => {
  if (props.nodeRecoveries?.length) return props.nodeFailures;
  else return [];
});

const nodeChanges = computed(() => {
  if (props.nodeRecoveries?.length) return props.nodeRecoveries;
  else return props.nodeFailures;
});

function pause() {
  clearInterval(ticker.value);
  ticker.value = undefined;
}

function play() {
  pause();
  ticker.value = setInterval(() => {
    if (currentTick.value < nodeChanges.value.length) {
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

async function getCurrentNetwork() {
  let nodeId;
  if (props.nodeFailures.length) nodeId = props.nodeFailures[0]
  else if (props.nodeRecoveries?.length) nodeId = props.nodeRecoveries[0]
  if (nodeId && props.layer?.dataset) {
    return await getNetwork(nodeId, props.layer.dataset)
  }
}

watch(currentTick, async () => {
  let deactivated = nodeChanges.value.slice(0, currentTick.value);
  if (props.nodeRecoveries) {
    deactivated = startState.value.filter(
      (i: number) => !deactivated.includes(i)
    )
  }
  const network = await getCurrentNetwork()
  if (network) setNetworkDeactivatedNodes(network, deactivated);
});
</script>

<template>
  <div class="d-flex pb-3" style="align-items: center">
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
      :max="nodeChanges.length"
      hide-details
    />
  </div>
</template>

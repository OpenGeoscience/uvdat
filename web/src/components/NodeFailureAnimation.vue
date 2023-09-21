<script>
import { ref, watch } from "vue";
import { deactivatedNodes } from "@/store";
import { deactivatedNodesUpdated } from "@/utils";
import { networkVis } from "../store";

export default {
  props: {
    nodeFailures: {
      required: true,
      type: Array,
    },
  },
  setup(props) {
    const currentTick = ref(0);
    const ticker = ref();
    const seconds = ref(1);

    function pause() {
      clearInterval(ticker.value);
      ticker.value = undefined;
    }

    function play() {
      pause();
      ticker.value = setInterval(() => {
        if (currentTick.value < props.nodeFailures.length) {
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

    watch(currentTick, () => {
      deactivatedNodes.value = props.nodeFailures.slice(0, currentTick.value);
      deactivatedNodesUpdated();
    });

    return {
      networkVis,
      currentTick,
      seconds,
      play,
      pause,
      rewind,
    };
  },
};
</script>

<template>
  <div v-if="!networkVis">
    Show network dataset and enable network mode visualization to begin.
  </div>
  <div v-else class="d-flex" style="align-items: center">
    <v-btn @click="play" icon="mdi-play" variant="text" />
    <v-btn @click="pause" icon="mdi-pause" variant="text" />
    <v-btn @click="rewind" icon="mdi-rewind" variant="text" />
    <v-slider
      v-model="currentTick"
      show-ticks="always"
      tick-size="5"
      min="0"
      step="1"
      :max="nodeFailures.length"
      hide-details
    />
  </div>
</template>

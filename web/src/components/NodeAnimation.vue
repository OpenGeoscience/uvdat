<script>
import { ref, watch, computed } from "vue";
import { deactivatedNodes } from "@/store";
import { deactivatedNodesUpdated } from "@/utils";
import { networkVis } from "../store";

export default {
  props: {
    nodeFailures: {
      required: true,
      type: Array,
    },
    nodeRecoveries: {
      required: false,
      type: Array,
    },
  },
  setup(props) {
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

    watch(currentTick, () => {
      const slice = nodeChanges.value.slice(0, currentTick.value);
      if (props.nodeRecoveries) {
        // recovery mode
        deactivatedNodes.value = startState.value.filter(
          (i) => !slice.includes(i)
        );
      } else {
        deactivatedNodes.value = slice;
      }
      deactivatedNodesUpdated();
    });

    return {
      nodeChanges,
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
      :max="nodeChanges.length"
      hide-details
    />
  </div>
</template>

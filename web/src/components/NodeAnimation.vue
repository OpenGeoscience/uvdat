<script lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import {
  currentNetworkDataset,
  currentNetworkDatasetLayer,
  deactivatedNodes,
  selectedDatasets,
  selectedDatasetLayers,
} from "@/store";
import { deactivatedNodesUpdated, fetchDatasetNetwork } from "@/utils";
import { getDatasetLayerForDataObject } from "@/layers";
import { isVectorDatasetLayer } from "@/types";

export default {
  props: {
    nodeFailures: {
      required: true,
      type: Array<number>,
    },
    nodeRecoveries: {
      required: false,
      type: Array<number>,
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setup(props: any) {
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

    async function findCurrentNetworkDataset() {
      currentNetworkDataset.value = selectedDatasets.value.find((d) =>
        d.map_layers?.some((l) => l.metadata?.network)
      );
      if (currentNetworkDataset.value && !currentNetworkDataset.value.network) {
        fetchDatasetNetwork(currentNetworkDataset.value);
      }
      if (currentNetworkDataset.value) {
        const datasetLayer = await getDatasetLayerForDataObject(
          currentNetworkDataset.value
        );
        if (isVectorDatasetLayer(datasetLayer)) {
          currentNetworkDatasetLayer.value = datasetLayer;
        }
      }
    }

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
      const slice: number[] = nodeChanges.value.slice(0, currentTick.value);
      if (props.nodeRecoveries) {
        // recovery mode
        deactivatedNodes.value = startState.value.filter(
          (i: number) => !slice.includes(i)
        );
      } else {
        deactivatedNodes.value = slice;
      }
      deactivatedNodesUpdated();
    });

    watch(selectedDatasets, findCurrentNetworkDataset);
    onMounted(findCurrentNetworkDataset);

    return {
      currentNetworkDataset,
      currentNetworkDatasetLayer,
      selectedDatasetLayers,
      nodeChanges,
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
  <div
    v-if="
      !currentNetworkDataset ||
      !currentNetworkDatasetLayer ||
      !selectedDatasetLayers.includes(currentNetworkDatasetLayer)
    "
  >
    Show network dataset layer to begin.
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

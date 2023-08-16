<script>
import { computed, ref } from "vue";
import { chartData } from "@/store";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default {
  components: { Line },
  setup() {
    const options = {
      responsive: true,
    };
    const defaultChartData = {
      labels: [],
      datasets: [
        {
          label: "No Data",
          data: [],
        },
      ],
    };
    const currentXRange = ref([0, 50]);

    const showXRange = computed(() => {
      return (
        chartData.value &&
        chartData.value.labels.length >
          currentXRange.value[1] - currentXRange.value[0]
      );
    });

    const maxX = computed(() => {
      return chartData.value && showXRange.value
        ? chartData.value.labels.length
        : 0;
    });

    const data = computed(() => {
      let currentData = chartData.value || defaultChartData;

      // clip to current x range
      if (showXRange.value) {
        currentData = {
          labels: currentData.labels.slice(...currentXRange.value),
          datasets: currentData.datasets.map((d) =>
            Object.assign({}, d, { data: d.data.slice(...currentXRange.value) })
          ),
        };
      }
      return currentData;
    });

    return {
      options,
      currentXRange,
      showXRange,
      maxX,
      data,
    };
  },
};
</script>

<template>
  <div>
    <Line :data="data" :options="options" />
    <v-range-slider v-if="showXRange" v-model="currentXRange" :max="maxX" />
  </div>
</template>

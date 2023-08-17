<script>
import { computed, ref } from "vue";
import { activeChart } from "@/store";
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
    const currentXStart = ref(0);
    const currentXRange = ref(500);

    const showXRange = computed(() => {
      return (
        activeChart.value && activeChart.value.chart_data.labels.length > 500
      );
    });

    const maxX = computed(() => {
      return activeChart.value && showXRange.value
        ? activeChart.value.chart_data.labels.length
        : 0;
    });

    const data = computed(() => {
      let currentData = activeChart.value?.chart_data || defaultChartData;

      // clip to current x range
      if (showXRange.value) {
        const slice = [
          parseInt(currentXStart.value),
          parseInt(currentXStart.value) + parseInt(currentXRange.value),
        ];
        currentData = {
          labels: currentData.labels.slice(...slice),
          datasets: currentData.datasets.map((d) =>
            Object.assign({}, d, {
              data: d.data.slice(...slice),
            })
          ),
        };
      }
      return currentData;
    });

    return {
      options,
      currentXStart,
      currentXRange,
      showXRange,
      maxX,
      data,
    };
  },
};
</script>

<template>
  <v-container>
    <v-row no-gutters>
      <v-col cols="12">
        <Line :data="data" :options="options" />
      </v-col>
    </v-row>
    <v-row no-gutters v-if="showXRange">
      <v-col cols="6"> Current X Axis Slice (From {{ maxX }} values) </v-col>
    </v-row>
    <v-row no-gutters v-if="showXRange">
      <v-col cols="3">
        <v-text-field
          type="number"
          label="Number of values"
          v-model="currentXRange"
          :max="maxX"
          min="0"
        />
      </v-col>
      <v-col cols="3">
        <v-text-field
          type="number"
          label="Starting from"
          v-model="currentXStart"
          :max="maxX"
          min="0"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

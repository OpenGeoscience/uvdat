<script>
import { currentCity, chartData } from "@/store";
import { ref, onMounted } from "vue";
import { getCityCharts } from "@/api/rest";

export default {
  setup() {
    const activeChart = ref();
    const availableCharts = ref();

    function fetchCharts() {
      activeChart.value = undefined;
      chartData.value = undefined;
      getCityCharts(currentCity.value.id).then((charts) => {
        availableCharts.value = charts;
      });
    }

    function activateChart(chart) {
      activeChart.value = chart;
      chartData.value = chart.data;
    }

    onMounted(fetchCharts);

    return {
      activeChart,
      availableCharts,
      fetchCharts,
      activateChart,
    };
  },
};
</script>

<template>
  <v-list>
    <v-list-subheader>
      Available Charts
      <v-icon @click="fetchCharts">mdi-refresh</v-icon>
    </v-list-subheader>
    <v-list-item
      v-for="chart in availableCharts"
      :key="chart.id"
      :value="chart.id"
      :active="activeChart && chart.id === activeChart.id"
      @click="activateChart(chart)"
    >
      {{ chart.name }}
    </v-list-item>
  </v-list>
</template>

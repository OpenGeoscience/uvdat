<script>
import { computed } from "vue";
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
    const defaultChartData = {
      labels: [],
      datasets: [
        {
          label: "No Data",
          data: [],
        },
      ],
    };

    const data = computed(() => {
      return chartData.value || defaultChartData;
    });

    return {
      data,
    };
  },
};
</script>

<template>
  <Line :data="data" />
</template>

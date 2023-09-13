<script>
import { computed, ref } from "vue";
import { activeChart, availableCharts } from "@/store";
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
import RecursiveTable from "./RecursiveTable.vue";
import { clearChart, getCityCharts } from "@/api/rest";

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
  components: { Line, RecursiveTable },
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
    const defaultOptions = {
      responsive: true,
    };
    const currentXStart = ref(0);
    const currentXRange = ref(500);
    const downloadButton = ref();

    const options = computed(() => {
      const customOptions = {
        plugins: {},
        scales: {},
      };
      const savedOptions = activeChart.value.chart_options;
      if (savedOptions.chart_title) {
        customOptions.plugins.title = {
          display: true,
          text: savedOptions.chart_title,
        };
      }
      if (savedOptions.x_title) {
        if (!customOptions.scales.x) {
          customOptions.scales.x = {};
        }
        customOptions.scales.x.title = {
          display: true,
          text: savedOptions.x_title,
        };
      }
      if (savedOptions.x_range) {
        if (!customOptions.scales.x) {
          customOptions.scales.x = {};
        }
        customOptions.scales.x.min = savedOptions.x_range[0];
        customOptions.scales.x.max = savedOptions.x_range[1];
      }
      if (savedOptions.y_title) {
        if (!customOptions.scales.y) {
          customOptions.scales.y = {};
        }
        customOptions.scales.y.title = {
          display: true,
          text: savedOptions.y_title,
        };
      }
      if (savedOptions.y_range) {
        if (!customOptions.scales.y) {
          customOptions.scales.y = {};
        }
        customOptions.scales.y.min = savedOptions.y_range[0];
        customOptions.scales.y.max = savedOptions.y_range[1];
      }
      return Object.assign({}, defaultOptions, customOptions);
    });

    const showXRange = computed(() => {
      return (
        activeChart.value?.chart_data?.labels &&
        activeChart.value.chart_data.labels.length > 500
      );
    });

    const maxX = computed(() => {
      return activeChart.value?.chart_data?.labels && showXRange.value
        ? activeChart.value.chart_data.labels.length
        : 0;
    });

    const data = computed(() => {
      let currentData = activeChart.value?.chart_data;

      if (!currentData || Object.keys(currentData).length === 0) {
        currentData = defaultChartData;
      }

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

    const downloadReady = computed(() => {
      if (downloadButton.value && activeChart.value) {
        const filename = `${activeChart.value.name}.json`;
        const contents = data.value;
        downloadButton.value.setAttribute(
          "href",
          "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(contents))
        );
        downloadButton.value.setAttribute("download", filename);
      }
      return true;
    });

    function clearAndRefresh() {
      if (activeChart.value) {
        clearChart(activeChart.value.id).then(() => {
          getCityCharts(activeChart.value.city).then((charts) => {
            availableCharts.value = charts;
            if (activeChart) {
              activeChart.value = charts.find(
                (c) => c.id === activeChart.value.id
              );
            }
          });
        });
      }
    }

    return {
      activeChart,
      options,
      currentXStart,
      currentXRange,
      showXRange,
      maxX,
      data,
      downloadButton,
      downloadReady,
      clearAndRefresh,
    };
  },
};
</script>

<template>
  <v-card class="chart-card">
    <div style="position: absolute; right: 0">
      <v-tooltip text="Clear Chart Data" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-eraser-variant"
            variant="plain"
            v-show="activeChart.clearable"
            @click="clearAndRefresh"
          />
        </template>
      </v-tooltip>
      <v-tooltip text="Download" location="bottom">
        <template v-slot:activator="{ props }">
          <a ref="downloadButton">
            <v-btn
              v-bind="props"
              icon="mdi-download"
              variant="plain"
              v-show="downloadReady"
            />
          </a>
        </template>
      </v-tooltip>
      <v-tooltip text="Close" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-close"
            variant="plain"
            @click="activeChart = undefined"
          />
        </template>
      </v-tooltip>
    </div>
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
      <v-row no-gutters v-if="activeChart?.metadata">
        <v-col cols="12">
          <v-expansion-panels>
            <v-expansion-panel title="Metadata">
              <v-expansion-panel-text>
                <RecursiveTable :data="activeChart.metadata" />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<style scoped>
.chart-card {
  z-index: 99;
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 800px;
  max-width: calc(100% - 20px);
  max-height: 90%;
  overflow: auto;
}
</style>

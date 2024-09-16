<script lang="ts">
import { ref, Ref, PropType, watch } from "vue";
import {
  Project,
  Dataset,
  Chart,
  DerivedRegion,
  SimulationType,
} from "../types";
import {
  getProjectCharts,
  getProjectDatasets,
  getProjectDerivedRegions,
  getProjectSimulationTypes,
} from "@/api/rest";
import DatasetList from "./DatasetList.vue";
import { currentChart, currentSimulationType } from "@/store";

export default {
  components: { DatasetList },
  props: {
    project: {
      required: true,
      type: Object as PropType<Project>,
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setup(props: any) {
    const panels = [
      { label: "Datasets", loadFunction: getProjectDatasets },
      { label: "Regions", loadFunction: getProjectDerivedRegions },
      { label: "Charts", loadFunction: getProjectCharts },
      { label: "Simulations", loadFunction: getProjectSimulationTypes },
    ];

    const openPanels: Ref<string[]> = ref([]);
    const projectContents: Ref<
      Record<string, Dataset[] | Chart[] | DerivedRegion[] | SimulationType[]>
    > = ref({});

    function selectItem(
      panelLabel: string,
      item: Dataset | DerivedRegion | Chart | SimulationType
    ) {
      if (panelLabel == "Regions") {
        // TODO: select region
      } else if (panelLabel == "Charts") {
        currentChart.value = item as Chart;
      } else if (panelLabel == "Simulations") {
        currentSimulationType.value = item as SimulationType;
      }
    }

    watch(openPanels, () => {
      projectContents.value = {};
      panels.forEach((panel) => {
        if (openPanels.value.includes(panel.label)) {
          panel.loadFunction(props.project.id).then((data) => {
            projectContents.value[panel.label] = data;
          });
        }
      });
    });

    return {
      panels,
      openPanels,
      projectContents,
      selectItem,
    };
  },
};
</script>

<template>
  <v-expansion-panels multiple variant="accordion" v-model="openPanels">
    <v-expansion-panel
      v-for="panel in panels"
      :key="panel.label"
      :value="panel.label"
    >
      <v-expansion-panel-title>
        {{ panel.label }}
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div
          v-if="
            !projectContents[panel.label] ||
            !projectContents[panel.label].length
          "
          style="color: grey"
          class="my-2 mx-6 text-caption"
        >
          No Available {{ panel.label }}.
        </div>
        <dataset-list
          v-else-if="panel.label == 'Datasets'"
          :datasets="projectContents['Datasets']"
        />
        <v-list v-else>
          <v-list-item
            v-for="item in projectContents[panel.label]"
            :key="item.id"
            :value="item"
            class="pa-2 mx-2"
            @click="selectItem(panel.label, item)"
          >
            {{ item.name }}
            <div class="text-caption" style="color: grey">
              {{ item.description }}
            </div>
          </v-list-item>
        </v-list>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style scoped>
.v-expansion-panel--active
  > .v-expansion-panel-title:not(.v-expansion-panel-title--static) {
  min-height: 30px;
}
.v-list-item--active > * {
  background: transparent !important;
}
</style>

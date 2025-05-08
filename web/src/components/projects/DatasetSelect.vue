<script setup lang="ts">
import DatasetList from '@/components/DatasetList.vue'
import DetailView from '@/components/DetailView.vue'
import { Dataset } from '@/types';

const props = defineProps<{
  datasets: Dataset[] | undefined;
  selectedIds: number[] | undefined;
}>();
const emit = defineEmits(["toggleDatasets"]);


function toggleSelected(items: Dataset[]) {
    emit("toggleDatasets", items);
}
</script>

<template>
  <DatasetList :datasets="props.datasets">
    <template v-slot:list="{ data }">
      <v-expansion-panels multiple variant="accordion" elevation="0" bg-color="transparent">
        <v-expansion-panel
          v-for="dataset in data"
          :key="dataset.id"
        >
          <v-expansion-panel-title>
            <div style="display: flex; justify-content: space-between; width: 100%;">
              <div class="item-title">
                <div>
                    <v-checkbox-btn
                      :model-value="props.selectedIds?.includes(dataset.id)"
                      style="display: inline"
                      class="mr-2"
                      @click.stop="() => toggleSelected([dataset])"
                    />
                    {{ dataset.name }}
                </div>
                <div style="min-width: 75px; text-align: right">
                  <v-icon
                    icon="mdi-layers"
                    size="small"
                    v-tooltip="dataset.layers.length + ' layers'"
                    class="ml-2"
                  ></v-icon>
                  <span class="secondary-text">{{ dataset.layers.length }}</span>
                  <v-icon
                    icon="mdi-information-outline"
                    size="small"
                    v-tooltip="dataset.description"
                    class="mx-1"
                  ></v-icon>
                </div>
              </div>
              <DetailView :details="{...dataset, type: 'dataset'}"/>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text class="pb-2">
            <div
              v-for="layer in dataset.layers"
              class="item-title"
            >
              <div style="text-wrap: wrap; align-items: center; width: 100%">
                {{ layer.name }}
              </div>
              <div  class="pr-5">
                <DetailView :details="{...layer, type: 'layer'}"/>
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </DatasetList>
</template>

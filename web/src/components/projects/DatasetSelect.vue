<script setup lang="ts">
import { computed } from 'vue';
import DatasetList from '@/components/DatasetList.vue'
import DetailView from '@/components/DetailView.vue'
import { Dataset } from '@/types';

import { useLayerStore, useConversionStore } from '@/store';
const layerStore = useLayerStore();
const conversionStore = useConversionStore();

const props = defineProps<{
  datasets: Dataset[] | undefined;
  savingId: number | undefined;
  addedIds?: number[] | undefined;
  buttonIcon: string
}>();
const emit = defineEmits(["buttonClick"]);

const datasetsWithLayers = computed(() => {
  return props.datasets?.map((dataset) => {
    return {
      ...dataset,
      layers: layerStore.availableLayers.filter((l) => l.dataset === dataset.id)
    }
  })
})
</script>

<template>
  <DatasetList :datasets="datasetsWithLayers">
    <template v-slot:list="{ data }">
      <v-expansion-panels multiple variant="accordion" elevation="0" bg-color="transparent">
        <v-expansion-panel
          v-for="dataset in data"
          :key="dataset.id"
        >
          <v-expansion-panel-title>
            <div style="display: flex; justify-content: space-between; width: 100%;">
              <div>
                <div
                  v-if="conversionStore.datasetConversionTasks[dataset.id] && !conversionStore.datasetConversionTasks[dataset.id].completed"
                  style="display: inline-block"
                >
                  <v-icon
                    v-if="conversionStore.datasetConversionTasks[dataset.id].error"
                    v-tooltip="conversionStore.datasetConversionTasks[dataset.id].error"
                    icon="mdi-alert-outline"
                    color="error"
                    class="mr-5"
                  />
                  <v-progress-circular
                    v-else
                    v-tooltip="conversionStore.datasetConversionTasks[dataset.id].status"
                    size="24"
                    class="mr-5"
                    indeterminate
                  />
                </div>
                <v-progress-circular
                  v-else-if="props.savingId === dataset.id"
                  size="24"
                  class="mr-5"
                  indeterminate
                />
                <v-icon
                  v-else-if="!props.addedIds || !props.addedIds.includes(dataset.id)"
                  :icon="props.buttonIcon"
                  color="primary"
                  class="icon-button mr-5"
                  @click.stop="emit('buttonClick', dataset)"
                />
                <v-icon
                  v-else
                  icon="mdi-check"
                  color="success"
                  class="mr-5"
                  @click.stop
                />
                {{ dataset.name }}
              </div>
              <div v-if="dataset.layers" style="min-width: 75px; text-align: right">
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
                <DetailView v-if="dataset" :details="{...dataset, type: 'dataset'}"/>
              </div>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text class="pb-2">
            <div>
              <v-chip
                v-for="tag in dataset.tags"
                :text="tag"
                variant="outlined"
                size="small"
              />
            </div>
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

<style>
.icon-button {
  background-color: rgb(var(--v-theme-secondary));
  border-radius: 4px;
}
</style>

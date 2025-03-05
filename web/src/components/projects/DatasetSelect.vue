<script setup lang="ts">
import DatasetList from '@/components/DatasetList.vue'
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
      <v-expansion-panels>
        <v-expansion-panel
          v-for="dataset in data"
          :key="dataset.id"
          elevation="0"
          variant="accordion"
          bg-color="transparent"
        >
          <v-expansion-panel-title>
            <div class="item-title">
              <v-checkbox-btn
                :model-value="props.selectedIds?.includes(dataset.id)"
                style="display: inline"
                class="mr-2"
                @click.stop="() => toggleSelected([dataset])"
              />
              {{ dataset.name }}
              <div>
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
                <v-icon
                  icon="mdi-database-outline"
                  size="small"
                  class="mr-2"
                ></v-icon>
              </div>
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
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </DatasetList>
</template>

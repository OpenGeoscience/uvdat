<script setup lang="ts">
import DatasetList from '@/components/DatasetList.vue'
import { Dataset, Layer } from '@/types';
import { mapSources, selectedLayers } from "@/store";


const props = defineProps<{
  datasets: Dataset[] | undefined;
}>();

function toggleSelected(items: Layer[]) {
  items.forEach((item) => {
    const layer = item as Layer;
    let name = layer.name;
    let copy_id = 0;
    const existing = Object.keys(mapSources.value).filter((sourceId) => {
      const [layerId] = sourceId.split('.');
      return parseInt(layerId) === layer.id
    })
    if (existing.length) {
      copy_id = existing.length;
      name = `${layer.name} (${copy_id})`;
    }
    selectedLayers.value = [
      {...layer, name, copy_id, visible: true, current_frame: 0},
      ...selectedLayers.value,
    ];
  })
}
</script>

<template>
  <DatasetList :datasets="props.datasets">
    <template v-slot:list="{ data }">
      <v-expansion-panels multiple flat variant="accordion" elevation="0" bg-color="transparent">
        <v-expansion-panel
          v-for="dataset in data"
          :key="dataset.id"
        >
          <v-expansion-panel-title>
            <div class="item-title">
              {{ dataset.name }}
              <div style="min-width: 75px; text-align: right">
                <v-icon
                  icon="mdi-layers-outline"
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
          </v-expansion-panel-title>
          <v-expansion-panel-text class="pb-2">
            <div
              v-for="layer in dataset.layers"
              class="item-title"
            >
              <div
                style="text-wrap: wrap; align-items: center; width: 90%"
                @click.stop="() => toggleSelected([layer])"
              >
                <v-icon
                  icon="mdi-plus"
                  size="small"
                  color="primary"
                  v-tooltip="'Add to Selected Layers'"
                ></v-icon>
                {{ layer.name }}
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </DatasetList>
</template>

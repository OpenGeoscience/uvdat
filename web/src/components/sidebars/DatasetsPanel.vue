<script setup lang="ts">
import DatasetList from '@/components/DatasetList.vue'
import { addLayer } from '@/layers';
import MetadataView from '@/components/MetadataView.vue'
import { Dataset, Layer } from '@/types';


const props = defineProps<{
  datasets: Dataset[] | undefined;
}>();

function toggleSelected(items: Layer[]) {
  items.forEach((item) => {
    const layer = item as Layer;
    addLayer(layer);
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
            <div style="display: flex; justify-content: space-between; width: 100%;">
              <div class="item-title" style="margin-left: 12px">
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
              <MetadataView :metadata="dataset.metadata" :name="dataset.name" />
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
                  color="primary"
                  v-tooltip="'Add to Selected Layers'"
                  class="layer-select-button"
                ></v-icon>
                {{ layer.name }}
              </div>
              <div style="padding-right: 22.5px">
                <MetadataView :metadata="layer.metadata" :name="layer.name" />
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </DatasetList>
</template>

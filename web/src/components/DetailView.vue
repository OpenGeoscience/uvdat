<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import RecursiveTable from './RecursiveTable.vue';
import { getChartFiles, getDatasetFiles, getFileDataObjects } from '@/api/rest';
import { RasterData, VectorData } from '../types';


interface Details {
  metadata?: Record<string, any>;
  type: string;
  id: number;
  name?: string;
  download?: {
    url: string;
    size: number;
    type: string;
  }
  description?: string;
  created?: string;
  modified?: string;
}

const props = defineProps<{
  details: Details;
}>();

const showModal = ref(false);
const hasMetadata = computed(() => props.details.metadata && Object.keys(props.details.metadata).length > 0);
const related = ref<(Details | undefined)[]>();
const relatedLabel = ref('Objects');
const basicInfo = computed(() => {
  return Object.fromEntries(
    Object.entries(props.details).filter(
      ([key]) => ['description', 'created', 'modified'].includes(key)
    )
  )
})

async function getRelated() {
  if (props.details.type === 'dataset') {
    relatedLabel.value = 'Files'
    const files = await getDatasetFiles(props.details.id)
    related.value = files.map((file) => ({
      ...file,
      type: 'file',
      download: {
        url: file.file,
        size: file.file_size,
        type: file.file_type
      },
      props: {
        prependIcon: 'mdi-file',
      },
    }))
  } else if (props.details.type === 'chart') {
    relatedLabel.value = 'Files'
    const files = await getChartFiles(props.details.id)
    related.value = files.map((file) => ({
      ...file,
      type: 'file',
      download: {
        url: file.file,
        size: file.file_size,
        type: file.file_type
      },
      props: {
        prependIcon: 'mdi-file',
      },
    }))
  } else if (props.details.type === 'file') {
    relatedLabel.value = 'Converted Data'
    const dataObjects = await getFileDataObjects(props.details.id)
    related.value = dataObjects.map((data) => {
      const raster = data as RasterData
      const vector = data as VectorData
      if (raster.cloud_optimized_geotiff){
        return {
          ...data,
          type: 'rasterdata',
          download: {
            url: raster.cloud_optimized_geotiff,
            size: raster.file_size,
            type: 'cog',
          },
          props: {
            prependIcon: 'mdi-checkerboard',
          },
        }
      } else if (vector.geojson_data) {
        return {
          ...data,
          type: 'vectordata',
          download: {
            url: vector.geojson_data,
            size: vector.file_size,
            type: 'geojson',
          },
          props: {
            prependIcon: 'mdi-vector-square',
          },
        }
      }
    })
  }
}

function getFileSizeString(size: number) {
  // https://stackoverflow.com/a/20732091
  var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return +((size / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

watch(showModal, getRelated)
</script>

<template>
  <v-icon
    icon="mdi-dots-vertical"
    size="small"
    v-tooltip="'View Details'"
    class="mx-1"
    @click.stop="showModal = true"
  ></v-icon>

  <v-dialog v-model="showModal" width="min-content">
    <v-card>
      <v-card-title style="max-width: 90%; margin: 4px 4em 0 0;">
        {{ props.details.name }}
      </v-card-title>

      <div v-if="basicInfo?.length">
        <v-card-subtitle>Basic Information</v-card-subtitle>
        <v-card-text><RecursiveTable :data="basicInfo"/></v-card-text>
      </div>

      <v-card-subtitle>Metadata</v-card-subtitle>
      <v-card-text v-if="!hasMetadata">This {{ props.details.type }} has no metadata.</v-card-text>
      <v-card-text v-else>
        <RecursiveTable :data="props.details.metadata" />
      </v-card-text>

      <div v-if="related" style="min-width: 500px;">
        <v-card-subtitle>Related {{ relatedLabel }} </v-card-subtitle>
        <v-list :items="related" item-value="id" >
          <template v-slot:title="{ item }">
            <div v-if="item" v-tooltip="item.name">{{ item.name }}</div>
          </template>
          <template v-slot:subtitle="{ item }">
          </template>
          <template v-slot:append="{ item }">
            <DetailView v-if="item" :details="item"/>
            <a
              v-if="item?.download"
              :href="item.download.url"
              download
              >
              <v-icon
                v-tooltip="'Download ' + item.download.type.toUpperCase() + ' (' + getFileSizeString(item.download.size) + ')'"
                icon="mdi-download"
              ></v-icon>
            </a>
          </template>
        </v-list>
      </div>

      <v-btn
        class="close-button transparent"
        variant="flat"
        icon
        @click="showModal = false"
      >
      <v-icon>mdi-close</v-icon>
    </v-btn>
  </v-card>
</v-dialog>
</template>

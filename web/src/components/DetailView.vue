<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import RecursiveTable from './RecursiveTable.vue';
import { getChartFiles, getDatasetFiles } from '@/api/rest';


interface Details {
  metadata: Record<string, any>;
  type: string;
  id: number;
  name: string;
  download?: {
    url: string;
    size: number;
    type: string;
  }
}

const props = defineProps<Details>();

const showModal = ref(false);
const hasMetadata = computed(() => props.metadata && Object.keys(props.metadata).length > 0);
const related = ref<Details[]>();
const relatedLabel = ref('Objects');

async function getRelated() {
  if (props.type === 'dataset') {
    relatedLabel.value = 'Files'
    const files = await getDatasetFiles(props.id)
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
  } else if (props.type === 'chart') {
    relatedLabel.value = 'Files'
    const files = await getChartFiles(props.id)
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
  }
}

function getFileSizeString(size: number) {
  var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return +((size / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}


watch(showModal, getRelated)
</script>

<template>
  <v-icon
    icon="mdi-dots-vertical"
    size="small"
    v-tooltip="'View Metadata'"
    class="mx-1"
    @click.stop="showModal = true"
  ></v-icon>

  <v-dialog v-model="showModal" width="min-content">
    <v-card>
      <v-card-title style="max-width: 90%; margin: 4px 4em 0 0;">
        {{ props.name }}
      </v-card-title>

      <v-card-subtitle>Metadata</v-card-subtitle>
      <v-card-text v-if="!hasMetadata">This {{ props.type }} has no metadata.</v-card-text>
      <v-card-text v-else>
        <RecursiveTable :data="props.metadata" />
      </v-card-text>

      <div v-if="related" style="min-width: 500px;">
        <v-card-subtitle>Related {{ relatedLabel }} </v-card-subtitle>
        <v-list :items="related" item-value="id">
          <template v-slot:title="{ item }">
            <div v-tooltip="item.name">{{ item.name }}</div>
          </template>
          <template v-slot:append="{ item }">
            <DetailView :id="item.id", :type="item.type" :name="item.name" :metadata="item.metadata"/>
            <a
              v-if="item.download"
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

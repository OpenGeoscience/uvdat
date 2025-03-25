<script setup lang="ts">
  import { ref, computed } from 'vue';
  import RecursiveTable from './RecursiveTable.vue';

  const props = defineProps<{
    metadata: Record<string, any>;
    name: string;
  }>();

  const showModal = ref(false);
  const hasMetadata = computed(() => props.metadata && Object.keys(props.metadata).length > 0);
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
        <span v-if="hasMetadata">Metadata for {{ props.name }}</span>
        <span v-else>{{ props.name }} has no metadata</span>
      </v-card-title>

      <v-btn
        class="close-button transparent"
        variant="flat"
        icon
        @click="showModal = false"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>

      <v-card-text>
        <RecursiveTable :data="props.metadata" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

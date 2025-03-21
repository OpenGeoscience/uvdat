<script setup lang="ts">
  import { ref, computed } from 'vue';
  import RecursiveTable from './RecursiveTable.vue';

  const props = defineProps<{
    metadata: Object | undefined; // TODO: make less generic (Object)
    name: string | undefined;
  }>();

  const showMetadata = ref(false);
  const hasMetadata = computed(() => props.metadata && Object.keys(props.metadata).length > 0);
</script>

<template>
  <v-menu
    v-model="showMetadata"
    location="end top"
    activator="parent"
    :close-on-content-click="false"
    v-if="hasMetadata"
  >
    <template #activator>
      <v-icon
        icon="mdi-dots-vertical"
        size="small"
        v-tooltip="'View Metadata'"
        class="mx-1"
      ></v-icon>
    </template>
    <div class="metadata-popup">
      <pre>{{ props.name ?? "Metadata" }}</pre>
      <RecursiveTable :data="props.metadata" />
    </div>
  </v-menu>
</template>

<style scoped>
.metadata-popup {
  background-color: rgb(var(--v-theme-surface));
  border-radius: 4px;
  padding: 5px;
  /* font-size: 12px; */
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
}
</style>

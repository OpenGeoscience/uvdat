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
  <div v-if="hasMetadata">
    <v-icon
        icon="mdi-dots-vertical"
        size="small"
        v-tooltip="'View Metadata'"
        class="mx-1"
        @click.stop="showMetadata = true"
      ></v-icon>

      <v-dialog v-model="showMetadata" max-width="60%" width="fit-content">
        <v-card>
          <v-card-title>{{ props.name ?? "Metadata" }}</v-card-title>

          <v-card-text>
            <RecursiveTable :data="props.metadata" />
          </v-card-text>

          <v-card-actions>
            <v-btn @click="showMetadata = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
  </div>
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

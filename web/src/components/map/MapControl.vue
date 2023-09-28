<script setup lang="ts">
import { ref } from "vue";
import {
  selectedRegions,
  regionGroupingType,
  availableDerivedRegions,
  cancelRegionGrouping,
} from "@/store";
import { postDerivedRegion, listDerivedRegions } from "@/api/rest";

const newRegionName = ref("");
async function createDerivedRegion() {
  if (selectedRegions.value.length === 0) {
    throw new Error("Cannot created derived region with no selected regions");
  }
  if (regionGroupingType.value === null) {
    throw new Error("Region grouping type is null");
  }

  const city = selectedRegions.value[0].city;
  await postDerivedRegion(
    newRegionName.value,
    city,
    selectedRegions.value.map((reg) => reg.id),
    regionGroupingType.value
  );

  // Close dialog
  cancelRegionGrouping();
  availableDerivedRegions.value = await listDerivedRegions();
}
</script>

<template>
  <v-card>
    <v-card-title class="text-capitalize pb-0">
      <v-icon size="small">mdi-vector-{{ regionGroupingType }}</v-icon>
      Performing {{ regionGroupingType }} Grouping
    </v-card-title>
    <v-card-subtitle>
      Grouping {{ selectedRegions.length }} Regions
    </v-card-subtitle>

    <v-row no-gutters class="px-2 mt-2">
      <v-text-field
        v-model="newRegionName"
        hide-details
        label="New Region Name"
      />
    </v-row>
    <v-card-actions>
      <v-row no-gutters>
        <v-spacer />
        <v-btn
          variant="tonal"
          color="error"
          prepend-icon="mdi-cancel"
          @click="cancelRegionGrouping"
        >
          Cancel
        </v-btn>
        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-check"
          :disabled="selectedRegions.length < 2 || !newRegionName"
          @click="createDerivedRegion"
        >
          Save
        </v-btn>
      </v-row>
    </v-card-actions>
  </v-card>
</template>

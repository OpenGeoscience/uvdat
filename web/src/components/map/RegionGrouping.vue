<script lang="ts">
import { ref } from "vue";
import {
  selectedSourceRegions,
  regionGroupingType,
  regionGroupingActive,
  currentContext,
} from "@/store";
import {
  cancelRegionGrouping as _cancelRegionGrouping,
  loadDerivedRegions,
} from "@/storeFunctions";
import { postDerivedRegion } from "@/api/rest";

export default {
  setup() {
    // Region Controls
    const newRegionName = ref("");

    function cancelRegionGrouping() {
      newRegionName.value = "";
      _cancelRegionGrouping();
    }

    async function createDerivedRegion() {
      if (selectedSourceRegions.value.length === 0) {
        throw new Error(
          "Cannot created derived region with no selected regions"
        );
      }
      if (regionGroupingType.value === null) {
        throw new Error("Region grouping type is null");
      }

      const context = currentContext.value;
      if (context) {
        await postDerivedRegion(
          newRegionName.value,
          context.id,
          selectedSourceRegions.value.map((reg) => reg.id),
          regionGroupingType.value
        );
      }

      // Close dialog
      cancelRegionGrouping();
      loadDerivedRegions();
    }
    return {
      regionGroupingActive,
      regionGroupingType,
      selectedSourceRegions,
      newRegionName,
      createDerivedRegion,
      cancelRegionGrouping,
    };
  },
};
</script>

<template>
  <v-card v-if="regionGroupingActive" class="mx-2">
    <v-card-title class="text-capitalize pb-0">
      <v-icon size="small">mdi-vector-{{ regionGroupingType }}</v-icon>
      Performing {{ regionGroupingType }} Grouping
    </v-card-title>
    <v-card-subtitle>
      Grouping {{ selectedSourceRegions.length }} Regions
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
          :disabled="selectedSourceRegions.length < 2 || !newRegionName"
          @click="createDerivedRegion"
        >
          Save
        </v-btn>
      </v-row>
    </v-card-actions>
  </v-card>
</template>

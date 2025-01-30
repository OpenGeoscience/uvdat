<script lang="ts">
export default {
  props: ["data"],
};
</script>

<template>
  <v-table>
    <tbody>
      <tr
        v-for="[key, value] in Object.entries(data)"
        :key="key"
        style="vertical-align: top"
      >
        <td class="font-weight-bold">{{ key.replaceAll("_", " ") }}</td>
        <td v-if="Array.isArray(value) && typeof value[0] === 'object'">
          <v-card v-for="item in value" :key="item" class="mb-3">
            <RecursiveTable :data="item" />
          </v-card>
        </td>
        <td v-else-if="Array.isArray(value)">
          {{ value.join(", ") }}
        </td>
        <td v-else-if="!Array.isArray(value) && typeof value === 'object'">
          <v-card class="mb-3">
            <RecursiveTable :data="value" />
          </v-card>
        </td>
        <td v-else>{{ value }}</td>
      </tr>
    </tbody>
  </v-table>
</template>

<style>
.v-expansion-panel-text__wrapper {
  padding: 0px !important;
}
</style>

<script setup lang="ts">
import { computed, ref } from "vue";

import { panelArrangement } from "@/store";
import { startDrag } from "@/storeFunctions";

const props = defineProps<{
  id: string;
}>();

const panel = computed(() =>
  panelArrangement.value.find((p) => p.id === props.id)
);

const element = ref();

function getPanelContainerClass() {
  let classString = "";
  if (panel.value?.collapsed) classString += " closed";
  if (!panel.value?.position) classString += "panel-container";
  return classString;
}

function getPanelContainerStyle() {
  let styleObj: Record<string, string> = {};
  if (!panel.value?.position) {
    if (panel.value?.height && !panel.value.collapsed) {
      styleObj.height = panel.value?.height + "px";
      styleObj["flex-grow"] = "unset";
    }
  }
  return styleObj;
}

function getPanelStyle() {
  let styleObj: Record<string, string> = {};
  if (panel.value?.position) {
    styleObj["z-index"] = "10000"; // above vuetify navigation drawer
    styleObj.visibility = "visible"; // prevent hiding when sidebar closes
    styleObj.position = "absolute";
    styleObj.top = panel.value.position.y + "px";
    styleObj.left = panel.value.position.x + "px";
  }
  if (panel.value?.width) {
    styleObj.width = panel.value?.width + "px";
  }
  if (panel.value?.height && !panel.value.collapsed) {
    styleObj.height = panel.value?.height + "px";
    styleObj["flex-grow"] = "unset";
  }
  return styleObj;
}

function togglePanelCollapsed() {
  if (panel.value) {
    panel.value.collapsed = !panel.value.collapsed;
    panelUpdated();
  }
}

function closePanel() {
  if (panel.value) {
    panel.value.visible = false;
    panelUpdated();
  }
}

function updateDockedHeight() {
  if (panel.value) {
    if (!panel.value.position) {
      panel.value.dockedHeight = element.value.clientHeight;
    } else {
      panel.value.dockedHeight = undefined;
    }
    panelUpdated();
  }
}

function panelUpdated() {
  if (panel.value) {
    panelArrangement.value = [
      panel.value,
      ...panelArrangement.value.filter((p) => p.id !== props.id),
    ];
  }
}
</script>

<template>
  <div
    v-if="panel && panel.visible"
    :class="getPanelContainerClass()"
    :style="getPanelContainerStyle()"
  >
    <div class="panel" :style="getPanelStyle()" ref="element">
      <v-card color="surface-bright fill-height">
        <div class="mr-3 right">
          <v-icon
            :icon="panel.collapsed ? 'mdi-chevron-down' : 'mdi-chevron-up'"
            v-tooltip="panel.collapsed ? 'Expand' : 'Collapse'"
            @mousedown="togglePanelCollapsed"
          ></v-icon>
          <v-icon
            icon="mdi-drag"
            v-tooltip="'Drag Floating Panel'"
            @mousedown="(e) => startDrag(e, panel, ['position'])"
          ></v-icon>
          <v-icon
            v-if="panel.closeable"
            icon="mdi-close"
            v-tooltip="'Close Panel'"
            @mousedown="closePanel"
          ></v-icon>
        </div>
        <v-card-text class="pa-2">{{ panel.label }}</v-card-text>
        <v-card-text v-if="!panel.collapsed" class="pa-2 panel-content">
          <slot></slot>
          <v-icon
            v-if="panel.position"
            icon="mdi-resize-bottom-right"
            class="right mr-2 draggable-corner"
            @mousedown="
              (e) => {
                startDrag(e, panel, ['width', 'height']);
              }
            "
          ></v-icon>
        </v-card-text>
      </v-card>
    </div>
    <div
      class="draggable-divider"
      v-if="!panel.position"
      @mousedown="
        (e) => {
          updateDockedHeight();
          startDrag(e, panel, ['height']);
        }
      "
    >
      <v-divider></v-divider>
      <v-icon
        icon="mdi-drag-horizontal-variant"
        size="x-small"
        class="mx-2"
      ></v-icon>
      <v-divider></v-divider>
    </div>
  </div>
</template>

<style>
.panel-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.panel {
  position: relative;
  margin: 6px;
  border-radius: 10px;
  flex-grow: 1;
  min-height: 50px;
  overflow: auto;
}
.panel.closed {
  flex-grow: 0;
}
.panel-content {
  overflow: auto;
  height: calc(100% - 50px);
}
.draggable-divider {
  display: flex;
  align-items: center;
  cursor: n-resize;
  height: 5px;
}
.draggable-corner {
  bottom: 5px;
  cursor: nw-resize;
}
.panel-content-outer {
  height: 100%
}
.panel-content-outer.with-search {
  height: calc(100% - 40px)
}
.panel-content-inner {
  padding: 0px !important;
  overflow: auto;
  height: 100%;
}
</style>

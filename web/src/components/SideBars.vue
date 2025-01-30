<script setup lang="ts">
import { ref, Ref, watch } from "vue";
import { useTheme } from "vuetify/lib/framework.mjs";

import { currentUser, openSidebars, panelArrangement, theme } from "@/store";
import { logout } from "@/api/auth";
import { FloatingPanelConfig } from "@/types";

import FloatingPanel from "./FloatingPanel.vue";
import ProjectConfig from "./ProjectConfig.vue";
import ChartsPanel from "./ChartsPanel.vue";

const version = process.env.VUE_APP_VERSION;
const hash = process.env.VUE_APP_HASH;
const copied: Ref<string | undefined> = ref();

const themeManager = useTheme();
const darkMode = ref<boolean>(theme.value === "dark");

function copyToClipboard(content: string) {
  navigator.clipboard.writeText(content).then(() => {
    copied.value = content;
  });
}

function toggleSidebar(sidebar: "left" | "right") {
  if (openSidebars.value.includes(sidebar)) {
    openSidebars.value = openSidebars.value.filter((s) => s !== sidebar);
  } else {
    openSidebars.value = [...openSidebars.value, sidebar];
  }
}

function togglePanelVisibility(panel: FloatingPanelConfig) {
  panelArrangement.value = panelArrangement.value.map((p) => {
    if (p.id == panel.id) p.visible = !p.visible;
    return p;
  });
}

watch(darkMode, () => {
  theme.value = darkMode.value ? "dark" : "light";
  themeManager.global.name.value = theme.value;
});
</script>

<template>
  <div>
    <v-navigation-drawer
      floating
      width="300"
      location="left"
      :class="
        openSidebars.includes('left') ? 'sidebar left' : 'sidebar left closed'
      "
    >
      <v-toolbar class="toolbar px-5">
        <v-toolbar-title>
          UVDAT
          <v-menu
            activator="parent"
            :open-on-hover="true"
            :close-on-content-click="false"
            @update:model-value="copied = undefined"
          >
            <v-card class="pa-3" style="width: fit-content">
              <v-card-subtitle>
                <a
                  href="https://github.com/OpenGeoscience/uvdat"
                  target="_blank"
                  style="text-decoration: none"
                >
                  <v-icon icon="mdi-github" />
                  Source
                </a>
              </v-card-subtitle>
              <v-card-subtitle>
                <v-icon
                  :icon="copied === version ? 'mdi-check' : 'mdi-content-copy'"
                  :color="copied === version ? 'success' : 'primary'"
                  @click="copyToClipboard(version)"
                />
                Version: {{ version }}
              </v-card-subtitle>
              <v-card-subtitle>
                <v-icon
                  :icon="copied === hash ? 'mdi-check' : 'mdi-content-copy'"
                  :color="copied === hash ? 'success' : 'primary'"
                  @click="copyToClipboard(hash)"
                />
                Hash: {{ hash }}
              </v-card-subtitle>
            </v-card>
          </v-menu>
        </v-toolbar-title>
        <v-icon
          icon="mdi-dock-left"
          class="ml-5"
          v-tooltip="'Toggle Sidebar'"
          @click="toggleSidebar('left')"
        ></v-icon>
      </v-toolbar>
      <ProjectConfig />
      <div class="panel-set">
        <FloatingPanel id="datasets"></FloatingPanel>
        <FloatingPanel id="layers"></FloatingPanel>
      </div>
    </v-navigation-drawer>

    <v-navigation-drawer
      floating
      width="300"
      location="right"
      :class="
        openSidebars.includes('right')
          ? 'sidebar right'
          : 'sidebar right closed'
      "
    >
      <v-toolbar
        :class="
          openSidebars.includes('right') ? 'toolbar px-5' : 'toolbar px-5 right'
        "
      >
        <v-icon
          icon="mdi-dock-right"
          class="mr-5"
          v-tooltip="'Toggle Sidebar'"
          @click="toggleSidebar('right')"
        ></v-icon>
        <div v-if="currentUser">
          {{ currentUser.first_name }}

          <v-menu :close-on-content-click="false">
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props" icon="mdi-cog" class="px-3"></v-icon>
            </template>
            <v-list>
              <v-list-item density="compact">
                Logout
                <template v-slot:append>
                  <v-icon icon="mdi-logout"></v-icon>
                  <v-dialog activator="parent" max-width="300">
                    <template v-slot:default="{ isActive }">
                      <v-card class="pa-3">
                        <v-card-title>Log out?</v-card-title>
                        <v-btn @click="isActive.value = false" text="Cancel" />
                        <v-btn @click="logout" color="red" text="Confirm" />
                      </v-card>
                    </template>
                  </v-dialog>
                </template>
              </v-list-item>
              <v-list-item density="compact">
                Dark Mode
                <template v-slot:append>
                  <v-switch
                    v-model="darkMode"
                    class="ml-5"
                    hide-details
                  ></v-switch>
                </template>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </v-toolbar>
      <div :style="{ height: '30px', 'text-align': 'right' }">
        <v-menu :close-on-content-click="false">
          <template v-slot:activator="{ props }">
            <v-icon
              v-bind="props"
              icon="mdi-menu"
              class="mr-3 mt-1"
              v-tooltip="'Panel Visibility'"
            ></v-icon>
          </template>
          <v-list
            :items="panelArrangement.filter((p) => p.right)"
            item-title="label"
            item-value="id"
            selectable
            :selected="panelArrangement.filter((p) => p.visible)"
            select-strategy="leaf"
            return-object
          >
            <template v-slot:prepend="{ item, isSelected }">
              <v-list-item-action start>
                <v-checkbox-btn
                  :model-value="isSelected"
                  @change="togglePanelVisibility(item)"
                ></v-checkbox-btn>
              </v-list-item-action>
            </template>
          </v-list>
        </v-menu>
      </div>
      <div class="panel-set">
        <FloatingPanel id="legend"></FloatingPanel>
        <FloatingPanel id="charts">
          <ChartsPanel></ChartsPanel>
        </FloatingPanel>
        <FloatingPanel id="analytics"></FloatingPanel>
      </div>
    </v-navigation-drawer>
  </div>
</template>

<style>
.sidebar {
  margin: 10px;
  border-radius: 6px;
  width: 350px !important;
  max-height: calc(100% - 15px);
}
.sidebar > .v-navigation-drawer__content {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.sidebar.closed {
  visibility: hidden;
  transition: max-height 0.15s ease-out;
}
.toolbar {
  visibility: visible;
  border-radius: 6px !important;
}
.toolbar > .v-toolbar__content {
  display: flex;
  justify-content: space-between;
}
.sidebar.closed > .v-navigation-drawer__content > .toolbar {
  width: fit-content !important;
}
.sidebar.closed
  > .v-navigation-drawer__content
  > .toolbar
  > .v-toolbar__content {
  height: 3rem !important;
}
.right {
  position: absolute !important;
  right: 0;
}
.v-toolbar__content {
  height: 4rem !important;
}
.v-toolbar__content > .v-toolbar-title {
  margin-inline-start: 0px !important;
}
.panel-set {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  max-height: calc(100% - 140px);
}
.right .panel-set {
  max-height: calc(100% - 100px);
}
</style>

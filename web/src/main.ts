import { createApp } from "vue";
import App from "./App.vue";
// Vuetify
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { restoreLogin } from "./api/auth";
import { theme } from "@/store";

import "@mdi/font/css/materialdesignicons.css";

let defaultTheme: "light" | "dark" = "light";
if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
) {
  defaultTheme = "dark";
}
theme.value = defaultTheme;

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme,
    themes: {
      light: {
        colors: {
          primary: "#166db7",
          secondary: "#bdddf9",
          background: "#ffffff",
          surface: "#d1d5db",
          success: "#4caf50",
          "surface-bright": "#FFFFFF",
          "surface-light": "#EEEEEE",
          "surface-variant": "#424242",
          "on-surface-variant": "#EEEEEE",
          "primary-darken-1": "#1F5592",
          "secondary-darken-1": "#018786",
          error: "#B00020",
          info: "#2196F3",
          warning: "#FB8C00",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#166db7",
          secondary: "#bdddf9",
          background: "#0a0a0b",
          surface: "#1f2937",
          success: "#d1f4d3",
          "surface-bright": "#FFFFFF",
          "surface-light": "#EEEEEE",
          "surface-variant": "#424242",
          "on-surface-variant": "#EEEEEE",
          "primary-darken-1": "#1F5592",
          "secondary-darken-1": "#018786",
          error: "#B00020",
          info: "#2196F3",
          warning: "#FB8C00",
        },
      },
    },
  },
});

restoreLogin().then(createApp(App).use(vuetify).mount("#app"));

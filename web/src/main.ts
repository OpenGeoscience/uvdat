import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from 'pinia';
// Vuetify
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { restoreLogin } from "./api/auth";
import { theme } from "@/store";

import "@mdi/font/css/materialdesignicons.css";
import { THEMES } from "./themes";

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
    themes: THEMES
  },
});

const app = createApp(App);
app.use(vuetify);
app.use(createPinia());

restoreLogin().then(() => {
  app.mount("#app");
});

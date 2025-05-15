import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from 'pinia';
// Vuetify
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { restoreLogin } from "./api/auth";
import { useAppStore } from "@/store";

import "@mdi/font/css/materialdesignicons.css";
import { THEMES } from "./themes";

// Must first initialize pinia, so we can set the default theme
const app = createApp(App);
app.use(createPinia());

// Now we can get the default theme and initialize vuetify
const defaultTheme = useAppStore().setDefaultTheme();
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme,
    themes: THEMES
  },
});
app.use(vuetify);

// Finally, mount the app
restoreLogin().then(() => {
  app.mount("#app");
});

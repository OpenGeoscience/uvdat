import { createApp } from "vue";
import App from "./App.vue";
// Vuetify
import "vuetify/styles";
import colors from "vuetify/lib/util/colors";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { restoreLogin } from "./api/auth";

import "@mdi/font/css/materialdesignicons.css";

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    themes: {
      light: {
        colors: {
          primary: colors.blue.darken3,
        },
      },
    },
  },
});

restoreLogin().then(createApp(App).use(vuetify).mount("#app"));

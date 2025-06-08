import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import './index.css';

import VueTippy from 'vue-tippy';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/translucent.css';

import idbReady from 'safari-14-idb-fix';

// https://github.com/jakearchibald/safari-14-idb-fix
// https://bugs.webkit.org/show_bug.cgi?id=226547
idbReady().then(() => {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(VueTippy, {
    defaultProps: { theme: 'translucent' },
  });
  app.mount('#app');
});

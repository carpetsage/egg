import { createApp } from 'vue';
import router from './router';
import App from './App.vue';
import './index.css';

import VueTippy from 'vue-tippy';
import { Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/translucent.css';

const app = createApp(App);
app.use(router);
app.use(VueTippy, {
  defaultProps: {
    theme: 'translucent',
    onShow: (instance: TippyInstance) => {
      // Image lazyloading.
      instance.popper.querySelectorAll('img').forEach(img => {
        if (!img.src && img.dataset.src) {
          img.src = img.dataset.src;
        }
      });
    },
  },
});
app.mount('#app');

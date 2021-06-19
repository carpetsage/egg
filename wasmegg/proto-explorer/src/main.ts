import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './index.css';

import VueTippy from 'vue-tippy';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/translucent.css';

const app = createApp(App);
app.use(router);
app.use(VueTippy, {
  defaultProps: { theme: 'translucent' },
});
app.mount('#app');

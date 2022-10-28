import { createApp } from 'vue';
import { store, key } from './store';
import router from './router';
import App from './App.vue';
import './index.css';

import PrimeVue from 'primevue/config';
// import 'primeicons/primeicons.css';

import VueTippy from 'vue-tippy';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/translucent.css';

import hotkeys from 'hotkeys-js';

import { directive as clickOutsideDirective } from '@/directives/v-click-outside';

if (
  localStorage.theme === 'dark' ||
  (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark');
  store.commit('theme/setDarkTheme');
} else {
  document.documentElement.classList.remove('dark');
  store.commit('theme/setLightTheme');
}
// Add .themed to html element to enable color transitions. Do it in the next
// animation frame so that .dark is already applied and we don't get a prolonged
// transition for that.
window.requestAnimationFrame(() => document.documentElement.classList.add('themed'));

// Set hotkeys filter to allow esc key to penetrate input.
hotkeys.filter = function (event) {
  const target = event.target! as HTMLElement;
  const tagName = target.tagName;
  const key = event.key;
  return (
    !(
      target.isContentEditable ||
      tagName == 'INPUT' ||
      tagName == 'SELECT' ||
      tagName == 'TEXTAREA'
    ) || key === 'Escape'
  );
};

const app = createApp(App);
app.use(store, key);
app.use(router);
app.use(PrimeVue);
app.use(VueTippy, {
  defaultProps: { theme: 'translucent' },
});
app.directive('click-outside', clickOutsideDirective);
app.mount('#app');

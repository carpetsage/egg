import { defineStore } from 'pinia';
import { getLocalStorage, setLocalStorage } from '@/lib';
import { ref } from 'vue';

const DEVMODE_KEY = 'devmode';

export const useDevmodeStore = defineStore('devmode', () => {
  const on = ref(getLocalStorage(DEVMODE_KEY, '') === 'true');

  function enable() {
    on.value = true;
  }
  function disable() {
    on.value = false;
  }
  function enablePermanently() {
    enable();
    setLocalStorage(DEVMODE_KEY, on.value, '');
  }
  function disableTemporarily() {
    disable();
  }

  return { on, enable, enablePermanently, disable, disableTemporarily };
});

export default useDevmodeStore;

import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const darkThemeOn = ref(false);

  function setDarkTheme() {
    darkThemeOn.value = true;
  }

  function setLightTheme() {
    darkThemeOn.value = false;
  }

  function toggle() {
    darkThemeOn.value = !darkThemeOn.value;
  }

  return { darkThemeOn, setDarkTheme, setLightTheme, toggle };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useThemeStore, import.meta.hot));
}

export default useThemeStore;

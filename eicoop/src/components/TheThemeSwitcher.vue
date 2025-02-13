<template>
  <svg
    v-tippy="{ content: 'Toggle light/dark theme' }"
    viewBox="0 0 20 20"
    class="h-4.5 w-4.5 flex-shrink-0 text-gray-200 cursor-pointer select-none focus:outline-none"
    @click="toggleDarkTheme"
  >
    <path
      class="transition-all duration-500"
      fill="currentColor"
      :d="
        darkThemeOn
          ? 'M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z'
          : 'M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z'
      "
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
  </svg>
</template>

<script lang="ts">
import useThemeStore from '@/stores/theme';
import { computed, defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const store = useThemeStore();
    const darkThemeOn = computed(() => store.darkThemeOn);
    const toggleDarkTheme = () => {
      store.toggle();
      document.documentElement.classList.toggle('dark');
      localStorage['theme'] = darkThemeOn.value ? 'dark' : 'light';
    };
    return {
      darkThemeOn,
      toggleDarkTheme,
    };
  },
});
</script>

<template>
  <nav class="bg-cool-gray-600 dark:bg-cool-gray-800">
    <div class="mx-auto px-3 sm:px-5 max-w-8xl">
      <div class="flex items-center justify-between h-14 sm:h-12">
        <div class="flex items-center justify-center h-6">
          <div class="flex-shrink-0">
            <router-link :to="{ name: 'home' }" class="block">
              <img src="/logo-small.svg" class="h-6" />
            </router-link>
          </div>
          <svg
            v-if="devmode"
            viewBox="0 0 512 512"
            class="h-2.5 w-2.5 text-gray-200 cursor-pointer"
            fill="currentColor"
            @click="disableDevmodeTemporarily"
            v-tippy="{
              content:
                'Developer mode enabled! Click to disable temporarily (re-enabled upon refresh).',
            }"
          >
            <path
              d="M501.1 395.7L384 278.6c-23.1-23.1-57.6-27.6-85.4-13.9L192 158.1V96L64 0 0 64l96 128h62.1l106.6 106.6c-13.6 27.8-9.2 62.3 13.9 85.4l117.1 117.1c14.6 14.6 38.2 14.6 52.7 0l52.7-52.7c14.5-14.6 14.5-38.2 0-52.7zM331.7 225c28.3 0 54.9 11 74.9 31l19.4 19.4c15.8-6.9 30.8-16.5 43.8-29.5 37.1-37.1 49.7-89.3 37.9-136.7-2.2-9-13.5-12.1-20.1-5.5l-74.4 74.4-67.9-11.3L334 98.9l74.4-74.4c6.6-6.6 3.4-17.9-5.7-20.2-47.4-11.7-99.6.9-136.6 37.9-28.5 28.5-41.9 66.1-41.2 103.6l82.1 82.1c8.1-1.9 16.5-2.9 24.7-2.9zm-103.9 82l-56.7-56.7L18.7 402.8c-25 25-25 65.5 0 90.5s65.5 25 90.5 0l123.6-123.6c-7.6-19.9-9.9-41.6-5-62.7zM64 472c-13.2 0-24-10.8-24-24 0-13.3 10.7-24 24-24s24 10.7 24 24c0 13.2-10.7 24-24 24z"
            />
          </svg>
        </div>
        <div>
          <div class="ml-4 flex items-center md:ml-6">
            <div class="ml-10 flex items-baseline space-x-3">
              <coop-selector-show v-slot="scope">
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="relative top-px h-4 w-4 text-gray-200 cursor-pointer select-none focus:outline-none"
                  @click="scope.show"
                  v-tippy="{ content: 'Coop selector (hotkey: c)' }"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clip-rule="evenodd"
                  />
                </svg>
              </coop-selector-show>

              <a
                href="https://wasmegg.netlify.app/"
                target="_blank"
                class="block h-4 w-4"
                v-tippy="{ content: 'Other tools' }"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-4 w-4 text-gray-200 cursor-pointer select-none"
                >
                  <path
                    d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
                  />
                  <path
                    d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                  />
                </svg>
              </a>

              <the-theme-switcher />
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useStore } from 'vuex';

import { key } from '@/store';
import { iconURL } from '@/utils';
import CoopSelectorShow from './CoopSelectorShow.vue';
import TheThemeSwitcher from './TheThemeSwitcher.vue';

export default defineComponent({
  components: {
    CoopSelectorShow,
    TheThemeSwitcher,
  },
  props: {
    widthClass: {
      type: String,
      default: 'max-w-4xl',
    },
  },
  setup() {
    const store = useStore(key);
    const devmode = computed(() => store.state.devmode.on);
    const disableDevmodeTemporarily = () => store.dispatch('devmode/disableTemporarily');
    return {
      devmode,
      disableDevmodeTemporarily,
      iconURL,
    };
  },
});
</script>

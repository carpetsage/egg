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
import { defineComponent } from 'vue';

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
    return {
      iconURL,
    };
  },
});
</script>

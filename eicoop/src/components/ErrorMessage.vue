<template>
  <div class="max-w-ultrawide w-full mx-auto px-4 space-y-3">
    <div class="text-center break-words text-red-500">
      <svg class="relative inline h-4 w-4 -top-px mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      <base-click-to-copy
        class="text-sm break-all sm:break-normal"
        color-classes="active:text-red-400 dark:active:text-red-600"
        :text="devmode ? error.stack || error.toString() : encodedError"
      >
        <template v-if="devmode">
          <div class="whitespace-pre-wrap">{{ error.stack }}</div>
        </template>
        <template v-else>{{ formattedError }}</template>
      </base-click-to-copy>
    </div>

    <button
      type="button"
      class="mx-auto flex items-center justify-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 focus:outline-none rounded-md duration-0!"
      @click="triggerRefresh"
    >
      <svg class="-ml-px mr-1.5 h-3 w-3 text-gray-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span class="text-xs text-gray-100">Refresh</span>
    </button>

    <div class="text-center break-words text-sm text-gray-700 dark:text-gray-200">
      If you believe this is a bug,
      <a href="https://wasmegg-carpet.netlify.app/#/contact" target="_blank" class="text-blue-500"
        >contact @carpetsage</a
      >.
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, toRefs } from 'vue';

import { devmodeKey, refreshCallbackKey } from '@/symbols';
import BaseClickToCopy from '@/components/BaseClickToCopy.vue';

export default defineComponent({
  components: {
    BaseClickToCopy,
  },
  props: {
    error: {
      type: Error,
      required: true,
    },
  },
  setup(props) {
    const { error } = toRefs(props);
    const devmode = inject(devmodeKey);
    console.error(error.value);
    const formattedError = computed(() =>
      String(error.value).replaceAll(/EI\d{16}/g, s => s.substring(0, 6) + '********' + s.substring(14))
    );
    const encodedError = computed(() => btoa(String(error.value)));
    const triggerRefresh = inject(refreshCallbackKey, () => {
      window.location.reload();
    });
    return {
      devmode,
      formattedError,
      encodedError,
      triggerRefresh,
    };
  },
});
</script>

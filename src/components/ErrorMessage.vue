<template>
  <div class="max-w-8xl w-full mx-auto my-6 px-4 space-y-3">
    <div class="text-center break-words text-red-500">
      <svg class="relative inline h-4 w-4 -top-px mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      <base-click-to-copy
        class="text-sm"
        colorClasses="active:text-red-400 dark:active:text-red-600"
        :text="encodedError"
      >
        {{ formattedError }}
      </base-click-to-copy>
    </div>

    <div class="text-center break-words text-sm text-gray-700 dark:text-gray-200">
      If you believe this is a bug, contact @mk2 on
      <a href="https://discord.gg/egginc" target="_blank" class="text-blue-500">Discord</a>.
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from 'vue';

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
    // Scrub user IDs.
    const formattedError = computed(() =>
      String(error.value).replaceAll(
        /EI\d{16}/g,
        s => s.substring(0, 6) + '********' + s.substring(14)
      )
    );
    const encodedError = computed(() => btoa(String(error.value)));
    return {
      formattedError,
      encodedError,
    };
  },
});
</script>

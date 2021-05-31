<template>
  <span class="flex items-center space-x-0.5">
    <span
      v-tippy="{ content: `Last refreshed ${refreshTime.format('YYYY-MM-DD HH:mm:ss')}` }"
      class="text-xs text-gray-500 dark:text-gray-400 cursor-help truncate"
    >
      Refreshed {{ relativeTime }}
    </span>
    <svg
      v-tippy="{ content: 'Refresh page' }"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      class="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 cursor-pointer select-none"
      @click="triggerRefresh"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  </span>
</template>

<script lang="ts">
import { defineComponent, inject, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { refreshCallbackKey } from '@/symbols';

dayjs.extend(relativeTime);

export default defineComponent({
  props: {
    refreshTime: {
      type: Dayjs,
      required: true,
    },
  },
  setup(props) {
    const { refreshTime } = toRefs(props);
    const triggerRefresh = inject(refreshCallbackKey, () => {
      window.location.reload();
    });

    const getRelativeTime = () => {
      const now = dayjs();
      return (refreshTime.value < now ? refreshTime.value : now).fromNow();
    };
    const relativeTime = ref(getRelativeTime());
    const refresh = () => {
      relativeTime.value = getRelativeTime();
    };

    watch(refreshTime, () => refresh());

    let refreshIntervalId: number;
    onMounted(() => {
      refreshIntervalId = setInterval(refresh, 30000);
      window.addEventListener('pageshow', refresh);
      window.addEventListener('visibilitychange', refresh);
    });
    onBeforeUnmount(() => {
      clearInterval(refreshIntervalId);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('visibilitychange', refresh);
    });

    return {
      relativeTime,
      triggerRefresh,
    };
  },
});
</script>

<template>
  <div v-if="entries.length > 0" class="my-4 bg-white dark:bg-gray-800 shadow overflow-hidden">
    <div
      class="px-4 sm:px-6 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 text-sm font-medium"
    >
      Recently viewed coops
    </div>
    <div class="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3">
      <template v-for="(entry, index) in entries" :key="index">
        <recently-viewed-entry :entry="entry" />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useStore } from 'vuex';

import { key } from '@/store';
import RecentlyViewedEntry from './RecentlyViewedEntry.vue';

export default defineComponent({
  components: {
    RecentlyViewedEntry,
  },
  setup() {
    const store = useStore(key);
    const entries = store.state.history.coops;
    return {
      entries,
    };
  },
});
</script>

<template>
  <div class="text-xs text-gray-500">Drop rates depend on epic researches and ship levels.</div>
  <button
    type="button"
    class="flex items-center px-2 py-1 border border-transparent shadow-sm text-xs rounded-md text-white bg-gray-500 hover:bg-gray-600 focus:outline-none sm:focus:ring-2 sm:focus:ring-offset-1 sm:focus:ring-gray-500"
    @click="openConfigModal"
  >
    <CogIcon class="-ml-0.5 mr-1 h-4 w-4" aria-hidden="true" />
    Configure mission parameters
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { CogIcon } from '@heroicons/vue/solid';

import { openConfigModal } from '@/store';

export default defineComponent({
  components: {
    CogIcon,
  },
  setup() {
    return {
      openConfigModal,
    };
  },
});
</script>

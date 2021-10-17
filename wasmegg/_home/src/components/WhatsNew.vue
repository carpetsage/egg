<template>
  <div
    v-if="
      !dismissedByUser &&
      (newTools.length > 0 || majorUpdateTools.length > 0 || updateTools.length > 0)
    "
    class="relative py-2 bg-green-100 rounded-lg shadow-inner"
  >
    <template v-if="newTools.length > 0">
      <h2 class="px-5 font-medium">New tools</h2>
      <ul class="pr-5 my-1">
        <li v-for="tool in newTools" :key="tool.id">
          <tool-link :tool="tool" /> &mdash; {{ tool.description }}
        </li>
      </ul>
    </template>

    <template v-if="majorUpdateTools.length > 0">
      <h2 class="px-5 font-medium">Major updates</h2>
      <ul class="my-1">
        <li v-for="tool in majorUpdateTools" :key="tool.id"><tool-link :tool="tool" /></li>
      </ul>
    </template>

    <template v-if="updateTools.length > 0">
      <h2 class="px-5 font-medium">
        <template v-if="majorUpdateTools.length > 0">Other updates</template>
        <template v-else>Updates</template>
      </h2>
      <ul class="my-1">
        <li v-for="tool in updateTools" :key="tool.id"><tool-link :tool="tool" /></li>
      </ul>
    </template>

    <button
      type="button"
      class="absolute top-1.5 right-1.5 inline-flex rounded-md p-1.5 focus:outline-none"
      @click="dismiss"
    >
      <svg
        class="h-4 w-4 text-green-500 hover:text-green-600"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clip-rule="evenodd"
        />
      </svg>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

import { getLocalStorage, setLocalStorage } from 'lib';
import { majorUpdateTools, newTools, updateSignature, updateTools } from 'lib/tools';
import ToolLink from '@/components/ToolLink.vue';

const WHATS_NEW_DISMISSED_SIGNATURE_LOCALSTORAGE_KEY = 'whatsNewDismissedSignature';

export default defineComponent({
  components: {
    ToolLink,
  },
  setup() {
    const dismissedByUser = ref(
      getLocalStorage(WHATS_NEW_DISMISSED_SIGNATURE_LOCALSTORAGE_KEY) === updateSignature
    );
    const dismiss = () => {
      dismissedByUser.value = true;
      setLocalStorage(WHATS_NEW_DISMISSED_SIGNATURE_LOCALSTORAGE_KEY, updateSignature);
    };
    return {
      dismissedByUser,
      dismiss,
      newTools,
      majorUpdateTools,
      updateTools,
    };
  },
});
</script>

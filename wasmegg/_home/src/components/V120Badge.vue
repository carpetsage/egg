<template>
  <span
    class="whitespace-nowrap text-sm text-white px-1.5 py-0.5 rounded-full ml-1"
    :class="partiallyDone ? 'bg-orange-300' : 'bg-red-300'"
  >
    <template v-if="partiallyDone">not fully updated for v1.21</template>
    <template v-else>not yet updated for v1.21</template>
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    partiallyDone: {
      type: Boolean,
      default: false,
    },
  },
});
</script>

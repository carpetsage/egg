<template>
  <error-message v-if="error" :error="error" />
  <slot v-else></slot>
</template>

<script lang="ts">
import { defineComponent, onErrorCaptured, ref } from 'vue';

import ErrorMessage from '@/components/ErrorMessage.vue';

export default defineComponent({
  components: {
    ErrorMessage,
  },
  setup() {
    const error = ref(null as Error | null);
    onErrorCaptured(err => {
      error.value = err as Error;
      return false;
    });
    return {
      error,
    };
  },
});
</script>

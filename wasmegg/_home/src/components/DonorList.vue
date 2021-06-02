<template>
  <div class="px-4 py-2 my-2 grid grid-cols-1 sm:grid-cols-2 bg-yellow-100 rounded-lg shadow-inner">
    <div v-for="(donor, index) in donors" :key="index">{{ donor }}</div>
  </div>
  <p>
    If you are a supporter and don't see your name here, or see a placeholder because I don't know
    who to credit, please get in touch.
  </p>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { donors } from '@/donors';

export default defineComponent({
  setup() {
    return {
      donors,
    };
  },
});
</script>

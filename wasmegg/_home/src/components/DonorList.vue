<template>
  <ul class="py-2 bg-yellow-100 rounded-lg shadow-inner">
    <li v-for="(donor, index) in donors" :key="index">{{ donor }}</li>
  </ul>
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

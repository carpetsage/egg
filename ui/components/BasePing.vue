<!-- Dot with radar ping animation, usually used to alert to a new feature. -->
<template>
  <span class="absolute flex" :class="[positionClasses, sizeClasses]">
    <span
      class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
    ></span>
    <span class="relative inline-flex rounded-full bg-green-500" :class="sizeClasses"></span>
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    sizeClasses: {
      type: String,
      default: 'h-2 w-2',
    },
    positionClasses: {
      type: String,
      default: '-top-px -right-px',
    },
  },
});
</script>

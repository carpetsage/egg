<template>
  <svg :height="radius * 2" :width="radius * 2">
    <circle
      class="text-gray-200"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      fill="transparent"
      :r="innerRadius"
      :cx="radius"
      :cy="radius"
    />
  </svg>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from 'vue';

export default defineComponent({
  props: {
    radius: {
      type: Number,
      required: true,
    },
    strokeWidth: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const { radius, strokeWidth } = toRefs(props);
    const innerRadius = computed(() => radius.value - strokeWidth.value * 2);
    return {
      innerRadius,
    };
  },
});
</script>

<!-- Based on https://css-tricks.com/building-progress-ring-quickly/ -->

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
    <circle
      stroke="currentColor"
      :stroke-dasharray="`${innerCircumference} ${innerCircumference}`"
      :stroke-width="strokeWidth"
      :stroke-dashoffset="strokeDashoffset"
      fill="transparent"
      :r="innerRadius"
      :cx="radius"
      :cy="radius"
    />
  </svg>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import { useCountdown } from '@/composables/countdown';

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
    durationSeconds: {
      type: Number as PropType<number>,
      required: true,
    },
    // Epoch seconds.
    deadline: {
      type: Number as PropType<number>,
      required: true,
    },
  },
  setup(props) {
    const { radius, strokeWidth, durationSeconds, deadline } = toRefs(props);
    const innerRadius = computed(() => radius.value - strokeWidth.value * 2);
    const innerCircumference = computed(() => innerRadius.value * 2 * Math.PI);
    const { secondsRemaining } = useCountdown(deadline);
    const strokeDashoffset = computed(
      () => (innerCircumference.value * secondsRemaining.value) / durationSeconds.value
    );
    return {
      innerRadius,
      innerCircumference,
      strokeDashoffset,
    };
  },
});
</script>

<style scoped>
circle {
  transition: stroke-dashoffset 0.2s;
  transform: rotate(90deg);
  transform-origin: 50% 50%;
}
</style>

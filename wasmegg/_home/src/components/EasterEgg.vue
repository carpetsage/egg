<template>
  <img
    :src="iconURL('egginc/egg_easter.png', 256)"
    class="fixed top-0 left-0 z-50 h-16 w-16"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @load="startAnimation"
  />
  <fireworks-animation
    v-for="([fx, fy], index) in fireworksCoordinates"
    :key="index"
    :x="fx"
    :y="fy"
    :color-index="index"
  />
</template>

<script lang="ts">
import { iconURL } from 'lib';
import { defineComponent, onBeforeUnmount, ref, toRefs, watch } from 'vue';

import FireworksAnimation from '@/components/FireworksAnimation.vue';

export default defineComponent({
  components: {
    FireworksAnimation,
  },
  props: {
    refreshKey: {
      type: Number,
      default: 0,
    },
  },
  setup(props) {
    const { refreshKey } = toRefs(props);

    const eggDimension = 64;
    const x0 = -eggDimension;
    const y0 = 0;
    const halfCycleDuration = 3;
    const x = ref(x0);
    const y = ref(y0);
    const fireworksCoordinates = ref(<[number, number][]>[]);

    let animating = false;

    const startAnimation = () => {
      animating = true;
      x.value = x0;
      y.value = y0;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const gravity = (2 * (height - eggDimension)) / (halfCycleDuration * halfCycleDuration);
      const horizontalVelocity = width / halfCycleDuration / 6;
      let startingTime = Date.now();
      let lastFireworksTime = startingTime;
      let renderFrame = () => {
        const now = Date.now();
        const t = (now - startingTime) / 1000;
        const priorHalfCycles = Math.floor(t / halfCycleDuration);
        const tt = t - priorHalfCycles * halfCycleDuration;
        x.value = x0 + horizontalVelocity * t;
        if (priorHalfCycles % 2 === 0) {
          y.value = y0 + (gravity * tt * tt) / 2;
        } else {
          y.value = y0 + (gravity * (halfCycleDuration - tt) * (halfCycleDuration - tt)) / 2;
        }
        if (x.value > window.innerWidth) {
          animating = false;
        }
        if (now - lastFireworksTime >= 300) {
          lastFireworksTime = now;
          fireworksCoordinates.value.push([x.value + eggDimension / 2, y.value + eggDimension / 2]);
        }
        if (animating) {
          requestAnimationFrame(renderFrame);
        }
      };
      requestAnimationFrame(renderFrame);
    };

    watch(refreshKey, async () => {
      const waitingKey = refreshKey.value;
      const waitingDeadline = Date.now() + 3000;
      while (animating) {
        if (refreshKey.value !== waitingKey) {
          // A new refresh trigger has supplanted the current one.
          return;
        }
        if (Date.now() > waitingDeadline) {
          // Don't start a new cycle if the current cycle has kept going on for
          // at least three seconds after the refresh trigger.
          return;
        }
        await new Promise(res => setTimeout(res, 100));
      }
      startAnimation();
    });

    onBeforeUnmount(() => {
      animating = false;
    });

    return {
      x,
      y,
      fireworksCoordinates,
      startAnimation,
      iconURL,
    };
  },
});
</script>

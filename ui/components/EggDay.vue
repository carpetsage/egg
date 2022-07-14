<template>
  <div
    v-if="countdown > 0"
    class="fixed right-4 bottom-4 lg:right-6 lg:bottom-6 h-[80px] w-[80px] pointer-events-none"
  >
    <img :src="eggDayIcon" class="h-full w-full rounded-2xl" />
    <div class="absolute bottom-0 w-full text-center text-black bg-white/50 rounded-b-2xl">
      <span class="countdown">{{ countdownDisplay }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import confetti from 'canvas-confetti';

import eggDayIcon from '../assets/EggDay.png';

const calculateCountdown = () => {
  return Math.max(1657897200000 - Date.now(), 0) / 1000;
};
const countdown = ref(calculateCountdown());
const pad00 = (n: number) => n.toString().padStart(2, '0');
const countdownDisplay = computed(() => {
  const secs = countdown.value;
  const hh = Math.floor(secs / 3600);
  const mm = Math.floor((secs % 3600) / 60);
  const ss = Math.floor(secs % 60);
  return `${pad00(hh)}:${pad00(mm)}:${pad00(ss)}`;
});
let countdownIntervalId: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  countdown.value = calculateCountdown();
  countdownIntervalId = setInterval(() => {
    countdown.value = calculateCountdown();
  }, 1000);
});
onBeforeUnmount(() => {
  if (countdownIntervalId !== undefined) {
    clearInterval(countdownIntervalId);
  }
});

const count = 200;

function fire(particleRatio: number, opts: confetti.Options) {
  confetti({ ...opts, particleCount: Math.floor(count * particleRatio) });
}

function randrange(low: number, high: number): number {
  return Math.random() * (high - low) + low;
}

function confettiGroup() {
  const shared: confetti.Options = {
    origin: {
      x: randrange(0.15, 0.85),
      y: randrange(0.2, 0.9),
    },
  };
  fire(0.25, {
    ...shared,
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    ...shared,
    spread: 60,
  });
  fire(0.35, {
    ...shared,
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    ...shared,
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    ...shared,
    spread: 120,
    startVelocity: 45,
  });
}

let confettiGroupTimeoutId: ReturnType<typeof setTimeout> | undefined;
const step = () => {
  if (document.visibilityState === 'visible' && countdown.value > 0) {
    confettiGroup();
  }
  confettiGroupTimeoutId = setTimeout(step, randrange(5000, 7500));
};
onMounted(() => {
  step();
});
onBeforeUnmount(() => {
  if (confettiGroupTimeoutId !== undefined) {
    clearTimeout(confettiGroupTimeoutId);
  }
});
</script>

<style scoped lang="postcss">
.countdown {
  @apply block relative top-px tracking-wider leading-snug tabular-nums;
  font-family: 'Always Together';
}
</style>

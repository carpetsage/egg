<template>
  <p>Developer mode enabled. Redirecting to home page in {{ countdown }} seconds...</p>
</template>

<script lang="ts">
import { turnOnDevMode } from 'lib';
import { defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  setup() {
    const router = useRouter();

    const delaySeconds = 5;
    const deadline = Date.now() + delaySeconds * 1000;
    const countdown = ref(delaySeconds);
    let countdownIntervalId: number | undefined;
    let redirectTimeoutId: number | undefined;
    onMounted(() => {
      turnOnDevMode();
      countdownIntervalId = setInterval(() => {
        countdown.value = Math.max(Math.ceil((deadline - Date.now()) / 1000), 0);
      }, 100);
      redirectTimeoutId = setTimeout(() => {
        router.push({ name: 'home' });
      }, delaySeconds * 1000);
    });
    onBeforeUnmount(() => {
      clearInterval(countdownIntervalId);
      clearTimeout(redirectTimeoutId);
    });

    return {
      countdown,
    };
  },
});
</script>

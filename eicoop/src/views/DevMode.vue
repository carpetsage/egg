<template>
  <div class="flex-1 max-w-ultrawide w-full mx-auto mt-6">
    <p class="text-sm text-gray-900 dark:text-gray-100 text-center tabular-nums">
      Developer mode enabled. Redirecting to home page in {{ countdown }} seconds...
    </p>
  </div>
</template>

<script lang="ts">
import useDevmodeStore from '@/stores/devmode';
import { defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  setup() {
    const router = useRouter();
    const devmodeStore = useDevmodeStore();

    const delaySeconds = 5;
    const deadline = Date.now() + delaySeconds * 1000;
    const countdown = ref(delaySeconds);
    let countdownIntervalId: number | undefined;
    let redirectTimeoutId: number | undefined;
    onMounted(() => {
      devmodeStore.enablePermanently();
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

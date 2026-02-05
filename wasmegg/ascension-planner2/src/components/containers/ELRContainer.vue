<template>
  <ELRDisplay
    :output="output"
    :time-unit="store.timeUnit"
    @set-time-unit="store.setTimeUnit"
  />
</template>

<script setup lang="ts">
/**
 * Container component for Effective Lay Rate Calculator.
 * Connects the store and composable to the presenter.
 */
import { useEffectiveLayRateStore } from '@/stores/effectiveLayRate';
import { useEffectiveLayRate } from '@/composables/useEffectiveLayRate';
import ELRDisplay from '@/components/presenters/ELRDisplay.vue';

const store = useEffectiveLayRateStore();
const { output } = useEffectiveLayRate();
</script>

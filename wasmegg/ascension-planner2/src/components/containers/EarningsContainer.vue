<template>
  <EarningsDisplay
    :output="output"
    :egg-value="input.eggValue"
    :effective-lay-rate="input.effectiveLayRate"
    :colleggtible-tiers="colleggtibleTiers"
    :time-unit="store.timeUnit"
    @set-time-unit="store.setTimeUnit"
  />
</template>

<script setup lang="ts">
/**
 * Container component for Earnings Calculator.
 * Connects the store and composable to the presenter.
 */
import { computed } from 'vue';
import { useEarningsStore } from '@/stores/earnings';
import { useInitialStateStore } from '@/stores/initialState';
import { useEarnings } from '@/composables/useEarnings';
import EarningsDisplay from '@/components/presenters/EarningsDisplay.vue';

const store = useEarningsStore();
const initialStateStore = useInitialStateStore();
const { input, output } = useEarnings();

// Get colleggtible tiers from initial state (read-only)
const colleggtibleTiers = computed(() => ({
  firework: initialStateStore.colleggtibleTiers['firework'] ?? -1,
  chocolate: initialStateStore.colleggtibleTiers['chocolate'] ?? -1,
  wood: initialStateStore.colleggtibleTiers['wood'] ?? -1,
}));
</script>

<template>
  <LayRateDisplay
    :output="output"
    :epic-comfy-nests-level="epicComfyNestsLevel"
    :colleggtible-tier="colleggtibleTier"
    :time-unit="store.timeUnit"
    @set-time-unit="store.setTimeUnit"
  />
</template>

<script setup lang="ts">
/**
 * Container component for Egg Laying Rate Calculator.
 * Connects the store and composable to the presenter.
 */
import { computed } from 'vue';
import { useLayRateStore } from '@/stores/layRate';
import { useInitialStateStore } from '@/stores/initialState';
import { useLayRate } from '@/composables/useLayRate';
import LayRateDisplay from '@/components/presenters/LayRateDisplay.vue';

const store = useLayRateStore();
const initialStateStore = useInitialStateStore();
const { output } = useLayRate();

// Get epic comfy nests level from initial state (read-only)
const epicComfyNestsLevel = computed(() =>
  initialStateStore.epicResearchLevels['epic_egg_laying'] || 0
);

// Get Silicon colleggtible tier from initial state (read-only)
const colleggtibleTier = computed(() => initialStateStore.colleggtibleTiers['silicon'] ?? -1);
</script>

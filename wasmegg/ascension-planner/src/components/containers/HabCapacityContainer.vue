<template>
  <hab-capacity-display
    :output="output"
    :colleggtible-tier="colleggtibleTier"
    :cheaper-contractors-level="cheaperContractorsLevel"
    :flame-retardant-multiplier="flameRetardantMultiplier"
  />
</template>

<script setup lang="ts">
/**
 * Container component for Hab Capacity Calculator.
 * Connects the store and composable to the presenter.
 */
import { computed } from 'vue';
import { useHabCapacityStore } from '@/stores/habCapacity';
import { useInitialStateStore } from '@/stores/initialState';
import { useHabCapacity } from '@/composables/useHabCapacity';
import HabCapacityDisplay from '@/components/presenters/HabCapacityDisplay.vue';

const store = useHabCapacityStore();
const initialStateStore = useInitialStateStore();
const { output } = useHabCapacity();

// Get P.E.G.G colleggtible tier from initial state (read-only)
const colleggtibleTier = computed(() => initialStateStore.colleggtibleTiers['pegg'] ?? -1);

// Get Cheaper Contractors epic research level from initial state (read-only)
const cheaperContractorsLevel = computed(() => initialStateStore.epicResearchLevels['cheaper_contractors'] || 0);

// Get Flame Retardant colleggtible multiplier from initial state (read-only)
const flameRetardantMultiplier = computed(() => initialStateStore.colleggtibleModifiers.habCost);
</script>

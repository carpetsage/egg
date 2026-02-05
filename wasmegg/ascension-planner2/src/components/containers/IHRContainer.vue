<template>
  <IHRDisplay
    :output="output"
    :te="virtueStore.te"
    :epic-research-levels="epicResearchLevels"
    :colleggtible-tier="colleggtibleTier"
  />
</template>

<script setup lang="ts">
/**
 * Container component for Internal Hatchery Rate Calculator.
 * Connects the store and composable to the presenter.
 */
import { computed } from 'vue';
import { useInitialStateStore } from '@/stores/initialState';
import { useVirtueStore } from '@/stores/virtue';
import { useInternalHatcheryRate } from '@/composables/useInternalHatcheryRate';
import IHRDisplay from '@/components/presenters/IHRDisplay.vue';

const initialStateStore = useInitialStateStore();
const virtueStore = useVirtueStore();
const { output } = useInternalHatcheryRate();

// Get epic research levels from initial state (read-only)
const epicResearchLevels = computed(() => ({
  epicInternalIncubators: initialStateStore.epicResearchLevels['epic_internal_incubators'] || 0,
  internalHatcheryCalm: initialStateStore.epicResearchLevels['int_hatch_calm'] || 0,
}));

// Get Easter colleggtible tier from initial state (read-only)
const colleggtibleTier = computed(() => initialStateStore.colleggtibleTiers['easter'] ?? -1);
</script>

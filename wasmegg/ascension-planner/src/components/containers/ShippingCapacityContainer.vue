<template>
  <ShippingCapacityDisplay
    :output="output"
    :vehicles="store.vehicles"
    :transportation-lobbyist-level="transportationLobbyistLevel"
    :colleggtible-tiers="colleggtibleTiers"
    :graviton-coupling-level="gravitonCouplingLevel"
    :max-train-length="store.maxTrainLength"
    :time-unit="store.timeUnit"
    :bust-unions-level="bustUnionsLevel"
    :lithium-multiplier="lithiumMultiplier"
    @set-time-unit="store.setTimeUnit"
  />
</template>

<script setup lang="ts">
/**
 * Container component for Shipping Capacity Calculator.
 * Connects the store and composable to the presenter.
 */
import { computed } from 'vue';
import { useShippingCapacityStore } from '@/stores/shippingCapacity';
import { useInitialStateStore } from '@/stores/initialState';
import { useShippingCapacity } from '@/composables/useShippingCapacity';
import ShippingCapacityDisplay from '@/components/presenters/ShippingCapacityDisplay.vue';

const store = useShippingCapacityStore();
const initialStateStore = useInitialStateStore();
const { output } = useShippingCapacity();

// Get graviton coupling level from research levels
const gravitonCouplingLevel = computed(() => {
  const research = store.gravitonCouplingResearch;
  if (!research) return 0;
  return store.researchLevels[research.id] || 0;
});

// Get transportation lobbyist level from initial state (read-only)
const transportationLobbyistLevel = computed(() =>
  initialStateStore.epicResearchLevels['transportation_lobbyist'] || 0
);

// Get colleggtible tiers from initial state (read-only)
const colleggtibleTiers = computed(() => ({
  carbonFiber: initialStateStore.colleggtibleTiers['carbon-fiber'] ?? -1,
  pumpkin: initialStateStore.colleggtibleTiers['pumpkin'] ?? -1,
}));

// Get Bust Unions epic research level from initial state (read-only)
const bustUnionsLevel = computed(() =>
  initialStateStore.epicResearchLevels['bust_unions'] || 0
);

// Get Lithium colleggtible multiplier from initial state (read-only)
const lithiumMultiplier = computed(() =>
  initialStateStore.colleggtibleModifiers.vehicleCost
);
</script>

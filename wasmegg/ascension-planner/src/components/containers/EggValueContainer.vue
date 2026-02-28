<template>
  <egg-value-display :output="output" />
</template>

<script setup lang="ts">
/**
 * Container component for Egg Value Calculator.
 * Connects the store and composable to the presenter.
 */
import { useEggValueStore } from '@/stores/eggValue';
import { useEggValue } from '@/composables/useEggValue';
import EggValueDisplay from '@/components/presenters/EggValueDisplay.vue';

const store = useEggValueStore();
const { output } = useEggValue();
</script>

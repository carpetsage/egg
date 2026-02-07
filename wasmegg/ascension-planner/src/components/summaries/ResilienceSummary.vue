<template>
  <div class="px-4 py-3 bg-red-50 border-t border-red-200 flex flex-wrap gap-x-6 gap-y-2 items-center">
    <!-- Title -->
    <div class="text-sm text-red-800 font-medium">Resilience Summary</div>

    <!-- Stats -->
    <div v-if="silosPurchased > 0" class="flex items-center gap-4 text-xs">
      <div class="flex items-center gap-1.5 text-red-700">
        <span class="font-bold">{{ silosPurchased }}</span>
        <span class="opacity-80">Silos Purchased</span>
      </div>
      
      <div class="w-px h-3 bg-red-300"></div>

      <div class="flex items-center gap-1.5 text-red-700">
        <span class="opacity-80">Total Away Time:</span>
        <span class="font-bold">{{ formattedAwayTime }}</span>
      </div>
    </div>
    
    <div v-else class="text-xs text-red-500 italic">
      No silos purchased in this period
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Action } from '@/types';

const props = defineProps<{
  headerAction: Action;
  actions: Action[];
}>();

const silosPurchased = computed(() => {
  return props.actions.filter(a => a.type === 'buy_silo').length;
});

const finalAwayTimeMinutes = computed(() => {
  if (props.actions.length > 0) {
    return props.actions[props.actions.length - 1].endState.siloTimeMinutes;
  }
  return props.headerAction.endState.siloTimeMinutes;
});

const formattedAwayTime = computed(() => {
  const minutes = finalAwayTimeMinutes.value;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
});
</script>

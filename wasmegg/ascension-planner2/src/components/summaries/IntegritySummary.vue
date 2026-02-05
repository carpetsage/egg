<template>
  <div class="px-4 py-3 bg-blue-50 border-t border-blue-200">
    <div class="flex items-center gap-2">
      <span class="text-sm text-blue-800 font-medium">Integrity Summary</span>
      <span v-if="teGained > 0" class="flex items-center gap-1 text-xs text-blue-700 bg-blue-200 px-1.5 py-0.5 rounded">
        +{{ teGained }}
        <img :src="iconURL('egginc/egg_truth.png', 32)" class="w-3.5 h-3.5" alt="TE" />
      </span>
    </div>
    <div class="text-xs text-blue-600 mt-1">
      <div>{{ habNames }}</div>
      <div class="font-mono">{{ formatNumber(habCapacity, 3) }} hab cap</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { iconURL } from 'lib';
import type { Action, WaitForTEPayload } from '@/types';
import { getHabById, type HabId } from '@/lib/habs';
import { formatNumber } from '@/lib/format';

const props = defineProps<{
  actions: Action[];
}>();

/**
 * Get the final state from the last action (the shift action).
 */
const finalState = computed(() => {
  if (props.actions.length === 0) return null;
  return props.actions[props.actions.length - 1].endState;
});

/**
 * Get hab names from the final state, comma-separated.
 */
const habNames = computed(() => {
  if (!finalState.value) return '';
  const habIds = finalState.value.habIds;
  return habIds
    .map(id => (id !== null ? getHabById(id as HabId)?.name : null))
    .filter(Boolean)
    .join(', ');
});

/**
 * Get the hab capacity from the final state.
 */
const habCapacity = computed(() => {
  return finalState.value?.habCapacity ?? 0;
});

/**
 * Calculate total TE gained from wait_for_te actions in this period.
 */
const teGained = computed(() => {
  return props.actions
    .filter(a => a.type === 'wait_for_te')
    .reduce((sum, a) => sum + (a.payload as WaitForTEPayload).teGained, 0);
});
</script>

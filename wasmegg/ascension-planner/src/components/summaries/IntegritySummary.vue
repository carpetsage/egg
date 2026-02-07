<template>
  <div class="px-4 py-3 bg-blue-50 border-t border-blue-200 flex flex-wrap gap-x-6 gap-y-2 items-center">
    <!-- Title and TE Badge -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-blue-800 font-medium">Integrity Summary</span>
      <span v-if="teGained > 0" class="flex items-center gap-1 text-xs text-blue-700 bg-blue-200 px-1.5 py-0.5 rounded">
        +{{ teGained }}
        <img :src="iconURL('egginc/egg_truth.png', 32)" class="w-3.5 h-3.5" alt="TE" />
      </span>
    </div>

    <!-- Hab Summary -->
    <div class="flex items-center gap-4 text-xs">
      <div class="flex items-center gap-1.5 text-blue-700">
        <span v-if="isMaxHabs" class="font-bold">Max Habs</span>
        <span v-else class="font-medium">{{ habSummaryText }}</span>
      </div>
      
      <div class="w-px h-3 bg-blue-300"></div>

      <div class="flex items-center gap-1.5 text-blue-700">
        <span class="opacity-80">Hab Cap:</span>
        <span class="font-bold">{{ formattedHabCap }}</span>
      </div>
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
  headerAction: Action;
  actions: Action[];
}>();

/**
 * Get the final state.
 */
const finalState = computed(() => {
  if (props.actions.length > 0) {
    return props.actions[props.actions.length - 1].endState;
  }
  return props.headerAction.endState;
});

/**
 * Check if we have 4 Chicken Universes (ID 18).
 */
const isMaxHabs = computed(() => {
  if (!finalState.value) return false;
  const habIds = finalState.value.habIds;
  return habIds.filter(id => id === 18).length === 4;
});

/**
 * Grouped hab names summary or "No habs".
 */
const habSummaryText = computed(() => {
  if (!finalState.value) return 'No habs';
  const habIds = finalState.value.habIds;
  const activeHabs = habIds.filter((id): id is number => id !== null);

  if (activeHabs.length === 0) return 'No habs';

  const counts = new Map<string, number>();
  
  for (const id of activeHabs) {
    const hab = getHabById(id as HabId);
    if (hab) {
      const count = counts.get(hab.name) || 0;
      counts.set(hab.name, count + 1);
    }
  }

  // Sort by count descending
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  
  return sorted.map(([name, count]) => `${count}x ${name}`).join(', ');
});

/**
 * Formatted hab capacity.
 */
const formattedHabCap = computed(() => {
  return formatNumber(finalState.value?.habCapacity ?? 0, 3);
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

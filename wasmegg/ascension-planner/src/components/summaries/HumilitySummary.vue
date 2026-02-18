<template>
  <div class="px-4 py-3 bg-green-50 border-t border-green-200 flex flex-wrap gap-x-6 gap-y-2 items-center">
    <!-- Title and TE Badge -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-green-800 font-medium">Humility Summary</span>
      <span v-if="teGained > 0" class="flex items-center gap-1 text-xs text-green-700 bg-green-200 px-1.5 py-0.5 rounded" title="Truth Eggs gained in this period">
        +{{ teGained }}
        <img :src="iconURL('egginc/egg_truth.png', 32)" class="w-3.5 h-3.5" alt="TE" />
      </span>
    </div>

    <!-- Rockets Summary -->
    <div class="flex items-center gap-4 text-xs">
      <div v-if="shipsSent > 0" class="flex items-center gap-1.5 text-green-700">
        <span class="font-bold">{{ shipsSent }}</span>
        <span class="opacity-80">{{ shipsSent === 1 ? 'Ship' : 'Ships' }} Sent</span>
      </div>

      <div v-if="shipsSent > 0 && totalMissionTimeSeconds > 0" class="w-px h-3 bg-green-300"></div>

      <div v-if="totalMissionTimeSeconds > 0" class="flex items-center gap-1.5 text-green-700">
        <span class="opacity-80">Total Mission Time:</span>
        <span class="font-bold">{{ formattedMissionTime }}</span>
      </div>
      
      <div v-if="shipsSent === 0 && teGained === 0" class="text-xs text-green-600 italic">
        No missions launched or TE gained
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { iconURL } from 'lib';
import type { Action, LaunchMissionsPayload, WaitForTEPayload } from '@/types';
import { formatDuration } from '@/lib/format';

const props = defineProps<{
  headerAction: Action;
  actions: Action[];
}>();

/**
 * Calculate total missions launched in this period.
 */
const shipsSent = computed(() => {
  return props.actions
    .filter(a => a.type === 'launch_missions')
    .reduce((sum, a) => sum + (a.payload as LaunchMissionsPayload).totalMissions, 0);
});

/**
 * Calculate total mission time planned/waited for during this period.
 * This includes time spent launching missions.
 */
const totalMissionTimeSeconds = computed(() => {
  return props.actions
    .filter(a => a.type === 'launch_missions')
    .reduce((sum, a) => sum + (a.payload as LaunchMissionsPayload).totalTimeSeconds, 0);
});

/**
 * Format the mission time.
 */
const formattedMissionTime = computed(() => {
  return formatDuration(totalMissionTimeSeconds.value);
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

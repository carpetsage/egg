<template>
  <div class="px-5 py-4 bg-slate-50/30 border-t border-slate-100/50">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <!-- Label and TE Badge -->
      <div class="flex items-center gap-3">
        <div class="w-5 h-5 rounded-lg bg-emerald-50 border border-emerald-100 shadow-sm flex items-center justify-center p-1">
          <svg class="w-full h-full text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Humility Summary</span>
        <div v-if="teGained > 0" class="badge-premium badge-success flex items-center gap-1 py-0.5 px-2 text-[10px]" title="Truth Eggs gained in this period">
          <span class="font-black">+{{ teGained }}</span>
          <img :src="iconURL('egginc/egg_truth.png', 32)" class="w-3 h-3 object-contain" alt="TE" />
        </div>
      </div>

      <!-- Stats Grid -->
      <div v-if="shipsSent > 0 || totalMissionTimeSeconds > 0" class="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div v-if="shipsSent > 0" class="flex flex-col items-end">
          <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Mission(s)</span>
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-mono-premium font-black text-slate-900">{{ shipsSent }}</span>
          </div>
        </div>

        <div v-if="totalMissionTimeSeconds > 0" class="flex flex-col items-end">
          <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Time Planned</span>
          <span class="text-sm font-mono-premium font-black text-slate-900">{{ formattedMissionTime }}</span>
        </div>
      </div>

      <div v-else class="text-[11px] text-slate-400 italic font-medium">
        No missions launched or TE gained in this shift
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

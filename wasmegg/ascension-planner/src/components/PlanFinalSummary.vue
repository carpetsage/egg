<template>
  <div
    v-if="hasData"
    class="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] transition-all duration-300"
  >
    <div class="max-w-6xl mx-auto px-6 py-3 flex flex-wrap justify-between items-center gap-4">
      <!-- Start Date -->
      <div class="flex flex-col">
        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Start Date</span>
        <span class="text-sm font-medium text-gray-900">{{ formatDateTime(startDate) }}</span>
      </div>

      <!-- Duration -->
      <div class="flex flex-col">
        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Duration</span>
        <span class="text-sm font-mono font-bold text-blue-600">{{ formattedDuration }}</span>
      </div>

      <!-- End Date -->
      <div class="flex flex-col">
        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500">End Date</span>
        <span class="text-sm font-medium text-gray-900">{{ formatDateTime(endDate) }}</span>
      </div>

      <div class="flex flex-col">
        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Shifts</span>
        <div class="flex items-center gap-1.5">
          <span class="text-sm font-mono font-bold text-purple-600">{{ shiftCount }}</span>
          <span v-if="totalShiftCost > 0" class="text-xs text-gray-400 font-medium whitespace-nowrap">
            ({{ formatNumber(totalShiftCost, 3) }} SE <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3 h-3 inline-block -mt-1" alt="SE" />)
          </span>
        </div>
      </div>

      <!-- TE Gained -->
      <div class="flex flex-col">
        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500">TE Gained</span>
        <div class="flex items-center gap-1">
          <span class="text-sm font-mono font-bold text-emerald-600">+{{ teGained }}</span>
          <span class="text-xs text-gray-400 font-medium">(Total: {{ currentTE }})</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useActionsStore } from '@/stores/actions';
import { useInitialStateStore } from '@/stores/initialState';
import { useVirtueStore } from '@/stores/virtue';

import { countTEThresholdsPassed } from '@/lib/truthEggs';
import { formatNumber } from '@/lib/format';
import { iconURL } from 'lib';

const actionsStore = useActionsStore();
const initialStateStore = useInitialStateStore();
const virtueStore = useVirtueStore();

const hasData = computed(() => initialStateStore.hasData);

const calculateTotalPotentialTE = (snapshot: any) => {
  if (!snapshot || !snapshot.eggsDelivered) return 0;
  return Object.values(snapshot.eggsDelivered).reduce((sum: number, delivered: any) => {
    return sum + countTEThresholdsPassed(delivered as number);
  }, 0);
};

const startDate = computed(() => {
  // lastBackupTime is in seconds
  return new Date(initialStateStore.lastBackupTime * 1000);
});

const totalDurationSeconds = computed(() => {
  return actionsStore.actions.reduce((sum, action) => {
    const payload = action.payload as any;
    return sum + (payload.timeSeconds || 0);
  }, 0);
});

const formattedDuration = computed(() => {
  const seconds = totalDurationSeconds.value;
  if (seconds === 0) return '0s';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m${secs}s`;
  }

  return `${secs}s`;
});

const endDate = computed(() => {
  return new Date(startDate.value.getTime() + totalDurationSeconds.value * 1000);
});

const shiftCount = computed(() => {
  return actionsStore.actions.filter(a => a.type === 'shift').length;
});

const totalShiftCost = computed(() => {
  return actionsStore.actions
    .filter(a => a.type === 'shift')
    .reduce((sum, a) => sum + a.cost, 0);
});

const currentTE = computed(() => calculateTotalPotentialTE(actionsStore.currentSnapshot));
const initialClaimedTE = computed(() => virtueStore.initialTE);
const teGained = computed(() => currentTE.value - initialClaimedTE.value);

function formatDateTime(date: Date): string {
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
</script>

<style scoped>
/* Any specific styles if needed */
</style>

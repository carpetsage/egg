<template>
  <div
    v-if="actionsStore.hasStartAction"
    class="fixed right-4 top-20 z-50 flex flex-col items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-purple-100 transition-all duration-300"
    :class="[isCollapsed ? 'p-1.5' : 'p-3 min-w-[124px]']"
  >
    <!-- Toggle Handler (Unobtrusive) -->
    <button
      @click="isCollapsed = !isCollapsed"
      class="w-full flex flex-col items-center group/toggle transition-colors"
      :title="isCollapsed ? 'Expand Stats' : 'Collapse Stats'"
    >
      <!-- Chevron Indicator -->
      <div class="text-purple-300 group-hover/toggle:text-purple-500 transition-colors">
        <svg
          class="w-4 h-4 transition-transform duration-300"
          :class="{ 'rotate-180': isCollapsed }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <!-- Egg Icon (Always visible) -->
      <div
        class="bg-white rounded-full border border-purple-200 shadow-sm overflow-hidden transition-all duration-300"
        :class="[isCollapsed ? 'w-8 h-8 p-0.5' : 'w-10 h-10 p-1 mb-1 group-hover/toggle:scale-105']"
      >
        <img
          :src="iconURL(`egginc/egg_${currentEgg}.png`, 64)"
          class="w-full h-full object-contain"
          :alt="currentEgg"
        />
      </div>

      <!-- Shift Name (Visible when expanded) -->
      <div
        v-if="!isCollapsed"
        class="text-xl font-bold text-purple-900 leading-none mb-1"
      >
        {{ shiftName }}
      </div>
    </button>

    <!-- Collapsible Content -->
    <div v-if="!isCollapsed" class="flex flex-col items-center w-full transition-all">
      <!-- Shift Timing & Duration -->
      <div v-if="dates" class="flex flex-col items-center text-[10px] text-gray-400 font-medium leading-tight mb-2">
        <div>{{ formatDateTime(dates.start) }}</div>
        <div class="text-purple-600 font-bold text-xs my-0.5 tracking-tight">
          {{ formatShiftDuration(dates.duration) }}
        </div>
        <div>{{ formatDateTime(dates.end) }}</div>
      </div>

      <!-- Active Set Badge -->
      <div
        v-if="activeSet"
        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2"
        :class="activeSet === 'earnings' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'"
      >
        {{ activeSet === 'earnings' ? 'Earnings' : 'ELR' }} Set
      </div>
      <div
        v-else
        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 bg-red-100 text-red-700"
      >
        No Active Set
      </div>

      <!-- Stats Stack -->
      <div class="flex flex-col gap-2 w-full text-xs">
        <!-- Habs -->
        <div class="flex flex-col items-center gap-0.5">
          <span class="text-gray-500 font-medium text-[10px] uppercase tracking-wide">Habs</span>
          <span class="font-mono text-gray-900">
            {{ formatNumber(habCapacity, 0) }}
          </span>
        </div>

        <div class="w-full border-t border-gray-100"></div>

        <!-- IHR -->
        <div class="flex flex-col items-center gap-0.5">
          <span class="text-gray-500 font-medium text-[10px] uppercase tracking-wide">IHR</span>
          <span class="font-mono text-gray-900">
            {{ formatNumber(offlineIhr) }}/min
          </span>
        </div>

        <div class="w-full border-t border-gray-100"></div>

        <!-- Lay Rate -->
        <div class="flex flex-col items-center gap-0.5">
          <span class="text-gray-500 font-medium text-[10px] uppercase tracking-wide">Lay Rate</span>
          <span class="font-mono text-gray-900 font-bold">
            {{ formatRate(layRateHr) }}
          </span>
        </div>

        <div class="w-full border-t border-gray-100"></div>

        <!-- Shipping -->
        <div class="flex flex-col items-center gap-0.5">
          <span class="text-gray-500 font-medium text-[10px] uppercase tracking-wide text-center">Shipping<br />Rate</span>
          <span class="font-mono text-gray-900" :class="{ 'text-red-600': isShippingLimited }">
            {{ formatRate(shippingHr) }}
          </span>
        </div>

        <div class="w-full border-t border-gray-100"></div>

        <!-- ELR -->
        <div class="flex flex-col items-center gap-0.5">
          <span class="text-gray-500 font-medium text-[10px] uppercase tracking-wide">ELR</span>
          <span class="font-mono text-gray-900 font-bold">
            {{ formatRate(elrHr) }}
          </span>
        </div>

        <div class="w-full border-t border-gray-100"></div>

        <!-- Offline Earnings -->
        <div class="flex flex-col items-center gap-0.5">
          <span class="text-gray-500 font-medium text-[10px] uppercase tracking-wide text-center">Offline<br />Earnings</span>
          <span class="font-mono text-gray-900">
            {{ formatMoney(offlineEarningsHr) }}
          </span>
        </div>
      </div>

      <!-- Details Button -->
      <button
        class="mt-2 text-purple-400 hover:text-purple-600 transition-colors p-1"
        title="View Full Details"
        @click="$emit('show-details')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { iconURL } from 'lib';
import { formatNumber } from '@/lib/format';
import { VIRTUE_EGG_NAMES } from '@/types';
import type { VirtueEgg, Action, StartAscensionPayload, ShiftPayload } from '@/types';

const emit = defineEmits(['show-details']);

const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();

const isCollapsed = ref(false);

// Get the effective snapshot (state at the end of the edited/current shift)
const snapshot = computed(() => actionsStore.effectiveSnapshot);

// Basic properties from snapshot
const currentEgg = computed(() => snapshot.value.currentEgg);
const activeSet = computed(() => snapshot.value.activeArtifactSet);
const habCapacity = computed(() => snapshot.value.habCapacity);
const offlineIhr = computed(() => snapshot.value.offlineIHR);

// Rates (assume per second based on types, converting to per hour)
const layRateHr = computed(() => snapshot.value.layRate * 3600);
const shippingHr = computed(() => snapshot.value.shippingCapacity * 3600);
const elrHr = computed(() => snapshot.value.elr * 3600);
const offlineEarningsHr = computed(() => snapshot.value.offlineEarnings * 3600);

// Logic: Shipping is limiting if Lay Rate > Shipping Capacity
const isShippingLimited = computed(() => snapshot.value.layRate > snapshot.value.shippingCapacity);

/**
 * Format large numbers with units (e.g. 1.23q/hr)
 */
function formatRate(rate: number): string {
  return `${formatNumber(rate)}/hr`;
}

/**
 * Format money (e.g. $1.23q/hr)
 */
function formatMoney(amount: number): string {
  return `${formatNumber(amount)}/hr`;
}

/**
 * Calculate the shift name (e.g. C1, H2) for the current state.
 */
const shiftName = computed(() => {
  const egg = currentEgg.value;
  const eggName = VIRTUE_EGG_NAMES[egg];
  const letter = eggName.charAt(0).toUpperCase();

  // Find the 'header' action for the current group
  let headerAction: Action | undefined;
  
  if (actionsStore.editingGroupId) {
    headerAction = actionsStore.getAction(actionsStore.editingGroupId);
  } else {
    // If not editing, find the last group header in the entire list
    const actions = actionsStore.actions;
    for (let i = actions.length - 1; i >= 0; i--) {
      if (actions[i].type === 'shift' || actions[i].type === 'start_ascension') {
        headerAction = actions[i];
        break;
      }
    }
  }

  if (!headerAction) return `${letter}1`; // Fallback

  // Count how many times we visited this egg up to (and including) this header action
  // We iterate through all actions, counting visits to 'egg'
  // A visit starts at 'start_ascension' (if initialEgg matches) or 'shift' (if toEgg matches)
  let count = 0;
  for (const action of actionsStore.actions) {
    if (action.type === 'start_ascension') {
      const payload = action.payload as StartAscensionPayload;
      if (payload.initialEgg === egg) count++;
    } else if (action.type === 'shift') {
      const payload = action.payload as ShiftPayload;
      if (payload.toEgg === egg) count++;
    }

    // Stop when we reach our target header
    if (action.id === headerAction.id) break;
  }

  return `${letter}${count || 1}`;
});

/**
 * Calculate the timing and duration for the current shift.
 */
const dates = computed(() => {
  const { ascensionDate, ascensionTime } = virtueStore;
  const dateTimeStr = `${ascensionDate}T${ascensionTime}:00`;
  let startTime: Date;
  try {
    startTime = new Date(dateTimeStr);
  } catch {
    startTime = new Date();
  }

  const actions = actionsStore.actions;
  
  // Find the 'header' action for the current group
  let headerIndex = -1;
  if (actionsStore.editingGroupId) {
    headerIndex = actions.findIndex(a => a.id === actionsStore.editingGroupId);
  } else {
    for (let i = actions.length - 1; i >= 0; i--) {
      if (actions[i].type === 'shift' || actions[i].type === 'start_ascension') {
        headerIndex = i;
        break;
      }
    }
  }

  if (headerIndex === -1) return null;

  // Cumulative time before this shift starts
  let timeBeforeShift = 0;
  for (let i = 0; i < headerIndex; i++) {
    timeBeforeShift += actions[i].totalTimeSeconds || 0;
  }

  // Find the end of this shift
  let nextShiftIndex = actions.findIndex((a, idx) => idx > headerIndex && a.type === 'shift');
  let endActionIndex = nextShiftIndex === -1 ? actions.length - 1 : nextShiftIndex - 1;

  let shiftDuration = 0;
  for (let i = headerIndex; i <= endActionIndex; i++) {
    shiftDuration += actions[i].totalTimeSeconds || 0;
  }

  const startMs = startTime.getTime() + timeBeforeShift * 1000;
  const endMs = startMs + shiftDuration * 1000;

  return {
    start: new Date(startMs),
    end: new Date(endMs),
    duration: shiftDuration,
  };
});

/**
 * Format date/time as: Feb 7, 9:14 PM
 */
function formatDateTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleString('en-US', options);
}

/**
 * Format duration as: 12d22h or 5h30m
 */
function formatShiftDuration(seconds: number): string {
  if (seconds <= 0) return '0m';

  const totalMinutes = Math.floor(seconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (totalDays > 0) {
    return `${totalDays}d${hours}h`;
  }
  if (totalHours > 0) {
    return `${totalHours}h${minutes}m`;
  }
  return `${totalMinutes}m`;
}
</script>

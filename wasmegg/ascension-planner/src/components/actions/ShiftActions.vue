<template>
  <div class="space-y-4">
    <!-- Current Shift Summary -->
    <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
      <div class="flex justify-between items-start mb-3">
        <div>
          <h4 class="text-sm font-medium text-gray-700">Current Shift Summary</h4>
          <p class="text-xs text-gray-500">Since {{ lastShiftLabel }}</p>
        </div>
        <span class="text-sm text-gray-500">
          Shifts: {{ virtueStore.shiftCount }}
          <span v-if="virtueStore.plannedShifts > 0" class="text-blue-600">
            (+{{ virtueStore.plannedShifts }} planned)
          </span>
        </span>
      </div>

      <!-- Time spent this shift -->
      <div class="bg-white rounded-lg p-3 border border-purple-100">
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-600">Time spent this shift:</span>
          <span class="text-lg font-bold text-purple-700">{{ timeSinceLastShiftFormatted }}</span>
        </div>
        <p class="text-xs text-gray-400 mt-1">
          Sum of save times for {{ actionsSinceLastShift }} action{{ actionsSinceLastShift !== 1 ? 's' : '' }}
        </p>
      </div>

      <!-- Current egg display -->
      <div class="flex items-center gap-3 p-3 bg-white rounded border border-gray-200 mt-3">
        <div
          class="w-12 h-12 flex-shrink-0 bg-gray-50 rounded-full border border-gray-100 p-1 flex items-center justify-center shadow-sm"
        >
          <img
            :src="iconURL(`egginc/egg_${virtueStore.currentEgg}.png`, 64)"
            class="w-full h-full object-contain"
            :alt="virtueStore.currentEgg"
          />
        </div>
        <div>
          <div class="font-bold text-gray-900">{{ VIRTUE_EGG_NAMES[virtueStore.currentEgg] }}</div>
          <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Current Phase</div>
        </div>
      </div>
    </div>

    <!-- Shift Options -->
    <div>
      <div class="flex justify-between items-center mb-3 ml-1">
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Shift to another egg</h4>
        <div class="flex items-center gap-1.5 opacity-80">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Next shift:</span>
          <div class="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
            <span class="text-xs font-bold text-gray-700">
              {{ formatNumber(nextShiftCostValue, 3) }}
            </span>
            <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3.5 h-3.5" alt="SE" />
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="egg in availableEggs"
          :key="egg"
          class="group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 shadow-sm"
          :class="egg === virtueStore.currentEgg
            ? 'border-gray-200 bg-gray-50/50 opacity-50 grayscale cursor-not-allowed'
            : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md hover:bg-blue-50/30'"
          :disabled="egg === virtueStore.currentEgg"
          @click="handleShift(egg)"
        >
          <div
            class="w-10 h-10 flex-shrink-0 bg-gray-50 rounded-full p-1 border border-gray-100 group-hover:bg-white transition-colors"
          >
            <img
              :src="iconURL(`egginc/egg_${egg}.png`, 64)"
              class="w-full h-full object-contain"
              :alt="egg"
            />
          </div>
          <div class="text-left overflow-hidden">
            <span class="block text-sm font-bold text-gray-800 truncate group-hover:text-blue-700 transition-colors">
              {{ VIRTUE_EGG_NAMES[egg] }}
            </span>
            <span class="block text-[10px] font-semibold text-gray-400 uppercase group-hover:text-blue-400 transition-colors">
              {{ eggActionLabel(egg) }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <div class="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
      <p class="text-[11px] text-blue-600 font-medium leading-relaxed">
        <span class="font-bold">Info:</span> Shifting costs <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3 h-3 inline-block -mt-1" alt="SE" /> Soul Eggs and increases your shift count.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { iconURL } from 'lib';
import { VIRTUE_EGG_NAMES, VIRTUE_EGGS, type VirtueEgg, generateActionId } from '@/types';
import { useVirtueStore } from '@/stores/virtue';
import { useActionsStore } from '@/stores/actions';
import { useInitialStateStore } from '@/stores/initialState';
import { computeDependencies } from '@/lib/actions/executor';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { shiftCost } from 'lib';
import { formatNumber } from '@/lib/format';

const virtueStore = useVirtueStore();
const actionsStore = useActionsStore();
const initialStateStore = useInitialStateStore();
const { prepareExecution, completeExecution } = useActionExecutor();

const availableEggs = VIRTUE_EGGS;

// Map egg to its action type
function eggActionLabel(egg: VirtueEgg): string {
  switch (egg) {
    case 'curiosity': return 'Research';
    case 'integrity': return 'Habs';
    case 'kindness': return 'Vehicles';
    case 'humility': return 'Artifacts';
    case 'resilience': return 'Silos';
  }
}

// Find the index of the last shift action (or start_ascension if no shifts)
const lastShiftIndex = computed(() => {
  for (let i = actionsStore.actions.length - 1; i >= 0; i--) {
    const action = actionsStore.actions[i];
    if (action.type === 'shift' || action.type === 'start_ascension') {
      return i;
    }
  }
  return 0;
});

// Label for what we're measuring from
const lastShiftLabel = computed(() => {
  const lastAction = actionsStore.actions[lastShiftIndex.value];
  if (lastAction?.type === 'start_ascension') {
    return 'start of ascension';
  }
  return 'last shift';
});

// Count of actions since last shift (excluding the shift/start itself)
const actionsSinceLastShift = computed(() => {
  return actionsStore.actions.length - lastShiftIndex.value - 1;
});

// Calculate total time since last shift
// This is the sum of (cost / previousOfflineEarnings) for each action since last shift
const timeSinceLastShiftSeconds = computed(() => {
  let totalSeconds = 0;
  const actions = actionsStore.actions;

  for (let i = lastShiftIndex.value + 1; i < actions.length; i++) {
    const action = actions[i];
    totalSeconds += (action.totalTimeSeconds || 0);
  }

  return totalSeconds;
});

// Format the time
const timeSinceLastShiftFormatted = computed(() => {
  const totalSeconds = timeSinceLastShiftSeconds.value;

  if (totalSeconds <= 0) return '0m';

  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 999) {
    return '>999d';
  }

  if (totalDays > 0) {
    const remainingHours = totalHours % 24;
    return `${totalDays}d ${remainingHours}h`;
  }

  if (totalHours > 0) {
    const remainingMinutes = totalMinutes % 60;
    return `${totalHours}h ${remainingMinutes}m`;
  }

  if (totalMinutes > 0) {
    return `${totalMinutes}m`;
  }

  return '<1m';
});

const nextShiftCostValue = computed(() => {
  return shiftCost(initialStateStore.soulEggs, virtueStore.shiftCount);
});

function handleShift(toEgg: VirtueEgg) {
  if (toEgg === virtueStore.currentEgg) return;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  // Calculate cost after store is prepared/synced
  const cost = nextShiftCostValue.value;

  const fromEgg = beforeSnapshot.currentEgg;
  const newShiftCount = beforeSnapshot.shiftCount + 1;

  // Compute dependencies (shift depends on previous shift or start_ascension)
  const dependencies = computeDependencies('shift', {
    fromEgg,
    toEgg,
    newShiftCount,
  }, actionsStore.actionsBeforeInsertion);

  // Apply the shift to the store
  virtueStore.shift(toEgg);

  // Complete execution
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'shift',
    payload: {
      fromEgg,
      toEgg,
      newShiftCount,
    },
    cost,
    dependsOn: dependencies,
  }, beforeSnapshot);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Current Shift Summary -->
    <div class="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 rounded-2xl p-6 border border-indigo-100/50 shadow-sm relative overflow-hidden">
      <!-- Decorative background element -->
      <div class="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
      
      <div class="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Shift Progress</h4>
          <p class="text-[11px] font-medium text-slate-500">Since {{ lastShiftLabel }}</p>
        </div>
        <div class="badge-premium bg-white border-slate-100 shadow-sm px-3 py-1 flex items-center gap-2">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shifts:</span>
          <span class="text-sm font-mono-premium font-black text-slate-900">{{ virtueStore.shiftCount }}</span>
          <span v-if="virtueStore.plannedShifts > 0" class="text-[10px] font-bold text-brand-primary">
            +{{ virtueStore.plannedShifts }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
        <!-- Time spent this shift -->
        <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-indigo-50 shadow-inner">
          <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Duration</div>
          <div class="flex items-center gap-2">
            <span class="text-lg font-mono-premium font-black text-slate-900">{{ timeSinceLastShiftFormatted }}</span>
            <div class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></div>
          </div>
          <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1 opacity-60">
            {{ actionsSinceLastShift }} action{{ actionsSinceLastShift !== 1 ? 's' : '' }} recorded
          </p>
        </div>

        <!-- Current phase display -->
        <div class="bg-slate-900/5 backdrop-blur-sm rounded-2xl p-4 border border-slate-900/5 shadow-inner flex items-center gap-4">
          <div class="w-12 h-12 flex-shrink-0 bg-white rounded-2xl border border-slate-200/50 p-2 shadow-sm">
            <img
              :src="iconURL(`egginc/egg_${virtueStore.currentEgg}.png`, 64)"
              class="w-full h-full object-contain"
              :alt="virtueStore.currentEgg"
            />
          </div>
          <div>
            <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Phase</div>
            <div class="text-sm font-black text-slate-900 uppercase tracking-tight">{{ VIRTUE_EGG_NAMES[virtueStore.currentEgg] }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Shift Options -->
    <div>
      <div class="flex justify-between items-center mb-4 px-2">
        <h4 class="text-[10px] font-black text-slate-400 tracking-[0.2em]">Select Target Egg</h4>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Next Cost:</span>
          <div class="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 shadow-sm">
            <span class="text-xs font-mono-premium font-black text-slate-900">
              {{ formatNumber(nextShiftCostValue, 3) }}
            </span>
            <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3.5 h-3.5" alt="SE" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <button
          v-for="egg in availableEggs"
          :key="egg"
          class="group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden"
          :class="egg === virtueStore.currentEgg
            ? 'border-slate-100 bg-slate-50/50 opacity-40 grayscale cursor-not-allowed'
            : 'border-slate-100 bg-white hover:border-brand-primary/30 hover:shadow-lg hover:shadow-brand-primary/5 hover:-translate-y-0.5'"
          :disabled="egg === virtueStore.currentEgg"
          @click="handleShift(egg)"
        >
          <!-- Hover background glow -->
          <div v-if="egg !== virtueStore.currentEgg" class="absolute -right-4 -bottom-4 w-12 h-12 bg-brand-primary/5 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>

          <div
            class="w-12 h-12 flex-shrink-0 bg-slate-50 rounded-2xl p-2 border border-slate-100 group-hover:bg-white transition-all group-hover:scale-110 shadow-sm"
          >
            <img
              :src="iconURL(`egginc/egg_${egg}.png`, 64)"
              class="w-full h-full object-contain"
              :alt="egg"
            />
          </div>
          <div class="text-left overflow-hidden relative z-10">
            <span class="block text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-brand-primary transition-colors">
              {{ VIRTUE_EGG_NAMES[egg] }}
            </span>
            <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
              {{ eggActionLabel(egg) }}
            </span>
          </div>
        </button>
      </div>
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
import { formatNumber, formatDuration } from '@/lib/format';

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
  return formatDuration(timeSinceLastShiftSeconds.value);
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
  }, actionsStore.actionsBeforeInsertion, actionsStore.initialSnapshot.researchLevels);

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

  // Auto-activate relevant sales for the new egg
  actionsStore.pushRelevantEvents(toEgg);
}
</script>

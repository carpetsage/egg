<template>
  <div class="space-y-6">
    <div class="section-premium p-8 max-w-4xl mx-auto mt-4 relative overflow-hidden">
      <!-- Decorative background -->
      <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>

      <div class="relative z-10">
        <div class="flex items-center gap-4 mb-8">
          <div
            class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight">Auto-AP</h2>
          </div>
        </div>

        <div class="space-y-8">
          <!-- Section 1: Initial State -->
          <div class="space-y-8">
            <!-- Part 1: Scheduling (Top) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                <div class="flex gap-3">
                  <input
                    v-model="startDate"
                    @change="clearA1DateGoal"
                    type="date"
                    :min="formatUnixToDateInput(Date.now() / 1000 - 86400 * 7, timezone)"
                    class="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                  />
                  <input
                    v-model="startTime"
                    @change="clearA1DateGoal"
                    type="time"
                    class="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Timezone</label>
                <div class="relative">
                  <select
                    v-model="timezone"
                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50 focus:bg-white appearance-none transition-all"
                  >
                    <option v-for="tz in allTimezones" :key="tz.value" :value="tz.value">
                      {{ tz.label }}
                    </option>
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Part 2: Virtue Progress -->
            <div class="space-y-6">
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">Virtue Progress</h2>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-[10px] font-black text-indigo-500 uppercase">{{ currentTE }} TE Total</span>
                      <span v-if="truthEggsStore.totalPendingTE > 0" class="text-[10px] font-black text-emerald-500 uppercase">+{{ truthEggsStore.totalPendingTE }} Pending</span>
                    </div>
                  </div>
                </div>
                <button 
                  v-if="truthEggsStore.hasPendingTE"
                  @click="rollUpPendingTE"
                  class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md shadow-emerald-100 flex items-center gap-2 active:scale-95"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Roll Up Pending
                </button>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div v-for="egg in VIRTUE_TE_ORDER" :key="egg" class="relative group">
                  <div class="bg-slate-50 border border-slate-100 rounded-xl p-3 group-hover:border-indigo-100 group-hover:bg-slate-50/80 transition-all duration-300">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <img :src="iconURL(`egginc/egg_${egg}.png`, 64)" class="w-4 h-4 object-contain grayscale group-hover:grayscale-0 transition-all" />
                        <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{{ VIRTUE_EGG_NAMES[egg] }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="relative flex-grow">
                        <input
                          type="number"
                          :value="truthEggsStore.teEarned[egg]"
                          min="0"
                          max="98"
                          class="w-full bg-white/50 border border-slate-100 rounded-lg px-3 py-1.5 text-[11px] font-mono-premium font-black text-slate-900 outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                          @change="handleTEEarnedChange(egg, ($event.target as HTMLInputElement).value)"
                          @keydown.enter="($event.target as HTMLInputElement).blur()"
                        />
                      </div>
                      <div v-if="truthEggsStore.pendingTEForEgg(egg) > 0" 
                           class="flex flex-col items-center justify-center bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 min-w-[44px]">
                        <span class="text-[9px] font-black text-emerald-600">+{{ truthEggsStore.pendingTEForEgg(egg) }}</span>
                        <span class="text-[5px] font-black text-emerald-400 uppercase leading-none">Pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Part 3: Target Goal -->
            <div class="section-premium p-6 border-dashed border-2 border-indigo-200 bg-indigo-50/10">
              <div class="flex items-center gap-3 mb-4 px-1">
                <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider">Target Goal</h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div class="md:col-span-2 space-y-1.5">
                  <div class="flex justify-between items-center px-1">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target TE</label>
                    <span class="text-[9px] font-black text-indigo-500 uppercase">+{{ Math.max(0, targetTE - currentTE) }} to gain</span>
                  </div>
                  <div class="relative">
                    <input
                      v-model.number="targetTE"
                      @input="clearA1DateGoal"
                      type="number"
                      class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-900 outline-none focus:border-indigo-500/50 transition-all pr-10"
                      :min="currentTE + 1"
                      max="490"
                    />
                    <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">TE</div>
                  </div>
                </div>

                <div class="flex items-center justify-center pb-2.5 text-[10px] font-black text-slate-300 uppercase">
                  — or —
                </div>

                <div class="md:col-span-3 space-y-1.5">
                  <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date & Time</label>
                  <div class="flex gap-2">
                    <input
                      v-model="targetEndDate"
                      @change="clearA1TEGoal"
                      type="date"
                      :min="startDate"
                      class="flex-grow bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500/50 transition-all"
                    />
                    <input
                      v-model="targetEndTime"
                      @change="clearA1TEGoal"
                      type="time"
                      class="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          class="btn-premium btn-primary w-full py-4 mt-8 text-sm shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
          :disabled="isGenerating || !isA1Dirty"
          @click="ascensionChain.length > 0 ? updateAscension(0, { te: targetTE, date: targetEndDate, time: targetEndTime }) : generate()"
        >
          <span v-if="isGenerating">Generating Plan...</span>
          <span v-else>{{ ascensionChain.length > 0 ? 'Update A1' : 'Generate A1' }}</span>
        </button>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="ascensionChain.length > 0" class="max-w-5xl mx-auto space-y-12 pb-24">
      <div class="flex justify-between items-center px-4">
        <h2 class="text-lg font-black text-slate-800 uppercase tracking-tight">Generated Roadmap</h2>
        <button 
          @click="exportCurrentPlan"
          class="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Plan
        </button>
      </div>

      <div v-for="(result, idx) in bestResults" :key="idx" class="space-y-8">
        <div v-if="idx > 0 && idx === ascensionChain.length - 1" class="flex justify-end -mb-6 pr-1 relative z-30">
          <button 
            @click="removeLastAscension"
            class="group flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm active:scale-95"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove A{{ idx + 1 }}
          </button>
        </div>
        <AscensionOverview 
          :summary="result.summary" 
          :actions="result.actions"
        />

        <!-- Simplified Goal Input -->
        <div v-if="result.summary.endTE < 490" 
             class="section-premium p-6 max-w-2xl mx-auto border-dashed border-2 border-indigo-200 bg-indigo-50/10">
          <div class="flex items-center gap-3 mb-4 px-1">
            <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider">
              {{ idx + 1 < ascensionChain.length ? `Edit A${idx + 2} Goal` : 'Next Ascension Goal' }}
            </h3>
          </div>

          <div v-if="nextGoals[idx + 1]" class="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div class="md:col-span-2 space-y-1.5">
              <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target TE</label>
              <div class="relative">
                <input
                  v-model.number="nextGoals[idx + 1].te"
                  @input="clearSequentialDateGoal(idx + 1)"
                  type="number"
                  class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-900 outline-none focus:border-indigo-500/50 transition-all pr-10"
                  :min="result.summary.endTE + 1"
                  max="490"
                  placeholder="Auto"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">TE</div>
              </div>
            </div>

            <div class="flex items-center justify-center pb-2.5 text-[10px] font-black text-slate-300 uppercase">
              — or —
            </div>

            <div class="md:col-span-3 space-y-1.5">
              <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date & Time</label>
              <div class="flex gap-2">
                <input
                  v-model="nextGoals[idx + 1].date"
                  @change="clearSequentialTEGoal(idx + 1)"
                  type="date"
                  :min="formatUnixToDateInput(result.summary.endTime, timezone)"
                  class="flex-grow bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500/50 transition-all"
                />
                <input
                  v-model="nextGoals[idx + 1].time"
                  @change="clearSequentialTEGoal(idx + 1)"
                  type="time"
                  class="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            class="btn-premium btn-primary w-full py-3 mt-6 text-xs shadow-lg active:scale-[0.98]"
            :disabled="isGenerating || !isSequentialDirty(idx + 1)"
            @click="handleNextGoalSubmit(idx + 1)"
          >
            <span v-if="isGenerating">Simulating...</span>
            <span v-else-if="idx + 1 < ascensionChain.length">Update A{{ idx + 2 }} →</span>
            <span v-else>Generate A{{ idx + 2 }} →</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { useAutoPlannerStore } from '@/stores/autoPlanner';
import { iconURL } from 'lib';
import { formatNumber, parseNumber, formatUnixToDateInput, formatUnixToTimeInput } from '@/lib/format';
import { useTruthEggsStore, VIRTUE_TE_ORDER } from '@/stores/truthEggs';
import { VIRTUE_EGG_NAMES } from '@/types';
import { countTEThresholdsPassed } from '@/lib/truthEggs';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import { computeSnapshot } from '@/engine/compute';
import { getLocalTimestampInTimezone } from '@/lib/events';
import { runAscension, runUntilShift, deriveNextStartState } from '@/auto/ascension';
import { getNextSaleEnd } from '@/auto/calendar';
import { rollUpPendingTE } from '@/lib/modes';
import type { AscensionSummary } from '@/auto/types';
import type { Action } from '@/types/actions/meta';
import AscensionOverview from './AscensionOverview.vue';
import { triggerPlanExport, type ExportedPlan } from '@/auto/export';

interface ChainedAscension {
  index: number;
  result1: { summary: AscensionSummary; actions: Action[] };
  result2: { summary: AscensionSummary; actions: Action[] };
  goal: {
    type: 'te' | 'date';
    te: number | null;
    date: string;
    time: string;
  };
  // For A1, we also track initial parameters
  initialParams?: {
    startDate: string;
    startTime: string;
    teEarned: Record<string, number>;
  }
}

const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();
const truthEggsStore = useTruthEggsStore();
const autoPlannerStore = useAutoPlannerStore();

const { 
  ascensionChain, 
  timezone, 
  startDate, 
  startTime, 
  targetTE, 
  targetEndDate, 
  targetEndTime, 
  nextGoals 
} = storeToRefs(autoPlannerStore);

// Initialize default values if not already set (e.g. from an import)
if (targetTE.value === null) {
  targetTE.value = 490;
}
if (!timezone.value) {
  timezone.value = virtueStore.ascensionTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Initialize Target TE to Current + 30 once data is loaded
let targetTEInitialized = false;
watch(() => truthEggsStore.totalTE, (newVal) => {
  if (newVal > 0 && !targetTEInitialized) {
    targetTE.value = Math.min(490, newVal + 30);
    targetTEInitialized = true;
  }
}, { immediate: true });

const now = new Date();
// Use en-CA to get YYYY-MM-DD format in the selected timezone (avoiding UTC shift issues from toISOString)
if (!startDate.value) {
  startDate.value = new Intl.DateTimeFormat('en-CA', { timeZone: timezone.value }).format(now);
}
if (!startTime.value) {
  startTime.value = new Intl.DateTimeFormat('en-GB', { 
    timeZone: timezone.value, 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  }).format(now);
}
// targetEndDate and targetEndTime moved to store

const clearA1DateGoal = () => {
  targetEndDate.value = '';
  targetEndTime.value = '';
};

const clearA1TEGoal = () => {
  targetTE.value = null;
};

const clearSequentialDateGoal = (idx: number) => {
  nextGoals.value[idx].date = '';
  nextGoals.value[idx].time = '';
};

const clearSequentialTEGoal = (idx: number) => {
  nextGoals.value[idx].te = null;
};

const isGenerating = ref(false);

// (ascensionChain and nextGoals are now from the store)

const handleDeliveredChange = (egg: import('@/types').VirtueEgg, value: string) => {
  const parsed = parseNumber(value);
  if (parsed !== null && !isNaN(parsed)) {
    truthEggsStore.setEggsDeliveredWithSync(egg, parsed);
    syncTEAcrossStores(egg);
  }
};
const removeLastAscension = () => {
  if (ascensionChain.value.length > 1) {
    ascensionChain.value.pop();
  }
};

const handleTEEarnedChange = (egg: import('@/types').VirtueEgg, value: string) => {
  const count = parseInt(value);
  if (!isNaN(count)) {
    truthEggsStore.setTEEarnedWithSync(egg, count);
    syncTEAcrossStores(egg);
  }
};

const syncTEAcrossStores = async (egg: import('@/types').VirtueEgg) => {
  // Update initialStateStore
  initialStateStore.setInitialEggsDelivered(egg, truthEggsStore.eggsDelivered[egg]);
  initialStateStore.setInitialTeEarned(egg, truthEggsStore.teEarned[egg]);
  
  // Recalculate pending for this egg
  const theoreticalTE = countTEThresholdsPassed(truthEggsStore.eggsDelivered[egg]);
  initialStateStore.setInitialTePending(egg, Math.max(0, theoreticalTE - truthEggsStore.teEarned[egg]));
  
  // Update virtueStore
  const total = truthEggsStore.totalTE;
  virtueStore.setInitialTE(total);
  virtueStore.setTE(total);

  // Sync to Actions Store so currentTE and simulation stay updated
  const context = getSimulationContext();
  const baseState = createBaseEngineState(null);
  const initialSnapshot = computeSnapshot(baseState, context);
  await actionsStore.setInitialSnapshot(initialSnapshot);
};

const currentTE = computed(() => {
  const snapshot = actionsStore.effectiveSnapshot;
  if (!snapshot || !snapshot.teEarned) return 0;
  return Object.values(snapshot.teEarned).reduce((a, b) => a + b, 0);
});

const isA1Dirty = computed(() => {
  if (ascensionChain.value.length === 0) return true;
  const last = ascensionChain.value[0];
  if (!last.initialParams) return true;

  const initialParamsDirty = (
    startDate.value !== last.initialParams.startDate ||
    startTime.value !== last.initialParams.startTime ||
    JSON.stringify(truthEggsStore.teEarned) !== JSON.stringify(last.initialParams.teEarned)
  );

  if (initialParamsDirty) return true;

  if (last.goal.type === 'te') {
    return targetTE.value !== last.goal.te;
  } else {
    return targetEndDate.value !== last.goal.date || targetEndTime.value !== last.goal.time;
  }
});

const isSequentialDirty = (idx: number) => {
  if (idx >= ascensionChain.value.length) return true; // Generate button for new step
  const current = ascensionChain.value[idx];
  const goal = nextGoals.value[idx];
  
  if (current.goal.type === 'te') {
    return goal.te !== current.goal.te;
  } else {
    return goal.date !== current.goal.date || goal.time !== current.goal.time;
  }
};

const bestResults = computed(() => {
  return ascensionChain.value.map(item => {
    const s1 = item.result1.summary;
    const s2 = item.result2.summary;
    
    const isS1Better = s1.totalDurationSeconds <= s2.totalDurationSeconds;
    const best = isS1Better ? item.result1 : item.result2;
    const other = isS1Better ? item.result2 : item.result1;
    
    const diffSeconds = Math.abs(s1.totalDurationSeconds - s2.totalDurationSeconds);
    const diffDays = diffSeconds / 86400;
    
    const cleanOtherLabel = `the ${other.summary.strategyLabel.replace(' build', '')} plan`;
    
    return {
      ...best,
      summary: {
        ...best.summary,
        comparison: {
          daysFaster: diffDays,
          otherPlanLabel: cleanOtherLabel
        }
      }
    };
  });
});




const allTimezones = computed(() => {
  try {
    const zones = Intl.supportedValuesOf('timeZone');
    return zones
      .map(tz => {
        const parts = tz.split('/');
        const city = parts[parts.length - 1].replace(/_/g, ' ');
        const region = parts.length > 1 ? parts[0] : '';
        return {
          value: tz,
          label: region ? `${city} (${region})` : city,
          region,
          city,
        };
      })
      .sort((a, b) => {
        if (a.region !== b.region) return a.region.localeCompare(b.region);
        return a.city.localeCompare(b.city);
      });
  } catch {
    return [
      { value: 'America/Los_Angeles', label: 'Los Angeles (America)', region: 'America', city: 'Los Angeles' },
      { value: 'UTC', label: 'UTC', region: '', city: 'UTC' },
    ];
  }
});

// formatUnixToDateInput and formatUnixToTimeInput moved to @/lib/format

const generate = () => {
  isGenerating.value = true;

  // Use a setTimeout to allow the UI to update "isGenerating" state before blocking
  setTimeout(() => {
    try {
      // Roll up pending TE first (claimed at ascension start)
      rollUpPendingTE();
      
      const context = getSimulationContext();
      const baseState = createBaseEngineState(null);
      
      // Sync actions store so currentTE and UI reflect rolled-up state
      const initialSnapshot = computeSnapshot(baseState, context);
      actionsStore.setInitialSnapshot(initialSnapshot);

      // Force Curiosity and 1 chicken for C1 start
      baseState.currentEgg = 'curiosity';
      baseState.population = 1;
      baseState.bankValue = 0;
      baseState.researchLevels = {}; // Start with no common research

      console.log(`Starting Simulation with rolled-up TE: ${baseState.te}`);

      const absStartTime = getLocalTimestampInTimezone(startDate.value, startTime.value, timezone.value);
      context.ascensionStartTime = absStartTime;
      context.planStartOffset = 0;

      const buildPhaseEnd1 = getNextSaleEnd(absStartTime);
      const buildPhaseEnd2 = getNextSaleEnd(buildPhaseEnd1 + 1);

      // Precompute C1 through R1 since they are identical
      const precomputed = runUntilShift(baseState, context, 'C3');

      const resumeData1 = {
        actions: precomputed.actions,
        state: precomputed.state,
        elapsedSeconds: precomputed.elapsedSeconds,
        resumeShiftName: 'C3'
      };

      const t0 = performance.now();
      
      let finalTargetTE: number | undefined = (targetTE.value !== null && targetTE.value !== undefined && targetTE.value > 0) ? targetTE.value : undefined;
      let finalEndTime: number | undefined = undefined;
      
      if (!finalTargetTE && targetEndDate.value) {
        const timeToUse = targetEndTime.value || '09:00';
        finalEndTime = getLocalTimestampInTimezone(targetEndDate.value, timeToUse, timezone.value);
      }

      const result1 = runAscension(baseState, context, buildPhaseEnd1, absStartTime, 'asc_0', null, 0, finalTargetTE, finalEndTime, resumeData1);

      // We must pass a deep copy or fresh state for result2 so it doesn't mutate result1's objects
      const baseState2 = createBaseEngineState(null);
      baseState2.currentEgg = 'curiosity';
      baseState2.population = 1;
      baseState2.bankValue = 0;
      baseState2.researchLevels = {};
      const context2 = getSimulationContext();
      context2.ascensionStartTime = absStartTime;
      context2.planStartOffset = 0;

      // Deep copy precomputed state/actions for result2
      const resumeData2 = {
        actions: JSON.parse(JSON.stringify(precomputed.actions)),
        state: JSON.parse(JSON.stringify(precomputed.state)),
        elapsedSeconds: precomputed.elapsedSeconds,
        resumeShiftName: 'C3'
      };

      const result2 = runAscension(baseState2, context2, buildPhaseEnd2, absStartTime, 'asc_0', null, 0, finalTargetTE, finalEndTime, resumeData2);

      const t1 = performance.now();

      // Prepare goal state for A2
      const best = result1.summary.totalDurationSeconds <= result2.summary.totalDurationSeconds ? result1 : result2;
      
      const goalToSave = {
        type: (finalTargetTE ? 'te' : 'date') as 'te' | 'date',
        te: targetTE.value,
        date: targetEndDate.value,
        time: targetEndTime.value
      };
      const initialParamsToSave = {
        startDate: startDate.value,
        startTime: startTime.value,
        teEarned: { ...truthEggsStore.teEarned }
      };

      // Update A1 form results
      targetEndDate.value = formatUnixToDateInput(best.summary.endTime, timezone.value);
      targetEndTime.value = formatUnixToTimeInput(best.summary.endTime, timezone.value);
      targetTE.value = best.summary.endTE;

      nextGoals.value[1] = {
        te: Math.min(490, best.summary.endTE + 30),
        date: '',
        time: ''
      };

      ascensionChain.value = [{
        index: 0,
        result1,
        result2,
        goal: goalToSave,
        initialParams: initialParamsToSave
      }];
    } finally {
      isGenerating.value = false;
    }
  }, 10);
};

const handleNextGoalSubmit = (idx: number) => {
  const goal = nextGoals.value[idx];
  if (idx === ascensionChain.value.length) {
    generateNext(goal);
  } else {
    updateAscension(idx, goal);
  }
};

const generateNext = (goal: { te: number | null, date: string, time: string }) => {
  if (ascensionChain.value.length === 0) return;
  isGenerating.value = true;

  setTimeout(() => {
    try {
      const idx = ascensionChain.value.length;
      const lastAsc = ascensionChain.value[idx - 1];
      const lastSummary = lastAsc.result1.summary.totalDurationSeconds <= lastAsc.result2.summary.totalDurationSeconds 
        ? lastAsc.result1.summary 
        : lastAsc.result2.summary;

      const baseBackupState = createBaseEngineState(null);
      const baseState = deriveNextStartState(lastSummary, baseBackupState);

      const context = getSimulationContext();
      const absStartTime = lastSummary.endTime;
      context.ascensionStartTime = absStartTime;
      context.planStartOffset = 0;

      const buildPhaseEnd1 = getNextSaleEnd(absStartTime);
      const buildPhaseEnd2 = getNextSaleEnd(buildPhaseEnd1 + 1);

      const precomputed = runUntilShift(baseState, context, 'C3');
      const resumeShiftName = 'C3';

      let finalTargetTE: number | undefined = goal.te || undefined;
      let targetEndTime: number | undefined = undefined;
      let goalType: 'te' | 'date' = goal.te ? 'te' : 'date';

      if (!finalTargetTE) {
        if (goal.date) {
          const timeToUse = goal.time || '09:00';
          targetEndTime = getLocalTimestampInTimezone(goal.date, timeToUse, timezone.value);
        } else {
          finalTargetTE = (lastSummary ? lastSummary.endTE : currentTE.value) + 30;
          goalType = 'te';
        }
      }

      const result1 = runAscension(baseState, context, buildPhaseEnd1, absStartTime, `asc_${idx}`, null, idx, finalTargetTE, targetEndTime, {
        actions: JSON.parse(JSON.stringify(precomputed.actions)),
        state: JSON.parse(JSON.stringify(precomputed.state)),
        elapsedSeconds: precomputed.elapsedSeconds,
        resumeShiftName
      });

      const baseState2 = JSON.parse(JSON.stringify(baseState));
      const context2 = getSimulationContext();
      context2.ascensionStartTime = absStartTime;
      context2.planStartOffset = 0;

      const result2 = runAscension(baseState2, context2, buildPhaseEnd2, absStartTime, `asc_${idx}`, null, idx, finalTargetTE, targetEndTime, {
        actions: JSON.parse(JSON.stringify(precomputed.actions)),
        state: JSON.parse(JSON.stringify(precomputed.state)),
        elapsedSeconds: precomputed.elapsedSeconds,
        resumeShiftName
      });

      // Prepare goal state for NEXT
      const best = result1.summary.totalDurationSeconds <= result2.summary.totalDurationSeconds ? result1 : result2;
      
      // Capture the goal state BEFORE back-populating results
      const goalToSave = {
        type: goalType,
        te: goal.te,
        date: goal.date,
        time: goal.time
      };

      // Back-populate the form we just submitted
      nextGoals.value[idx].date = formatUnixToDateInput(best.summary.endTime, timezone.value);
      nextGoals.value[idx].time = formatUnixToTimeInput(best.summary.endTime, timezone.value);
      nextGoals.value[idx].te = best.summary.endTE;

      nextGoals.value[idx + 1] = {
        te: Math.min(490, best.summary.endTE + 30),
        date: '',
        time: ''
      };

      ascensionChain.value.push({
        index: idx,
        result1,
        result2,
        goal: goalToSave
      });

    } finally {
      isGenerating.value = false;
    }
  }, 10);
};

const updateAscension = (idx: number, goal: { te: number | null, date: string, time: string }) => {
  isGenerating.value = true;
  
  setTimeout(() => {
    try {
      // 1. Resolve the goal for the edited step
      let finalTargetTE: number | undefined = goal.te || undefined;
      let finalEndTime: number | undefined = undefined;

      if (!finalTargetTE && goal.date) {
        const timeToUse = goal.time || '09:00';
        finalEndTime = getLocalTimestampInTimezone(goal.date, timeToUse, timezone.value);
      } else if (!finalTargetTE) {
        finalTargetTE = (idx === 0 ? currentTE.value : 0) + 30;
      }

      // 2. Update the goal state for the edited step
      ascensionChain.value[idx].goal = {
        type: finalTargetTE ? 'te' : 'date',
        te: goal.te,
        date: goal.date,
        time: goal.time
      };

      if (idx === 0) {
        ascensionChain.value[0].initialParams = {
          startDate: startDate.value,
          startTime: startTime.value,
          teEarned: { ...truthEggsStore.teEarned }
        };
      }

      for (let i = idx; i < ascensionChain.value.length; i++) {
        const prevSummary = i === 0 
          ? null // Should not happen for updateAscension as top form is separate for now
          : (ascensionChain.value[i-1].result1.summary.totalDurationSeconds <= ascensionChain.value[i-1].result2.summary.totalDurationSeconds 
              ? ascensionChain.value[i-1].result1.summary 
              : ascensionChain.value[i-1].result2.summary);

        const baseBackupState = createBaseEngineState(null);
        let baseState: any;
        let absStartTime: number;

        if (i === 0) {
          // A1 uses global start time
          absStartTime = getLocalTimestampInTimezone(startDate.value, startTime.value, timezone.value);
          baseState = createBaseEngineState(null);
          baseState.currentEgg = 'curiosity';
          baseState.population = 1;
          baseState.bankValue = 0;
          baseState.researchLevels = {};
        } else {
          baseState = deriveNextStartState(prevSummary!, baseBackupState);
          absStartTime = prevSummary!.endTime;
        }

        const context = getSimulationContext();
        context.ascensionStartTime = absStartTime;
        context.planStartOffset = 0;

        const buildPhaseEnd1 = getNextSaleEnd(absStartTime);
        const buildPhaseEnd2 = getNextSaleEnd(buildPhaseEnd1 + 1);

        const item = ascensionChain.value[i];
        let stepTargetTE: number | undefined = item.goal.te || undefined;
        let stepEndTime: number | undefined = undefined;

        if (!stepTargetTE && item.goal.date) {
          const timeToUse = item.goal.time || '09:00';
          stepEndTime = getLocalTimestampInTimezone(item.goal.date, timeToUse, timezone.value);
        } else if (!stepTargetTE) {
          // Fallback +30
          const currentTotal = i === 0 
            ? currentTE.value 
            : (ascensionChain.value[i-1].result1.summary.totalDurationSeconds <= ascensionChain.value[i-1].result2.summary.totalDurationSeconds 
                ? ascensionChain.value[i-1].result1.summary.endTE 
                : ascensionChain.value[i-1].result2.summary.endTE);
          stepTargetTE = currentTotal + 30;
        }
        
        const result1 = runAscension(baseState, context, buildPhaseEnd1, absStartTime, `asc_${i}`, null, i, stepTargetTE, stepEndTime);
        const result2 = runAscension(JSON.parse(JSON.stringify(baseState)), JSON.parse(JSON.stringify(context)), buildPhaseEnd2, absStartTime, `asc_${i}`, null, i, stepTargetTE, stepEndTime);

        ascensionChain.value[i].result1 = result1;
        ascensionChain.value[i].result2 = result2;

        // Back-populate the form for this step
        const best = result1.summary.totalDurationSeconds <= result2.summary.totalDurationSeconds ? result1 : result2;
        nextGoals.value[i].date = formatUnixToDateInput(best.summary.endTime, timezone.value);
        nextGoals.value[i].time = formatUnixToTimeInput(best.summary.endTime, timezone.value);
        nextGoals.value[i].te = best.summary.endTE;
      }

      // Update draft defaults
      const last = ascensionChain.value[ascensionChain.value.length - 1];
      const lastSummary = last.result1.summary.totalDurationSeconds <= last.result2.summary.totalDurationSeconds ? last.result1.summary : last.result2.summary;
      nextGoals.value[ascensionChain.value.length] = {
        te: Math.min(490, lastSummary.endTE + 30),
        date: '',
        time: ''
      };

    } finally {
      isGenerating.value = false;
    }
  }, 10);
};

const exportCurrentPlan = () => {
  if (ascensionChain.value.length === 0) return;
  
  const plan: ExportedPlan = {
    version: 1,
    exportedAt: new Date().toISOString(),
    startTime: getLocalTimestampInTimezone(startDate.value, startTime.value, timezone.value),
    timezone: timezone.value,
    initialState: {
      epicResearchLevels: { ...initialStateStore.epicResearchLevels },
      colleggtibleTiers: { ...initialStateStore.colleggtibleTiers },
      artifactLoadout: JSON.parse(JSON.stringify(initialStateStore.artifactLoadout)),
      soulEggs: initialStateStore.soulEggs,
      isUltra: initialStateStore.isUltra,
      initialTankLevel: initialStateStore.initialTankLevel,
      initialFuelAmounts: { ...initialStateStore.initialFuelAmounts },
      initialEggsDelivered: { ...initialStateStore.initialEggsDelivered },
      initialTeEarned: { ...initialStateStore.initialTeEarned },
    },
    ascensions: ascensionChain.value.map((item, idx) => ({
      index: idx,
      targetTE: item.goal.te || item.result1.summary.endTE,
      result1: item.result1,
      result2: item.result2,
      goal: item.goal
    }))
  };
  
  triggerPlanExport(plan);
};
</script>

<style scoped>
.btn-premium {
  @apply rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3;
}
.btn-primary {
  @apply bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed;
}
.section-premium {
  @apply bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700;
}
.animate-pulse-subtle {
  animation: pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.98); }
}
.font-mono-premium {
  font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
}
</style>

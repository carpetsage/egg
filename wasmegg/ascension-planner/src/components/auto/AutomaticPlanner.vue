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
          <div class="space-y-4">
            <!-- Virtue Progress Breakdown -->
            <div class="space-y-4">
              <div class="flex items-center justify-between px-1">
                <div>
                  <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Initial TE</h3>
                </div>
                <div class="flex items-center gap-3">
                  <div class="px-3 py-1 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm">
                    <span class="text-[11px] font-black text-indigo-600 uppercase">{{ currentTE }} TE Total</span>
                  </div>
                  <div v-if="truthEggsStore.totalPendingTE > 0" class="px-3 py-1 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm animate-pulse-subtle">
                    <span class="text-[11px] font-black text-emerald-600 uppercase">+{{ truthEggsStore.totalPendingTE }} Pending</span>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-2">
                <div v-for="egg in VIRTUE_TE_ORDER" :key="egg" 
                     class="group flex items-center gap-5 p-3.5 bg-slate-50/30 hover:bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 rounded-2xl transition-all duration-500">
                  <!-- Egg Column -->
                  <div class="flex items-center gap-3 min-w-[120px]">
                    <div class="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center p-1.5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                      <img :src="iconURL(`egginc/egg_${egg}.png`, 64)" class="w-full h-full object-contain" :alt="egg" />
                    </div>
                    <div class="text-[11px] font-black text-slate-700 uppercase tracking-tight">{{ VIRTUE_EGG_NAMES[egg] }}</div>
                  </div>
                  
                  <!-- Inputs Column -->
                  <div class="flex-grow grid grid-cols-2 gap-6 items-center">
                    <div class="flex flex-col gap-1">
                      <span class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Delivered</span>
                      <input 
                        type="text" 
                        :value="formatNumber(truthEggsStore.eggsDelivered[egg], 3)"
                        class="w-full bg-white/50 border border-slate-100 rounded-lg px-3 py-1.5 text-[11px] font-mono-premium font-black text-slate-900 outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                        @change="handleDeliveredChange(egg, ($event.target as HTMLInputElement).value)"
                        @keydown.enter="($event.target as HTMLInputElement).blur()"
                      />
                    </div>
                    
                    <div class="flex flex-col gap-1">
                      <span class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Earned TE</span>
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
            </div>

            <!-- Target Goal -->
            <div class="space-y-2.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target TE</label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div class="md:col-span-2 relative">
                  <input
                    v-model.number="targetTE"
                    type="number"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-mono-premium text-lg font-black text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all pr-12"
                    :min="currentTE + 1"
                    max="490"
                  />
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">/ 490</div>
                </div>
                <div class="flex flex-col justify-center h-[54px] px-1">
                  <div class="flex justify-between items-center">
                    <span class="text-[10px] font-bold text-slate-400 uppercase">Current: {{ currentTE }}</span>
                    <span class="text-[10px] font-black text-indigo-500 uppercase tracking-tight"
                      >+{{ Math.max(0, targetTE - currentTE) }} to gain</span
                    >
                  </div>
                  <div class="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      class="bg-indigo-500 h-full transition-all duration-1000" 
                      :style="{ width: `${(currentTE / targetTE) * 100}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Scheduling -->
          <div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                <div class="flex gap-3">
                  <input
                    v-model="startDate"
                    type="date"
                    class="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                  />
                  <input
                    v-model="startTime"
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
          </div>
        </div>
        <button
          class="btn-premium btn-primary w-full py-4 mt-8 text-sm shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
          :disabled="isGenerating"
          @click="generate"
        >
          <span v-if="isGenerating">Generating Plan...</span>
          <span v-else>Generate A1</span>
        </button>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="ascensionChain.length > 0" class="max-w-5xl mx-auto space-y-12 pb-24">
      <div v-for="(result, idx) in bestResults" :key="idx" class="space-y-8">
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

          <div class="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div class="md:col-span-2 space-y-1.5">
              <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target TE</label>
              <div class="relative">
                <input
                  v-model.number="nextGoals[idx + 1].te"
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
                  type="date"
                  class="flex-grow bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500/50 transition-all"
                />
                <input
                  v-model="nextGoals[idx + 1].time"
                  type="time"
                  class="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            class="btn-premium w-full py-3 mt-6 text-xs shadow-lg active:scale-[0.98] disabled:opacity-50"
            :class="idx + 1 < ascensionChain.length ? 'bg-slate-700 text-white' : 'bg-indigo-600 text-white'"
            :disabled="isGenerating"
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
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { iconURL } from 'lib';
import { formatNumber, parseNumber } from '@/lib/format';
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

interface ChainedAscension {
  index: number;
  result1: { summary: AscensionSummary; actions: Action[] };
  result2: { summary: AscensionSummary; actions: Action[] };
  goalType: 'te' | 'date';
  targetTE: number;
  targetEndTime?: number;
}

const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();
const truthEggsStore = useTruthEggsStore();

// Default values
const targetTE = ref(490);
const timezone = ref(virtueStore.ascensionTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

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
const startDate = ref(new Intl.DateTimeFormat('en-CA', { timeZone: timezone.value }).format(now));
const startTime = ref(new Intl.DateTimeFormat('en-GB', { 
  timeZone: timezone.value, 
  hour: '2-digit', 
  minute: '2-digit', 
  hour12: false 
}).format(now));

const isGenerating = ref(false);
const ascensionChain = ref<ChainedAscension[]>([]);

// Goals state management
const nextGoals = ref<Record<number, { te: number | null, date: string, time: string }>>({
  0: { te: 490, date: '', time: '' } // Top form placeholder (actually uses targetTE/startDate/startTime)
});

const handleDeliveredChange = (egg: import('@/types').VirtueEgg, value: string) => {
  const parsed = parseNumber(value);
  if (parsed !== null && !isNaN(parsed)) {
    truthEggsStore.setEggsDeliveredWithSync(egg, parsed);
    syncTEAcrossStores(egg);
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
  return snapshot.teEarned ? Object.values(snapshot.teEarned).reduce((a, b) => a + b, 0) : 0;
});

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

// Watchers for next goal resolution
// (Removed global watchers, logic moved to handleNextGoalSubmit)



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

      const result1 = runAscension(baseState, context, buildPhaseEnd1, absStartTime, 'asc_0', null, 0, targetTE.value, resumeData1);

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

      const result2 = runAscension(baseState2, context2, buildPhaseEnd2, absStartTime, 'asc_0', null, 0, targetTE.value, resumeData2);

      const t1 = performance.now();
      console.log(`Plan generation (C1-K3, 2 paths) took ${(t1 - t0).toFixed(2)}ms`);

      ascensionChain.value = [{
        index: 0,
        result1,
        result2,
        goalType: 'te',
        targetTE: targetTE.value
      }];

      // Prepare goal state for A2
      const best = result1.totalDurationSeconds <= result2.totalDurationSeconds ? result1 : result2;
      nextGoals.value[1] = {
        te: Math.min(490, best.summary.endTE + 30),
        date: '',
        time: ''
      };
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

      let finalTargetTE = goal.te || (lastSummary.endTE + 30);
      let goalType: 'te' | 'date' = goal.te ? 'te' : 'date';
      let targetEndTime: number | undefined = undefined;

      if (goalType === 'date' && goal.date && goal.time) {
        targetEndTime = getLocalTimestampInTimezone(goal.date, goal.time, timezone.value);
        finalTargetTE = lastSummary.endTE + 10; // Placeholder until date search is implemented
      }

      const result1 = runAscension(baseState, context, buildPhaseEnd1, absStartTime, `asc_${idx}`, null, idx, finalTargetTE, {
        actions: JSON.parse(JSON.stringify(precomputed.actions)),
        state: JSON.parse(JSON.stringify(precomputed.state)),
        elapsedSeconds: precomputed.elapsedSeconds,
        resumeShiftName
      });

      const baseState2 = JSON.parse(JSON.stringify(baseState));
      const context2 = getSimulationContext();
      context2.ascensionStartTime = absStartTime;
      context2.planStartOffset = 0;

      const result2 = runAscension(baseState2, context2, buildPhaseEnd2, absStartTime, `asc_${idx}`, null, idx, finalTargetTE, {
        actions: JSON.parse(JSON.stringify(precomputed.actions)),
        state: JSON.parse(JSON.stringify(precomputed.state)),
        elapsedSeconds: precomputed.elapsedSeconds,
        resumeShiftName
      });

      // Prepare goal state for NEXT
      const best = result1.summary.totalDurationSeconds <= result2.summary.totalDurationSeconds ? result1 : result2;
      nextGoals.value[idx + 1] = {
        te: Math.min(490, best.summary.endTE + 30),
        date: '',
        time: ''
      };

      ascensionChain.value.push({
        index: idx,
        result1,
        result2,
        goalType,
        targetTE: finalTargetTE,
        targetEndTime
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
      // 1. Update the goal for the specified ascension
      const item = ascensionChain.value[idx];
      item.goalType = goal.te ? 'te' : 'date';
      item.targetTE = goal.te || (item.targetTE); // Keep existing if date goal used (simplified)
      if (item.goalType === 'date') {
        item.targetEndTime = getLocalTimestampInTimezone(goal.date, goal.time, timezone.value);
      }

      // 2. Recalculate from idx to end
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

        const currentGoal = ascensionChain.value[i];
        let targetTEVal = currentGoal.targetTE;
        
        // TODO: Handle date goal search logic properly
        
        const result1 = runAscension(baseState, context, buildPhaseEnd1, absStartTime, `asc_${i}`, null, i, targetTEVal);
        const result2 = runAscension(JSON.parse(JSON.stringify(baseState)), JSON.parse(JSON.stringify(context)), buildPhaseEnd2, absStartTime, `asc_${i}`, null, i, targetTEVal);

        ascensionChain.value[i].result1 = result1;
        ascensionChain.value[i].result2 = result2;
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

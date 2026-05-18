<template>
  <div class="space-y-6">
    <div class="section-premium p-4 sm:p-8 max-w-4xl mx-auto mt-4 relative overflow-hidden">
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

        <div class="space-y-8 relative">
          <!-- Form Disabled Overlay during Generation -->
          <div v-if="isGenerating" class="absolute -inset-4 bg-white/60 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-3xl transition-all duration-300">
            <div class="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-500/10">
              <div class="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Form locked while calculating...</span>
            </div>
          </div>
          <!-- Section 1: Initial State -->
          <div class="space-y-8">
            <!-- Part 1: Scheduling (Top) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Time</label>
                <div class="flex gap-3">
                  <input
                    v-model="startDate"
                    type="date"
                    :min="formatUnixToDateInput(Date.now() / 1000 - 86400 * 7, timezone)"
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
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Timezone</label>
                <div class="relative">
                  <select
                    v-model="timezone"
                    class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-5 pr-10 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                  >
                    <option v-for="tz in allTimezones" :key="tz.value" :value="tz.value">
                      {{ tz.label }}
                    </option>
                  </select>
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
                        <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{{ VIRTUE_EGG_NAMES[egg] }}</span>
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

            <!-- Part 3: Target Goals -->
            <div>
              <div class="flex items-center gap-3 mb-4 px-1">
                <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider">Ascension Targets</h3>
              </div>

              <div class="space-y-1.5">
                <div class="flex justify-between items-center px-1">
                  <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target TE(s)</label>
                </div>
                <div class="relative">
                  <input
                    v-model="targetTE"
                    @input="handleTargetTEInput"
                    type="text"
                    class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-900 outline-none focus:border-indigo-500/50 transition-all pr-10"
                    placeholder="e.g. 300 400 490"
                  />
                  <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">TE</div>
                </div>
                <p class="text-[10px] font-bold text-slate-400 leading-relaxed px-1 mt-2">
                  Enter a sequence of target TEs separated by spaces to generate an entire multi-ascension chain at once.
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          class="btn-premium btn-primary w-full py-4 mt-8 text-sm shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
          :disabled="isGenerating || !isA1Dirty"
          @click="generate()"
        >
          <span v-if="isGenerating">{{ generateProgress || 'Generating Plan...' }}</span>
          <span v-else>{{ ascensionChain.length > 0 ? 'Update Plan' : 'Generate Plan' }}</span>
        </button>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="ascensionChain.length > 0" class="max-w-4xl mx-auto space-y-12 pb-24 relative px-4 sm:px-0">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
        <h2 class="text-lg font-black text-slate-800 uppercase tracking-tight">Generated Roadmap</h2>
        <div class="flex flex-wrap justify-center items-center gap-3">
          <button 
            @click="copySummary"
            :disabled="isGenerating"
            class="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {{ copySuccess ? 'Copied!' : 'Copy Summary' }}
          </button>
          <button 
            @click="exportCurrentPlan"
            :disabled="isGenerating"
            class="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Plan
          </button>
        </div>
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
          :index="idx"
          :total="ascensionChain.length"
          :target-t-e="result.targetTE"
        />

      </div>

      <!-- Simulation Error Display -->
      <div v-if="simulationError" class="px-4">
        <div class="bg-rose-50 border border-rose-100 rounded-3xl p-6 flex items-start gap-4 shadow-xl shadow-rose-500/5 animate-in fade-in slide-in-from-top-4">
          <div class="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 flex-shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="space-y-1">
            <h4 class="text-sm font-black text-rose-800 uppercase tracking-tight">Simulation Failed</h4>
            <p class="text-xs font-bold text-rose-600/80 leading-relaxed">{{ simulationError }}</p>
          </div>
        </div>
      </div>

      <!-- Running Totals Summary Bar -->
      <div v-if="ascensionChain.length >= 1" class="section-premium p-6">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider">Chain Totals</h3>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Ascension Count -->
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Ascensions</div>
            <div class="text-xl font-black text-slate-900">{{ chainTotals.count }}</div>
          </div>

          <!-- TE Progress -->
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">TE Progress</div>
            <div class="text-xl font-black text-slate-900">{{ chainTotals.startTE }} → {{ chainTotals.endTE }}</div>
            <div class="text-[10px] font-bold text-indigo-500 mt-0.5">+{{ chainTotals.endTE - chainTotals.startTE }} TE gained</div>
          </div>

          <!-- Total Duration -->
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Duration</div>
            <div class="text-xl font-black text-slate-900">{{ chainTotals.durationStr }}</div>
            <div class="text-[10px] font-bold text-slate-400 mt-0.5">{{ chainTotals.durationDays }} days</div>
          </div>

          <!-- SE Consumed -->
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">SE Consumed</div>
            <div class="text-xl font-black text-slate-900">{{ chainTotals.seConsumedStr }}</div>
            <div class="text-[10px] font-bold text-slate-400 mt-0.5">{{ chainTotals.shiftsTotal }} shifts total</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Progress Indicator -->
    <div 
      v-if="isGenerating" 
      class="fixed bottom-8 right-8 z-[200] bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/50 px-6 py-4 rounded-2xl shadow-2xl shadow-indigo-500/20 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-300"
    >
      <div class="w-6 h-6 border-3 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
      <div class="space-y-0.5 pr-2">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-400">Updating Roadmap</div>
        <div class="text-xs font-bold text-slate-200 font-mono-premium">{{ generateProgress || 'Calculating...' }}</div>
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
import { formatNumber, formatUnixToDateInput, formatUnixToTimeInput } from '@/lib/format';
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
import { type ChainedAscension } from '@/stores/autoPlanner';

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
if (!timezone.value) {
  timezone.value = virtueStore.ascensionTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Initialize Target TE to Current + 30 once data is loaded
let targetTEInitialized = false;
watch(() => truthEggsStore.totalTE, (newVal) => {
  if (newVal > 0 && !targetTEInitialized) {
    if (!targetTE.value) {
      targetTE.value = String(Math.min(490, newVal + 30));
    }
    targetTEInitialized = true;
  }
}, { immediate: true });

const getTargets = () => {
  if (!targetTE.value) return [];
  return targetTE.value.trim().split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0);
};

const handleTargetTEInput = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const formatted = input.value.replace(/\D+/g, ' ');
  targetTE.value = formatted.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
};

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

const isGenerating = ref(false);
const generateProgress = ref('');
const simulationError = ref<string | null>(null);

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

  const targets = getTargets();
  if (targets.length !== ascensionChain.value.length) return true;
  
  for (let i = 0; i < targets.length; i++) {
    if (targets[i] !== ascensionChain.value[i].goal.te) return true;
  }

  return false;
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
      },
      targetTE: item.goal.te
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

const generate = async () => {
  if (isGenerating.value) return;
  isGenerating.value = true;
  simulationError.value = null;
  generateProgress.value = 'Initializing simulation...';

  // Allow browser to render initial loading overlay
  await new Promise(resolve => setTimeout(resolve, 30));

  try {
    const targets = getTargets();
    if (targets.length === 0) {
      throw new Error('Please specify at least one Target TE');
    }

    if (targets.length > 0 && targets[0] <= currentTE.value) {
      throw new Error(`First Target TE (${targets[0]}) must be greater than current TE (${currentTE.value})`);
    }

    rollUpPendingTE();
    
    const context = getSimulationContext();
    const baseState = createBaseEngineState(null);
    const initialSnapshot = computeSnapshot(baseState, context);
    actionsStore.setInitialSnapshot(initialSnapshot);

    const absStartTime = getLocalTimestampInTimezone(startDate.value, startTime.value, timezone.value);
    
    const initialParamsToSave = {
      startDate: startDate.value,
      startTime: startTime.value,
      teEarned: { ...truthEggsStore.teEarned }
    };

    const lastA1 = ascensionChain.value[0];
    const initialParamsDirty = !lastA1 || !lastA1.initialParams || (
      startDate.value !== lastA1.initialParams.startDate ||
      startTime.value !== lastA1.initialParams.startTime ||
      JSON.stringify(truthEggsStore.teEarned) !== JSON.stringify(lastA1.initialParams.teEarned)
    );

    let firstDiffIdx = 0;
    if (!initialParamsDirty) {
      let matchCount = 0;
      for (let i = 0; i < targets.length; i++) {
        if (i < ascensionChain.value.length && targets[i] === ascensionChain.value[i].goal.te) {
          matchCount++;
        } else {
          break;
        }
      }
      firstDiffIdx = matchCount;
    }

    let currentBaseState;
    let currentStartTime;
    let currentSummary = null;
    const newChain = [];
    const loops = targets.length;

    if (firstDiffIdx > 0) {
      for (let i = 0; i < firstDiffIdx; i++) {
        newChain.push(ascensionChain.value[i]);
      }
      const lastValid = newChain[firstDiffIdx - 1];
      const lastValidSummary = lastValid.result1.summary.totalDurationSeconds <= lastValid.result2.summary.totalDurationSeconds ? lastValid.result1.summary : lastValid.result2.summary;
      
      const baseBackupState = createBaseEngineState(null);
      currentBaseState = deriveNextStartState(lastValidSummary, baseBackupState);
      currentStartTime = lastValidSummary.endTime;
      currentSummary = lastValidSummary;
      
      if (firstDiffIdx < loops && targets[firstDiffIdx] <= currentSummary.endTE) {
        throw new Error(`Target TE (${targets[firstDiffIdx]}) for A${firstDiffIdx + 1} must be greater than A${firstDiffIdx} end TE (${currentSummary.endTE})`);
      }
    } else {
      baseState.currentEgg = 'curiosity';
      baseState.population = 1;
      baseState.bankValue = 0;
      baseState.researchLevels = {};
      
      currentBaseState = baseState;
      currentStartTime = absStartTime;
    }

    for (let i = firstDiffIdx; i < loops; i++) {
      let stepTargetTE: number | undefined = targets[i] || undefined;
      let stepEndTime: number | undefined = undefined;

      const buildPhaseEnd1 = getNextSaleEnd(currentStartTime);
      const buildPhaseEnd2 = getNextSaleEnd(buildPhaseEnd1 + 1);

      const currentContext = getSimulationContext();
      currentContext.ascensionStartTime = currentStartTime;
      currentContext.planStartOffset = 0;

      generateProgress.value = `Simulating A${i + 1} of ${loops} (1-sale Build)...`;
      await new Promise(resolve => setTimeout(resolve, 15));

      const precomputed = runUntilShift(currentBaseState, currentContext, 'C3');
      const resumeData1 = {
        actions: precomputed.actions,
        state: precomputed.state,
        elapsedSeconds: precomputed.elapsedSeconds,
        resumeShiftName: 'C3'
      };

      const result1 = runAscension(currentBaseState, currentContext, buildPhaseEnd1, currentStartTime, `asc_${i}`, stepTargetTE, stepEndTime, resumeData1);

      generateProgress.value = `Simulating A${i + 1} of ${loops} (2-sale Build)...`;
      await new Promise(resolve => setTimeout(resolve, 15));

      const baseState2 = JSON.parse(JSON.stringify(currentBaseState));
      const context2 = getSimulationContext();
      context2.ascensionStartTime = currentStartTime;
      context2.planStartOffset = 0;

      const resumeData2 = {
        actions: JSON.parse(JSON.stringify(precomputed.actions)),
        state: JSON.parse(JSON.stringify(precomputed.state)),
        elapsedSeconds: precomputed.elapsedSeconds,
        resumeShiftName: 'C3'
      };

      const result2 = runAscension(baseState2, context2, buildPhaseEnd2, currentStartTime, `asc_${i}`, stepTargetTE, stepEndTime, resumeData2);

      const best = result1.summary.totalDurationSeconds <= result2.summary.totalDurationSeconds ? result1 : result2;

      const goalToSave = {
        type: 'te' as 'te' | 'date',
        te: stepTargetTE || null,
        date: '',
        time: ''
      };

      const chainItem: any = {
        index: i,
        result1,
        result2,
        goal: goalToSave
      };
      if (i === 0) {
        chainItem.initialParams = initialParamsToSave;
      }
      newChain.push(chainItem);

      currentSummary = best.summary;
      
      if (i < loops - 1) {
        const baseBackupState = createBaseEngineState(null);
        currentBaseState = deriveNextStartState(currentSummary, baseBackupState);
        currentStartTime = currentSummary.endTime;
        
        if (targets[i + 1] <= currentSummary.endTE) {
          throw new Error(`Target TE (${targets[i + 1]}) for A${i + 2} must be greater than A${i + 1} end TE (${currentSummary.endTE})`);
        }
      }
    }

    if (newChain.length > 0) {
      targetTE.value = targets.join(' ');
    }

    ascensionChain.value = newChain;

  } catch (err: any) {
    console.error('Simulation error:', err);
    simulationError.value = err.message || 'An unknown error occurred during simulation.';
  } finally {
    isGenerating.value = false;
    generateProgress.value = '';
  }
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

const chainTotals = computed(() => {
  const plans = ascensionChain.value.map(item =>
    item.result1.summary.totalDurationSeconds <= item.result2.summary.totalDurationSeconds
      ? item.result1.summary
      : item.result2.summary
  );

  if (plans.length === 0) {
    return { count: 0, startTE: 0, endTE: 0, durationStr: '—', durationDays: '0', seConsumedStr: '—', shiftsTotal: 0 };
  }

  const startTE = plans[0].startTE;
  const endTE = plans[plans.length - 1].endTE;
  const totalSeconds = plans.reduce((sum, p) => sum + p.totalDurationSeconds, 0);
  const totalSEConsumed = plans.reduce((sum, p) => sum + (p.startSoulEggs - p.endSoulEggs), 0);
  const totalShifts = plans.reduce((sum, p) => sum + (p.endShiftCount - p.startShiftCount), 0);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const durationStr = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  const durationDays = (totalSeconds / 86400).toFixed(1);

  return {
    count: plans.length,
    startTE,
    endTE,
    durationStr,
    durationDays,
    seConsumedStr: formatNumber(totalSEConsumed),
    shiftsTotal: totalShifts
  };
});

const copySuccess = ref(false);

const copySummary = async () => {
  if (ascensionChain.value.length === 0) return;
  
  // Use the actual starting TE of A1
  const startTE = ascensionChain.value[0].initialParams?.teEarned 
    ? Object.values(ascensionChain.value[0].initialParams.teEarned).reduce((a, b) => a + b, 0)
    : currentTE.value;

  const bestPlans = ascensionChain.value.map(item => {
    return item.result1.summary.totalDurationSeconds <= item.result2.summary.totalDurationSeconds 
      ? item.result1.summary 
      : item.result2.summary;
  });
  
  const finalTE = bestPlans[bestPlans.length - 1].endTE;
  
  let totalSeconds = 0;
  let totalSE = 0;
  
  const lines = [`Ascension Plan - Starting TE: ${startTE}`];
  
  bestPlans.forEach((plan, idx) => {
    const ascStartTE = idx === 0 ? startTE : bestPlans[idx - 1].endTE;
    const saleStr = plan.strategyLabel.replace(' build', '');
    const durationDays = Math.floor(plan.totalDurationSeconds / 86400);
    const durationHours = Math.floor((plan.totalDurationSeconds % 86400) / 3600);
    const durationStr = `${durationDays}d ${durationHours}h`;
    
    lines.push(`  A${idx + 1}: ${ascStartTE} → ${plan.endTE} TE (${saleStr}, ${durationStr}, ${formatNumber(plan.maxELR * 3600, 3)}/hr)`);
    
    totalSeconds += plan.totalDurationSeconds;
    totalSE += (plan.startSoulEggs - plan.endSoulEggs);
  });
  
  const totalDays = (totalSeconds / 86400).toFixed(1);
  // Format totalSE safely, handling potential precision or floating point issues
  const seStr = formatNumber(totalSE);
  
  lines.push(`Total: ${startTE} → ${finalTE} TE in ~${totalDays} days, ${seStr} SE consumed`);
  
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
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

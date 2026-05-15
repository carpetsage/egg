<template>
  <div class="space-y-6">
    <div class="section-premium p-8 max-w-3xl mx-auto mt-6 relative overflow-hidden">
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
            <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight">Automatic Planner</h2>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Decision Tree Optimizer</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Left Column: Primary Goals -->
          <div class="space-y-6">
            <div class="space-y-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target TE</label>
              <div class="relative">
                <input
                  v-model.number="targetTE"
                  type="number"
                  class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-mono-premium text-lg font-black text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all pr-12"
                  :min="currentTE + 1"
                  max="490"
                />
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">/ 490</div>
              </div>
              <div class="flex justify-between px-1">
                <span class="text-[10px] font-bold text-slate-400">Current: {{ currentTE }}</span>
                <span class="text-[10px] font-black text-indigo-500 uppercase tracking-tight"
                  >+{{ Math.max(0, targetTE - currentTE) }} to gain</span
                >
              </div>
            </div>

            <div class="space-y-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Ascensions</label>
              <div class="flex items-center gap-4">
                <input
                  v-model.number="maxAscensions"
                  type="range"
                  min="1"
                  max="20"
                  class="flex-grow accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
                <div
                  class="w-12 text-center font-mono-premium font-black text-slate-900 bg-slate-50 rounded-lg py-1 border border-slate-100"
                >
                  {{ maxAscensions }}
                </div>
              </div>
              <p class="text-[9px] text-slate-400 italic">
                Deeper trees find better paths but take longer to generate.
              </p>
            </div>
          </div>

          <!-- Right Column: Schedule -->
          <div class="space-y-6">
            <div class="space-y-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="startDate"
                  type="date"
                  class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50"
                />
                <input
                  v-model="startTime"
                  type="time"
                  class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div class="space-y-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Timezone</label>
              <select
                v-model="timezone"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50 appearance-none"
              >
                <option v-for="tz in allTimezones" :key="tz.value" :value="tz.value">
                  {{ tz.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Preview Section -->
        <div
          class="mt-10 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-indigo-200"
        >
          <div class="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>

          <h4 class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6">Resource Preview</h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div class="space-y-1">
              <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max SE Consumption</div>
              <div class="flex items-center gap-3">
                <span class="text-xl font-mono-premium font-black">{{ formatNumber(seCostPreview, 3) }}</span>
                <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-5 h-5" alt="SE" />
              </div>
            </div>

            <div class="space-y-1">
              <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ending SE</div>
              <div class="flex items-center gap-3">
                <span
                  class="text-xl font-mono-premium font-black"
                  :class="endingSE < 0 ? 'text-rose-400' : 'text-emerald-400'"
                >
                  {{ formatNumber(endingSE, 3) }}
                </span>
                <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-5 h-5" alt="SE" />
              </div>
            </div>
          </div>

          <div v-if="endingSE < 0" class="mt-4 flex items-start gap-2 text-rose-400/80">
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p class="text-[10px] font-bold leading-tight">
              Note: SE will go negative. You'll need to earn more SE during the plan execution.
            </p>
          </div>
        </div>

        <button
          class="btn-premium btn-primary w-full py-5 mt-8 text-sm shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
          :disabled="isGenerating"
          @click="generate"
        >
          <span v-if="isGenerating">Generating...</span>
          <span v-else>Generate Path Decision Tree</span>
        </button>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="planShifts.length > 0" class="max-w-5xl mx-auto space-y-6">
      <div class="flex items-center justify-between px-2">
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Generated Plan</h3>
      </div>

      <template v-for="(shift, index) in planShifts" :key="index">
        <div v-if="shift.isAlternative" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ShiftSummary
            v-for="(alt, altIndex) in shift.alternatives"
            :key="altIndex"
            :title="alt.title"
            :egg="alt.egg"
            :actions="alt.actions"
            :duration="alt.duration"
            :cost="alt.cost"
            :cost-type="alt.costType"
            :start-time="alt.startTime"
            :end-time="alt.endTime"
          />
        </div>
        <ShiftSummary
          v-else
          :title="shift.title"
          :egg="shift.egg"
          :actions="shift.actions"
          :duration="shift.duration"
          :cost="shift.cost"
          :cost-type="shift.costType"
          :start-time="shift.startTime"
          :end-time="shift.endTime"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { iconURL } from 'lib';
import { formatNumber } from '@/lib/format';
import { computeMultiAscensionSECost } from '@/auto/se-tracker';
import { createBaseEngineState, getSimulationContext } from '@/engine/adapter';
import { getLocalTimestampInTimezone, getNextPacificTime } from '@/lib/events';
import { runAscension, runUntilShift } from '@/auto/shifts';
import { getResearchById, getResearchByTier } from '@/calculations/commonResearch';
import { rollUpPendingTE } from '@/lib/modes';
import { formatDuration } from '@/lib/format';
import ShiftSummary from './ShiftSummary.vue';

const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();

// Default values
const targetTE = ref(490);
const maxAscensions = ref(5);
const timezone = ref(virtueStore.ascensionTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

const now = new Date();
const startDate = ref(now.toISOString().split('T')[0]);
const startTime = ref(now.toTimeString().split(' ')[0].substring(0, 5));

const isGenerating = ref(false);
const generatedPlan = ref<any>(null);

const currentTE = computed(() => {
  const snapshot = actionsStore.effectiveSnapshot;
  return snapshot.teEarned ? Object.values(snapshot.teEarned).reduce((a, b) => a + b, 0) : 0;
});

const planShifts = computed(() => {
  if (!generatedPlan.value || !generatedPlan.value.result1) return [];

  const extractShifts = (actions: any[], ascStartTime: number) => {
    const shifts: any[] = [];
    let absoluteTime = ascStartTime;

    let currentShift = {
      title: 'C1 Shift',
      egg: 'curiosity',
      actions: [] as any[],
      duration: 0,
      cost: 0, // C1 has no shift cost, it starts on the egg
      costType: 'SE' as 'SE' | 'Virtue',
      startTime: absoluteTime,
      endTime: absoluteTime,
    };

    const titles = [
      'C1 Shift',
      'K1 Shift',
      'I1 Shift',
      'C2 Shift',
      'K2 Shift',
      'R1 Shift',
      'C3 Shift',
      'H1 Shift',
      'K3 Shift',
    ];
    let shiftIndex = 0;

    for (const action of actions) {
      if (action.type === 'shift') {
        if (currentShift.actions.length > 0) {
          currentShift.endTime = absoluteTime;
          shifts.push(currentShift);
        }
        shiftIndex++;
        const nextEgg = action.payload.toEgg;
        const title = titles[shiftIndex] || `${nextEgg.charAt(0).toUpperCase() + nextEgg.slice(1)} Shift`;
        currentShift = {
          title: title,
          egg: nextEgg,
          actions: [action],
          duration: 0,
          cost: action.cost || 0,
          costType: 'SE',
          startTime: absoluteTime,
          endTime: absoluteTime,
        };
      } else {
        currentShift.actions.push(action);
        if (action.type === 'wait_for_time') {
          const dt = action.payload.totalTimeSeconds || 0;
          currentShift.duration += dt;
          absoluteTime += dt;
        }
      }
    }

    if (currentShift.actions.length > 0) {
      currentShift.endTime = absoluteTime;
      shifts.push(currentShift);
    }

    return shifts;
  };

  const shifts1 = extractShifts(generatedPlan.value.result1.actions, generatedPlan.value.result1.summary.startTime);
  const shifts2 = extractShifts(generatedPlan.value.result2.actions, generatedPlan.value.result2.summary.startTime);

  const combined = [];
  let isAlternativePhase = false;
  for (let i = 0; i < shifts1.length; i++) {
    if (shifts1[i].title.startsWith('C3')) {
      isAlternativePhase = true;
    }

    if (isAlternativePhase) {
      const baseTitle = shifts1[i].title.split(' ')[0];
      const alt1 = { ...shifts1[i], title: `${baseTitle} (1 Sale)` };
      const alt2 = { ...shifts2[i], title: `${baseTitle} (2 Sales)` };

      if (baseTitle === 'K3') {
        const r1 = alt1.actions.find((a: any) => a.payload?.peakELR)?.payload.peakELR;
        const r2 = alt2.actions.find((a: any) => a.payload?.peakELR)?.payload.peakELR;
        if (r1 && r2 && r2 > r1) {
          const hoursToOvertake = (r1 * 168) / (r2 - r1);
          const daysToOvertake = hoursToOvertake / 24;
          alt2.actions.push({
            type: 'virtual_overtake_info',
            payload: { daysToOvertake },
          });
        }
      }

      combined.push({
        isAlternative: true,
        alternatives: [alt1, alt2],
      });
    } else {
      combined.push(shifts1[i]);
    }
  }

  return combined;
});

const seCostPreview = computed(() => {
  const snapshot = actionsStore.effectiveSnapshot;
  const result = computeMultiAscensionSECost(snapshot.soulEggs, snapshot.shiftCount, maxAscensions.value);
  return result.totalCost;
});

const endingSE = computed(() => {
  const snapshot = actionsStore.effectiveSnapshot;
  const result = computeMultiAscensionSECost(snapshot.soulEggs, snapshot.shiftCount, maxAscensions.value);
  return result.endingSE;
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

const generate = () => {
  isGenerating.value = true;

  // Use a setTimeout to allow the UI to update "isGenerating" state before blocking
  setTimeout(() => {
    try {
      // Roll up pending TE first (claimed at ascension start)
      rollUpPendingTE();

      const baseState = createBaseEngineState(null);

      // Force Curiosity and 1 chicken for C1 start
      baseState.currentEgg = 'curiosity';
      baseState.population = 1;
      baseState.bankValue = 0;
      baseState.researchLevels = {}; // Start with no common research

      console.log(`Starting Simulation with rolled-up TE: ${baseState.te}`);

      const context = getSimulationContext();

      const absStartTime = getLocalTimestampInTimezone(startDate.value, startTime.value, timezone.value);
      context.ascensionStartTime = absStartTime;
      context.planStartOffset = 0;

      const nextSaleStart1 = getNextPacificTime(5, 9, absStartTime);
      const buildPhaseEnd1 = nextSaleStart1 + 86400; // 1st sale end

      const nextSaleStart2 = getNextPacificTime(5, 9, buildPhaseEnd1);
      const buildPhaseEnd2 = nextSaleStart2 + 86400; // 2nd sale end

      // Precompute C1 through R1 since they are identical
      const precomputed = runUntilShift(baseState, context, 'C3');

      const resumeData1 = {
        actions: precomputed.actions,
        state: precomputed.state,
        elapsedSeconds: precomputed.elapsedSeconds,
        resumeShiftName: 'C3'
      };

      const t0 = performance.now();

      const result1 = runAscension(baseState, context, buildPhaseEnd1, absStartTime, 'asc_0', null, 0, resumeData1);

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

      const result2 = runAscension(baseState2, context2, buildPhaseEnd2, absStartTime, 'asc_0', null, 0, resumeData2);

      const t1 = performance.now();
      console.log(`Plan generation (C1-K3, 2 paths) took ${(t1 - t0).toFixed(2)}ms`);

      generatedPlan.value = { result1, result2 };
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
  @apply bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700;
}
.font-mono-premium {
  font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
}
</style>

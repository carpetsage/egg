<template>
  <div class="bg-white rounded-[2.5rem] p-6 text-slate-900 relative overflow-hidden shadow-xl border border-slate-200">
    <!-- Background accents -->
    <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>
    <div class="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>

    <div class="relative z-10">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
        <div class="flex items-start sm:items-center gap-4 sm:gap-5">
          <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 flex-shrink-0">
            <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-200">
                A{{ index + 1 }} of {{ total }}
              </span>
              <span v-if="targetTE" class="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-md border border-indigo-100">
                Goal: {{ targetTE }} TE
              </span>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h3 class="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-800">{{ summary.strategyLabel }}</h3>
              <div v-if="summary.comparison && summary.comparison.daysFaster > 0.01" 
                class="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm w-fit">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {{ summary.comparison.daysFaster.toFixed(1) }} days faster than {{ summary.comparison.otherPlanLabel }}
              </div>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-2 sm:mt-1">
               <span class="text-[9px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Ascension Summary</span>
               <span class="hidden sm:block w-1 h-1 bg-slate-200 rounded-full"></span>
               <span class="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ formatTimeRange(summary.startTime, summary.endTime) }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center lg:justify-end gap-4">
          <div class="text-left lg:text-right">
            <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Duration</div>
            <div class="text-xl sm:text-2xl font-mono-premium font-black text-indigo-600">{{ formatDuration(summary.totalDurationSeconds) }}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 mb-8">
        <!-- TE Progress -->
        <div class="space-y-1">
          <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            TE Progress
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-mono-premium font-black text-slate-400">{{ summary.startTE }}</span>
            <svg class="w-4 h-4 text-slate-200 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span class="text-3xl font-mono-premium font-black text-emerald-600">{{ summary.endTE }}</span>
            <img :src="iconURL('egginc/egg_truth.png', 64)" class="w-6 h-6 mb-1 ml-1" alt="TE" />
          </div>
          <div class="text-[10px] font-black text-emerald-500/80 uppercase tracking-tight">+{{ summary.teGained }}</div>
        </div>

        <!-- Peak ELR -->
        <div class="space-y-1">
          <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
            Peak ELR achieved
          </div>
          <div class="flex items-center gap-2">
            <span class="text-2xl font-mono-premium font-black text-indigo-600">{{ formatNumber(summary.maxELR * 3600, 3) }}</span>
            <span class="text-[10px] font-black text-slate-500 mt-1 uppercase">/HR</span>
          </div>
        </div>

        <!-- SE Cost -->
        <div class="space-y-1">
          <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
            SE Consumed
          </div>
          <div class="flex items-center gap-2">
            <span class="text-2xl font-mono-premium font-black text-rose-600">{{ formatNumber(summary.totalShiftCost, 3) }}</span>
            <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-5 h-5 opacity-80" alt="SE" />
          </div>
        </div>

        <!-- Ending SE Balance -->
        <div class="space-y-1">
          <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
            Ending SE Balance
          </div>
          <div class="flex items-center gap-2">
            <span class="text-2xl font-mono-premium font-black" :class="summary.endSoulEggs < 0 ? 'text-rose-600' : 'text-slate-600'">
              {{ formatNumber(summary.endSoulEggs, 3) }}
            </span>
            <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-5 h-5 opacity-40" alt="SE" />
          </div>
          <div class="text-[10px] font-black text-slate-500 uppercase tracking-tight">shift count: {{ summary.endShiftCount }}</div>
        </div>
      </div>

      <!-- Warnings -->
      <div v-if="warnings.length > 0" class="mb-8 space-y-2">
        <div v-for="warning in warnings" :key="warning" 
             class="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-3 text-amber-600">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span class="text-[11px] font-black uppercase tracking-wider leading-tight">{{ warning }}</span>
        </div>
      </div>

      <!-- TE Breakdown -->
      <div class="bg-slate-50 border border-slate-100 rounded-3xl p-5 mb-2">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div v-for="egg in eggs" :key="egg" class="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/50 shadow-sm">
            <!-- Egg Icon -->
            <div class="w-9 h-9 flex-shrink-0 bg-slate-50 rounded-lg p-1.5 border border-slate-100 shadow-inner">
              <img :src="iconURL(`egginc/egg_${egg}.png`, 64)" class="w-full h-full object-contain" :alt="egg" />
            </div>

            <div class="space-y-0.5">
              <!-- TE Count -->
              <div class="flex items-center gap-1.5">
                <span class="text-lg font-mono-premium font-black text-slate-800 leading-none">
                  {{ summary.finalTE[egg] || 0 }}
                </span>
                <span v-if="summary.teEarned[egg]" class="text-[9px] font-black text-emerald-500 mt-0.5 leading-none">
                  (+{{ summary.teEarned[egg] }})
                </span>
                <img :src="iconURL('egginc/egg_truth.png', 32)" class="w-3.5 h-3.5" alt="TE" />
              </div>
              
              <!-- Eggs Delivered -->
              <div class="text-[9px] font-bold text-slate-500 font-mono-premium leading-none">
                {{ formatNumber(summary.eggsDelivered[egg], 3) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Collapsible Detailed Breakdown -->
      <div class="mt-4 border-t border-slate-100 pt-2">
        <button 
          @click="isExpanded = !isExpanded"
          class="w-full px-2 py-3 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors group"
        >
          <div class="flex items-center gap-3">
            <div class="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
            View Detailed Shift Breakdown
          </div>
          <svg 
            class="w-4 h-4 transition-transform duration-500" 
            :class="isExpanded ? 'rotate-180' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="isExpanded" class="mt-2 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <ShiftSummary
            v-for="(shift, index) in shifts"
            :key="index"
            :title="shift.title"
            :egg="shift.egg"
            :actions="shift.actions"
            :duration="shift.duration"
            :cost="shift.cost"
            :cost-type="shift.costType"
            :start-time="shift.startTime"
            :end-time="shift.endTime"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { formatNumber, formatDuration } from '@/lib/format';
import { iconURL } from 'lib';
import type { AscensionSummary } from '@/auto/types';
import type { VirtueEgg } from '@/types';
import ShiftSummary from './ShiftSummary.vue';

const props = defineProps<{
  summary: AscensionSummary & { 
    comparison?: { 
      daysFaster: number; 
      otherPlanLabel: string; 
    } 
  };
  actions: any[];
  index: number;
  total: number;
  targetTE: number | null;
}>();

const isExpanded = ref(false);
const eggs: VirtueEgg[] = ['curiosity', 'integrity', 'humility', 'resilience', 'kindness'];

const warnings = computed(() => {
  const list: string[] = [];
  if (props.summary.endSoulEggs < 0) {
    list.push('Soul Egg balance will go negative. You may not be able to afford all shifts.');
  }
  if (props.summary.endTE < props.summary.startTE + 1) {
    list.push('No TE gained during this ascension. Goal may be unreachable or already met.');
  }
  return list;
});

const shifts = computed(() => {
  const actions = props.actions;
  const ascStartTime = props.summary.startTime;
  const shifts: any[] = [];
  let absoluteTime = ascStartTime;

  let currentShift = {
    title: 'C1 Shift',
    egg: 'curiosity',
    actions: [] as any[],
    duration: 0,
    cost: 0,
    costType: 'SE' as 'SE' | 'Virtue',
    startTime: absoluteTime,
    endTime: absoluteTime,
  };

  const titles = [
    'C1 Shift', 'K1 Shift', 'I1 Shift', 
    'C2 Shift', 'K2 Shift', 'R1 Shift', 
    'C3 Shift', 'H1 Shift', 'K3 Shift', 
    'C4 Shift', 'I2 Shift', 'R2 Shift', 
    'H2 Shift',
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
});

const formatTimeRange = (start: number, end: number) => {
  const s = new Date(start * 1000);
  const e = new Date(end * 1000);
  
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric',
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit' 
  };
  
  return `${s.toLocaleString('en-US', options)} — ${e.toLocaleString('en-US', options)}`;
};
</script>

<style scoped>
.font-mono-premium {
  font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
}
</style>

<template>
  <div
    v-if="ascensionChain.length >= 1"
    class="fixed bottom-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] transition-transform duration-500"
    :class="[isCollapsed ? 'translate-y-full' : 'translate-y-0']"
  >
    <button
      @click="$emit('toggle')"
      class="absolute -top-8 right-6 bg-white/95 backdrop-blur-xl border border-b-0 border-slate-100 px-3 py-1 rounded-t-lg shadow-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-wider h-8"
    >
      <svg
        class="w-4 h-4 transition-transform duration-300"
        :class="{ 'rotate-180': !isCollapsed }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
      </svg>
    </button>

    <div class="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-6">
      <div class="summary-item">
        <span class="summary-label">Start Date</span>
        <span class="summary-value text-slate-900">{{ totals.startDateStr }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Ascensions</span>
        <span class="summary-value font-mono-premium font-black text-slate-600">{{ totals.count }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">TE Progress</span>
        <div class="flex items-center gap-2">
          <span class="summary-value font-mono-premium font-black text-indigo-600">+{{ totals.teGained }}</span>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
            ({{ totals.startTE }} → {{ totals.endTE }})
          </span>
        </div>
      </div>
      <div class="summary-item">
        <span class="summary-label">Duration</span>
        <span class="summary-value font-mono-premium font-black text-slate-600">{{ totals.durationStr }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">End Date</span>
        <span class="summary-value text-slate-900">{{ totals.endDateStr }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Shifts</span>
        <div class="flex items-center gap-2">
          <span class="summary-value font-mono-premium font-black text-slate-600">+{{ totals.shiftsTotal }}</span>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 font-mono-premium">
            (#{{ totals.startShifts }} → #{{ totals.endShifts }})
          </span>
        </div>
      </div>
      <div class="summary-item">
        <span class="summary-label">Soul Eggs</span>
        <div class="flex items-center gap-2">
          <span class="summary-value font-mono-premium font-black text-rose-500" v-tippy="'SE Consumed'">
            -{{ formatNumber(totals.totalSEConsumed, 1) }}
          </span>
          <div class="flex flex-col justify-center border-l border-slate-100 pl-2 h-7 opacity-80" v-tippy="'Remaining SE'">
            <div class="text-[8px] font-black leading-none text-slate-400 mb-1 uppercase tracking-widest">Remaining</div>
            <div class="text-[11px] font-black leading-none text-slate-700 font-mono-premium flex items-center gap-1">
              {{ formatNumber(totals.remainingSE, 1) }}
              <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3 h-3" alt="SE" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAutoPlannerStore } from '@/stores/autoPlanner';
import { formatNumber } from '@/lib/format';
import { iconURL } from 'lib';

defineProps<{ isCollapsed: boolean }>();
defineEmits<{ toggle: [] }>();

const { ascensionChain, timezone } = storeToRefs(useAutoPlannerStore());

function formatDateOnly(timestampSeconds: number, tz: string): string {
  if (!timestampSeconds) return 'N/A';
  const date = new Date(timestampSeconds * 1000);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: tz,
  });
}

const totals = computed(() => {
  const plans = ascensionChain.value.map(item => {
    const candidates = [item.result1, item.result2, ...(item.result3 ? [item.result3] : [])];
    return candidates.reduce((a, b) => (a.summary.totalDurationSeconds <= b.summary.totalDurationSeconds ? a : b)).summary;
  });

  if (plans.length === 0) {
    return {
      count: 0, startTE: 0, endTE: 0, teGained: 0,
      startDateStr: 'N/A', endDateStr: 'N/A', durationStr: '—',
      totalSEConsumed: 0, remainingSE: 0, shiftsTotal: 0, startShifts: 0, endShifts: 0,
    };
  }

  const startTE = plans[0].startTE;
  const endTE = plans[plans.length - 1].endTE;
  const totalSeconds = plans.reduce((sum, p) => sum + p.totalDurationSeconds, 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);

  return {
    count: plans.length,
    startTE,
    endTE,
    teGained: endTE - startTE,
    startDateStr: formatDateOnly(plans[0].startTime, timezone.value),
    endDateStr: formatDateOnly(plans[plans.length - 1].endTime, timezone.value),
    durationStr: days > 0 ? `${days}d ${hours}h` : `${hours}h`,
    totalSEConsumed: plans.reduce((sum, p) => sum + (p.startSoulEggs - p.endSoulEggs), 0),
    remainingSE: plans[plans.length - 1].endSoulEggs,
    shiftsTotal: plans.reduce((sum, p) => sum + (p.endShiftCount - p.startShiftCount), 0),
    startShifts: plans[0].startShiftCount,
    endShifts: plans[plans.length - 1].endShiftCount,
  };
});
</script>

<style scoped>
.font-mono-premium { font-family: 'JetBrains Mono', 'Roboto Mono', monospace; }
.summary-item { @apply flex flex-col gap-1; }
.summary-label { @apply text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none; }
.summary-value { @apply text-[13px] font-bold tracking-tight whitespace-nowrap; }
</style>

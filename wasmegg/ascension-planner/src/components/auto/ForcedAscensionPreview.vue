<template>
  <div class="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-slate-900 relative overflow-hidden shadow-md border border-violet-100">
    <!-- Background accents -->
    <div class="absolute -right-20 -top-20 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl"></div>
    <div class="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>

    <div class="relative z-10">
      <!-- Header -->
      <div class="flex items-center gap-2.5 sm:gap-3 mb-4">
        <button
          type="button"
          class="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md shadow-violet-100/50 flex-shrink-0 hover:shadow-lg transition-shadow"
          v-tippy="'View TE calendar'"
          @click="openCalendar"
        >
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
        <div>
          <div class="flex items-baseline gap-2">
            <h3 class="text-base sm:text-lg font-black uppercase tracking-tight text-slate-800 leading-none">
              Next Ascension preview
            </h3>
          </div>
        </div>
      </div>

      <!-- Peak ELR row -->
      <div class="flex items-center gap-3 mb-4 px-1">
        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peak Delivery Rate</span>
        <div class="flex items-center gap-1.5">
          <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider">1-sale</span>
          <span class="text-[13px] font-mono-premium font-black text-indigo-600">
            {{ formatNumber(result1.summary.maxELR * 3600, 3) }}
          </span>
          <span class="text-[9px] font-black text-slate-400">/hr</span>
        </div>
        <div class="w-px h-4 bg-slate-200"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider">2-sale</span>
          <span class="text-[13px] font-mono-premium font-black text-indigo-600">
            {{ formatNumber(result2.summary.maxELR * 3600, 3) }}
          </span>
          <span class="text-[9px] font-black text-slate-400">/hr</span>
        </div>
      </div>
    </div>

    <TeCalendarModal
      v-if="isCalendarOpen"
      :is-open="isCalendarOpen"
      :entries="calendarEntries"
      ascension-label="Next Ascension"
      @close="isCalendarOpen = false"
      @update-target="(te: number) => emit('updateTarget', te)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { formatNumber } from '@/lib/format';
import type { AscensionSummary } from '@/auto/types';
import type { Action } from '@/types/actions/meta';
import type { VirtueEgg } from '@/types';
import { buildAscensionCalendar, type TECalendarEntry } from '@/auto/te-calendar';
import TeCalendarModal from './TeCalendarModal.vue';

const props = defineProps<{
  result1: { summary: AscensionSummary; actions: Action[] };
  result2: { summary: AscensionSummary; actions: Action[] };
  index: number;
  total: number;
  startEggsDelivered: Record<VirtueEgg, number>;
}>();

const emit = defineEmits<{
  (e: 'updateTarget', te: number): void;
}>();

const isCalendarOpen = ref(false);

// This card always previews the rest of the way to TE 490 — there's no separate
// "configured target" for it, so realTargetTE is null (skips the 'end' marker and
// the projection-extension step, since result1/result2 already simulate to 490
// for real) and there's no 'continue' candidate (only A1 ever has one). A computed,
// memoized by Vue and never evaluated until first opened (see AscensionOverview.vue
// for the same pattern, applied there first).
const calendarEntries = computed<TECalendarEntry[]>(
  () =>
    buildAscensionCalendar(props.result1.summary.startTime, props.result1, null, props.startEggsDelivered, [
      { variant: '1-sale', result: props.result1 },
      { variant: '2-sale', result: props.result2 },
    ]).entries
);

function openCalendar() {
  isCalendarOpen.value = true;
}
</script>

<style scoped>
.font-mono-premium { font-family: 'JetBrains Mono', 'Roboto Mono', monospace; }
</style>

<template>
  <div class="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-slate-900 relative overflow-hidden shadow-md border border-violet-100">
    <!-- Background accents -->
    <div class="absolute -right-20 -top-20 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl"></div>
    <div class="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>

    <div class="relative z-10">
      <!-- Header -->
      <div class="flex items-center gap-2.5 sm:gap-3 mb-4">
        <div class="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md shadow-violet-100/50 flex-shrink-0">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
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
        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peak ELR</span>
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
  </div>
</template>

<script setup lang="ts">
import { formatNumber } from '@/lib/format';
import type { AscensionSummary } from '@/auto/types';
import type { Action } from '@/types/actions/meta';

defineProps<{
  result1: { summary: AscensionSummary; actions: Action[] };
  result2: { summary: AscensionSummary; actions: Action[] };
  index: number;
  total: number;
}>();
</script>

<style scoped>
.font-mono-premium { font-family: 'JetBrains Mono', 'Roboto Mono', monospace; }
</style>

<template>
  <div class="space-y-4">
    <!-- Final Result -->
    <div class="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-inner flex justify-between items-center">
      <div>
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Egg Value</div>
        <div class="text-3xl font-bold text-slate-800 tracking-tight">
          {{ formatNumber(output.finalValue, 3) }} <span class="text-sm font-medium text-slate-400">gems/egg</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Power</div>
        <div class="text-lg font-mono-premium font-bold text-slate-900">
          {{ formatMultiplier(output.finalValue / output.baseValue) }}
        </div>
      </div>
    </div>

    <!-- Multiplier Breakdown -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Multiplier Breakdown</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Value</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ output.baseValue }} G</span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Research Modifier</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ formatMultiplier(output.researchMultiplier) }}</span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artifact Potency</span>
          <span class="font-mono-premium text-sm font-bold" :class="output.artifactMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.artifactMultiplier) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Artifact Breakdown -->
    <div v-if="output.artifactBreakdown.length > 0" class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Initial Loadout Effects</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div
          v-for="(effect, index) in output.artifactBreakdown"
          :key="index"
          class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold text-slate-700">{{ effect.label }}</span>
            <span class="badge-premium py-0 text-[8px]" :class="effect.source === 'artifact' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'badge-slate'">
              {{ effect.source }}
            </span>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ effect.effect }}</span>
        </div>
      </div>
    </div>

    <!-- Research -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Contributing Research</h3>
      </div>
      <div class="divide-y divide-slate-50 max-h-80 overflow-y-auto scrollbar-premium">
        <div
          v-for="research in output.researchBreakdown"
          :key="research.researchId"
          class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
              <img :src="iconURL(getColleggtibleIconPath(research.researchId), 64)" class="w-5 h-5 object-contain" :alt="research.name" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700 leading-tight">{{ research.name }}</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {{ formatMultiplier(research.multiplier, true) }}
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-mono-premium text-xs font-bold text-slate-700">{{ research.level }} <span class="text-slate-300 font-normal">/</span> {{ research.maxLevel }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EggValueOutput } from '@/types';
import { formatNumber, formatMultiplier } from '@/lib/format';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';

defineProps<{
  output: EggValueOutput;
}>();
</script>

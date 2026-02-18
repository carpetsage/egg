<template>
  <div class="space-y-4">
    <!-- Final Result -->
    <div class="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-inner">
      <div class="flex justify-between items-center mb-4">
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Egg Laying Rate</div>
        <!-- Time Unit Toggle -->
        <div class="inline-flex p-1 bg-white rounded-xl border border-slate-200/50 shadow-sm">
          <button
            v-for="unit in timeUnits"
            :key="unit.value"
            class="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-200"
            :class="timeUnit === unit.value
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600'"
            @click="$emit('set-time-unit', unit.value)"
          >
            {{ unit.label }}
          </button>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Per Chicken</div>
          <div class="text-2xl font-bold text-slate-800 tracking-tight">
            {{ formatNumber(output.ratePerChicken, 3) }}<span class="text-xs text-slate-400 ml-1">/{{ timeUnitLabel }}</span>
          </div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</div>
          <div class="text-2xl font-bold text-slate-900 tracking-tight">
            {{ formatNumber(output.totalRate, 3) }}<span class="text-xs text-slate-400 ml-1">/{{ timeUnitLabel }}</span>
          </div>
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
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Rate</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ formatNumber(output.baseRatePerSecond * 60, 4) }}/min</span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Common Research</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ formatMultiplier(output.researchMultiplier) }}</span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('epic_egg_laying'), 64)" class="w-4 h-4 object-contain opacity-60" alt="Epic Comfy Nests" />
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Epic Comfy Nests</span>
          </div>
          <span class="font-mono-premium text-sm font-bold" :class="output.epicMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.epicMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('silicon'), 64)" class="w-4 h-4 object-contain opacity-60" alt="Silicon" />
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Silicon</span>
          </div>
          <span class="font-mono-premium text-sm font-bold" :class="output.siliconMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.siliconMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artifact Multiplier</span>
          <span class="font-mono-premium text-sm font-bold" :class="output.artifactMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.artifactMultiplier) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Artifact Breakdown -->
    <div v-if="output.artifactBreakdown.length > 0" class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Artifact Breakdown</h3>
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
              ({{ effect.source }})
            </span>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ effect.effect }}</span>
        </div>
      </div>
    </div>

    <!-- Research -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Common Research</h3>
      </div>
      <div class="divide-y divide-slate-50 max-h-80 overflow-y-auto scrollbar-premium">
        <!-- Common -->
        <div
          v-for="research in commonResearchBreakdown"
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

        <!-- Epic -->
        <div class="px-5 py-1 bg-slate-50/30 text-[9px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-100">Epic Research</div>
        <div class="px-5 py-4">
          <div class="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md transition-shadow">
            <div class="flex items-center gap-3">
               <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner overflow-hidden">
                <img :src="iconURL(getColleggtibleIconPath('epic_egg_laying'), 64)" class="w-5 h-5 object-contain" alt="Epic Comfy Nests" />
              </div>
              <div>
                <div class="text-[11px] font-bold text-slate-700 leading-tight">Epic Comfy Nests</div>
              </div>
            </div>
            <span class="font-mono-premium text-xs font-bold text-slate-700">{{ epicComfyNestsLevel }} <span class="text-slate-300">/</span> 20</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Colleggtibles -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Colleggtibles</h3>
      </div>
      <div class="px-5 py-4">
        <div class="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm">
              <img :src="iconURL(getColleggtibleIconPath('silicon'), 64)" class="w-5 h-5 object-contain" alt="Silicon" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Silicon</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ formatTier(colleggtibleTier) }}</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatColleggtibleBonus(output.siliconMultiplier) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TimeUnit } from '@/types';
import type { LayRateDisplayOutput } from '@/composables/useLayRate';
import { formatNumber, formatMultiplier } from '@/lib/format';
import { formatTier, formatColleggtibleBonus } from '@/lib/colleggtibles';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';
import { computed } from 'vue';

const props = defineProps<{
  output: LayRateDisplayOutput;
  epicComfyNestsLevel: number;
  colleggtibleTier: number;
  timeUnit: TimeUnit;
}>();

defineEmits<{
  'set-time-unit': [unit: TimeUnit];
}>();

const timeUnits = [
  { value: 'minute' as const, label: '/min' },
  { value: 'hour' as const, label: '/hr' },
  { value: 'day' as const, label: '/day' },
];

const timeUnitLabel = computed(() => {
  switch (props.timeUnit) {
    case 'minute': return 'min';
    case 'hour': return 'hr';
    case 'day': return 'day';
  }
});

// Filter to only show common (non-epic) researches in the main list
const commonResearchBreakdown = computed(() =>
  props.output.researchBreakdown.filter(r => !r.isEpic)
);
</script>

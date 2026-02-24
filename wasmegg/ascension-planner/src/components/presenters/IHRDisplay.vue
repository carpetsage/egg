<template>
  <div class="space-y-4">
    <!-- Final Result -->
    <div class="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-inner">
      <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Internal Hatchery Rate</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Online</div>
          <div class="text-2xl font-bold text-slate-800 tracking-tight">
            {{ formatNumber(output.onlineRate, 1) }}<span class="text-xs text-slate-400 ml-1">/m</span>
          </div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Offline</div>
          <div class="text-2xl font-bold text-slate-900 tracking-tight">
            {{ formatNumber(output.offlineRate, 1) }}<span class="text-xs text-slate-400 ml-1">/m</span>
          </div>
        </div>
      </div>
      <div class="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center px-1">
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base IHR</span>
        <span class="font-mono-premium text-xs font-bold text-slate-700">{{ formatNumber(output.baseRatePerHab, 2) }}/min per hab</span>
      </div>

      <!-- Min Rate Banner -->
      <div v-if="output.isClampedByMinRate" class="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
        <div class="w-5 h-5 rounded-full bg-white flex items-center justify-center border border-indigo-100 shadow-sm shrink-0 mt-0.5">
          <svg class="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-[10px] text-indigo-600 leading-relaxed font-medium">
          Rate boosted to <span class="font-bold">500/min</span> because players can create chickens manually in the game.
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
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eggs of Truth</span>
          <span class="font-mono-premium text-sm font-bold" :class="output.teMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.teMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('epic_internal_incubators'), 64)" class="w-4 h-4 object-contain opacity-60" alt="Epic Int. Hatcheries" />
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Epic Internal Incubators</span>
          </div>
          <span class="font-mono-premium text-sm font-bold" :class="output.epicMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.epicMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('easter'), 64)" class="w-4 h-4 object-contain opacity-60" alt="Easter" />
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Easter</span>
          </div>
          <span class="font-mono-premium text-sm font-bold" :class="output.easterEggMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.easterEggMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artifact Multiplier</span>
          <span class="font-mono-premium text-sm font-bold" :class="output.artifactMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.artifactMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center bg-slate-50/50">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('int_hatch_calm'), 64)" class="w-4 h-4 object-contain opacity-60" alt="Internal Hatchery Calm" />
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Internal Hatchery Calm</span>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatMultiplier(output.offlineMultiplier) }}
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

    <!-- Eggs of Truth -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Eggs of Truth</h3>
      </div>
      <div class="px-5 py-4">
        <div class="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm">
              <img :src="iconURL(getColleggtibleIconPath('truth'), 64)" class="w-5 h-5 object-contain" alt="Truth" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Eggs of Truth</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ te }} Claimed</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatMultiplier(output.teMultiplier) }}
          </span>
        </div>
        <p class="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-3 px-1">Dimensional shift provides 1.1x hatchery boost per discovery</p>
      </div>
    </div>

    <!-- Research -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
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
                +{{ formatNumber(research.contribution, 0) }}/min
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-mono-premium text-xs font-bold text-slate-700">{{ research.level }} <span class="text-slate-300 font-normal">/</span> {{ research.maxLevel }}</div>
          </div>
        </div>

        <!-- Epic (Hatchery specific) -->
        <div class="px-5 py-1 bg-slate-50/30 text-[9px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-100">Epic Research</div>
        
        <div class="px-5 py-4 space-y-4">
          <!-- Epic Int. Hatcheries -->
          <div class="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md transition-shadow">
            <div class="flex items-center gap-3">
               <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner overflow-hidden">
                <img :src="iconURL(getColleggtibleIconPath('epic_internal_incubators'), 64)" class="w-5 h-5 object-contain" alt="Epic Int. Hatcheries" />
              </div>
              <div>
                <div class="text-[11px] font-bold text-slate-700 leading-tight">Epic Internal Incubators</div>
              </div>
            </div>
            <span class="font-mono-premium text-xs font-bold text-slate-700">{{ epicResearchLevels.epicInternalIncubators }} <span class="text-slate-300">/</span> 20</span>
          </div>

          <!-- Internal Hatchery Calm -->
          <div class="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md transition-shadow">
            <div class="flex items-center gap-3">
               <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden">
                <img :src="iconURL(getColleggtibleIconPath('int_hatch_calm'), 64)" class="w-5 h-5 object-contain" alt="Internal Hatchery Calm" />
              </div>
              <div>
                <div class="text-[11px] font-bold text-slate-700 leading-tight">Internal Hatchery Calm</div>
              </div>
            </div>
            <span class="font-mono-premium text-xs font-bold text-slate-700">{{ epicResearchLevels.internalHatcheryCalm }} <span class="text-slate-300">/</span> 20</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IHROutput } from '@/types';
import { formatNumber, formatMultiplier } from '@/lib/format';
import { formatTier, formatColleggtibleBonus } from '@/lib/colleggtibles';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';
import { computed } from 'vue';

const props = defineProps<{
  output: IHROutput;
  te: number;
  epicResearchLevels: {
    epicInternalIncubators: number;
    internalHatcheryCalm: number;
  };
  colleggtibleTier: number;
}>();

defineEmits<{}>();

// Filter to only show common (non-epic) researches in the main list
const commonResearchBreakdown = computed(() =>
  props.output.researchBreakdown.filter(r => !r.isEpic)
);
</script>

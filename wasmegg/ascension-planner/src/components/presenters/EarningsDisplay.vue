<template>
  <div class="space-y-4">
    <!-- Earnings Results -->
    <div class="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-inner">
      <div class="flex justify-between items-center mb-6">
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Earnings</div>
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
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Online</div>
          <div class="text-2xl font-bold text-slate-800 tracking-tight">
            {{ formatNumber(convertedOnline, 2) }}<span class="text-xs text-slate-400 ml-1">/{{ timeUnitLabel }}</span>
          </div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Offline</div>
          <div class="text-2xl font-bold text-slate-900 tracking-tight">
            {{ formatNumber(convertedOffline, 2) }}<span class="text-xs text-slate-400 ml-1">/{{ timeUnitLabel }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Inputs Display -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Base Values</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Egg Value</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ formatNumber(eggValue, 2) }}</span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Effective Lay Rate</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ formatNumber(convertedELR, 2) }}<span class="text-[10px] opacity-60 ml-0.5">/{{ timeUnitLabel }}</span></span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center bg-slate-50/50">
          <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest">Base Earnings</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ formatNumber(convertedBase, 2) }}<span class="text-[10px] opacity-60 ml-0.5">/{{ timeUnitLabel }}</span></span>
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
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
              <img :src="iconURL(getColleggtibleIconPath('truth'), 64)" class="w-5 h-5 object-contain" alt="Truth Egg" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Eggs of Truth (1.1^{{ te }})</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatMultiplier(output.teMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
              <img :src="iconURL(getColleggtibleIconPath('firework'), 64)" class="w-5 h-5 object-contain" alt="Firework" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Firework (all earnings)</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatMultiplier(output.fireworkMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
              <img :src="iconURL('egginc/r_icon_video_doubler_time.png', 64)" class="w-5 h-5 object-contain" alt="Video Doubler" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Video Doubler (all earnings)</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatMultiplier(output.videoDoublerMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Away Earnings (offline)</span>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatMultiplier(output.awayEarningsMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artifacts (offline)</span>
          <span class="font-mono-premium text-sm font-bold" :class="output.artifactAwayMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.artifactAwayMultiplier) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Artifact Breakdown -->
    <div v-if="output.artifactBreakdown.length > 0" class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Artifact Effects</h3>
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
      <div class="px-5 py-3 bg-slate-50/30 border-t border-slate-100">
        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lunar effects stack multiplicatively with each other</p>
      </div>
    </div>

    <!-- Colleggtibles -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Colleggtibles</h3>
      </div>
      <div class="px-5 py-4 space-y-4">
        <!-- Firework -->
        <div class="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm">
              <img :src="iconURL(getColleggtibleIconPath('firework'), 64)" class="w-5 h-5 object-contain" alt="Firework" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Firework</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ formatTier(colleggtibleTiers.firework) }}</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatColleggtibleBonus(fireworkMultiplier) }}
          </span>
        </div>
        <!-- Chocolate -->
        <div class="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm">
              <img :src="iconURL(getColleggtibleIconPath('chocolate'), 64)" class="w-5 h-5 object-contain" alt="Chocolate" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Chocolate</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ formatTier(colleggtibleTiers.chocolate) }}</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatColleggtibleBonus(chocolateMultiplier) }}
          </span>
        </div>
        <!-- Wood -->
        <div class="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm">
              <img :src="iconURL(getColleggtibleIconPath('wood'), 64)" class="w-5 h-5 object-contain" alt="Wood" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Wood</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ formatTier(colleggtibleTiers.wood) }}</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatColleggtibleBonus(woodMultiplier) }}
          </span>
        </div>
        <p class="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1">Chocolate and Wood bonuses apply to offline earnings only</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EarningsOutput, TimeUnit } from '@/types';
import { formatNumber, formatMultiplier } from '@/lib/format';
import { formatTier, formatColleggtibleBonus, getColleggtibleMultiplier } from '@/lib/colleggtibles';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';
import { computed } from 'vue';

const props = defineProps<{
  output: EarningsOutput;
  eggValue: number;
  effectiveLayRate: number;
  te: number;
  colleggtibleTiers: {
    firework: number;
    chocolate: number;
    wood: number;
  };
  timeUnit: TimeUnit;
}>();

defineEmits<{
  'set-time-unit': [unit: TimeUnit];
}>();

// Computed multipliers for display
const fireworkMultiplier = computed(() => getColleggtibleMultiplier('firework', props.colleggtibleTiers.firework));
const chocolateMultiplier = computed(() => getColleggtibleMultiplier('chocolate', props.colleggtibleTiers.chocolate));
const woodMultiplier = computed(() => getColleggtibleMultiplier('wood', props.colleggtibleTiers.wood));

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

const timeMultiplier = computed(() => {
  switch (props.timeUnit) {
    case 'minute': return 60;
    case 'hour': return 3600;
    case 'day': return 86400;
  }
});

const convertedELR = computed(() => props.effectiveLayRate * timeMultiplier.value);
const convertedBase = computed(() => props.output.baseEarnings * timeMultiplier.value);
const convertedOnline = computed(() => props.output.onlineEarnings * timeMultiplier.value);
const convertedOffline = computed(() => props.output.offlineEarnings * timeMultiplier.value);
</script>

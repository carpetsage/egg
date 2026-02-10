<template>
  <div class="space-y-4">
    <!-- Earnings Results -->
    <div class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
      <div class="flex justify-between items-center mb-3">
        <div class="text-sm text-amber-700 font-medium">Earnings</div>
        <!-- Time Unit Toggle -->
        <div class="flex gap-1">
          <button
            v-for="unit in timeUnits"
            :key="unit.value"
            class="px-2 py-1 text-xs rounded"
            :class="timeUnit === unit.value
              ? 'bg-amber-600 text-white'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'"
            @click="$emit('set-time-unit', unit.value)"
          >
            {{ unit.label }}
          </button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs text-amber-600">Online</div>
          <div class="text-2xl font-bold text-amber-900">
            {{ formatNumber(convertedOnline, 2) }}/{{ timeUnitLabel }}
          </div>
        </div>
        <div>
          <div class="text-xs text-amber-600">Offline</div>
          <div class="text-2xl font-bold text-amber-900">
            {{ formatNumber(convertedOffline, 2) }}/{{ timeUnitLabel }}
          </div>
        </div>
      </div>
    </div>

    <!-- Inputs Display -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Base Values</h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Egg Value</span>
          <span class="font-mono text-gray-700">{{ formatNumber(eggValue, 2) }}</span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Effective Lay Rate</span>
          <span class="font-mono text-gray-700">{{ formatNumber(convertedELR, 2) }}/{{ timeUnitLabel }}</span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Base Earnings</span>
          <span class="font-mono text-gray-700">{{ formatNumber(convertedBase, 2) }}/{{ timeUnitLabel }}</span>
        </div>
      </div>
    </div>

    <!-- Multiplier Breakdown -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Multiplier Breakdown</h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('firework'), 64)" class="w-4 h-4 object-contain" alt="Firework" />
            <span class="text-gray-600">Firework (all earnings)</span>
          </div>
          <span class="font-mono" :class="output.fireworkMultiplier !== 1 ? 'text-red-600' : 'text-gray-400'">
            {{ formatMultiplier(output.fireworkMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL('egginc/r_icon_video_doubler_time.png', 64)" class="w-4 h-4 object-contain" alt="Video Doubler" />
            <span class="text-gray-600">Video Doubler (all earnings)</span>
          </div>
          <span class="font-mono" :class="output.videoDoublerMultiplier > 1 ? 'text-blue-600' : 'text-gray-400'">
            {{ formatMultiplier(output.videoDoublerMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Away Earnings (offline)</span>
          <span class="font-mono" :class="output.awayEarningsMultiplier !== 1 ? 'text-amber-600' : 'text-gray-400'">
            {{ formatMultiplier(output.awayEarningsMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Artifacts (offline)</span>
          <span class="font-mono" :class="output.artifactAwayMultiplier !== 1 ? 'text-purple-600' : 'text-gray-400'">
            {{ formatMultiplier(output.artifactAwayMultiplier) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Artifact Breakdown -->
    <div v-if="output.artifactBreakdown.length > 0" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Artifact Effects <span class="text-xs text-gray-500 font-normal">(from Initial State)</span></h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div
          v-for="(effect, index) in output.artifactBreakdown"
          :key="index"
          class="px-4 py-2 flex justify-between items-center"
        >
          <div>
            <span class="text-sm text-gray-900">{{ effect.label }}</span>
            <span class="ml-1 text-xs" :class="effect.source === 'artifact' ? 'text-purple-500' : 'text-blue-500'">
              ({{ effect.source }})
            </span>
          </div>
          <span class="font-mono text-purple-600">{{ effect.effect }}</span>
        </div>
      </div>
      <div class="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <span class="text-xs text-gray-500">Lunar effects stack multiplicatively with each other</span>
      </div>
    </div>

    <!-- Colleggtibles (Read-only from Initial State) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Colleggtibles <span class="text-xs text-gray-500 font-normal">(from Initial State)</span></h3>
      </div>
      <div class="px-4 py-3 space-y-3">
        <!-- Firework -->
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('firework'), 64)" class="w-6 h-6 object-contain" alt="Firework" />
            <span class="font-medium text-gray-900">Firework</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="colleggtibleTiers.firework >= 0 ? 'text-red-600' : 'text-gray-400'"
            >
              {{ formatColleggtibleBonus(fireworkMultiplier) }}
            </span>
          </div>
          <span class="text-sm text-gray-600">{{ formatTier(colleggtibleTiers.firework) }}</span>
        </div>
        <!-- Chocolate -->
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('chocolate'), 64)" class="w-6 h-6 object-contain" alt="Chocolate" />
            <span class="font-medium text-gray-900">Chocolate</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="colleggtibleTiers.chocolate >= 0 ? 'text-amber-600' : 'text-gray-400'"
            >
              {{ formatColleggtibleBonus(chocolateMultiplier) }}
            </span>
          </div>
          <span class="text-sm text-gray-600">{{ formatTier(colleggtibleTiers.chocolate) }}</span>
        </div>
        <!-- Wood -->
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('wood'), 64)" class="w-6 h-6 object-contain" alt="Wood" />
            <span class="font-medium text-gray-900">Wood</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="colleggtibleTiers.wood >= 0 ? 'text-yellow-700' : 'text-gray-400'"
            >
              {{ formatColleggtibleBonus(woodMultiplier) }}
            </span>
          </div>
          <span class="text-sm text-gray-600">{{ formatTier(colleggtibleTiers.wood) }}</span>
        </div>
        <div class="text-xs text-gray-500">Chocolate and Wood bonuses apply to offline earnings only</div>
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

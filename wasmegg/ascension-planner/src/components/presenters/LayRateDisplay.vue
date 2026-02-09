<template>
  <div class="space-y-6">
    <!-- Final Result -->
    <div class="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
      <div class="flex justify-between items-center mb-2">
        <div class="text-sm text-yellow-700 font-medium">Egg Laying Rate</div>
        <!-- Time Unit Toggle -->
        <div class="flex gap-1">
          <button
            v-for="unit in timeUnits"
            :key="unit.value"
            class="px-2 py-1 text-xs rounded"
            :class="timeUnit === unit.value
              ? 'bg-yellow-600 text-white'
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'"
            @click="$emit('set-time-unit', unit.value)"
          >
            {{ unit.label }}
          </button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs text-yellow-600">Per Chicken</div>
          <div class="text-2xl font-bold text-yellow-900">
            {{ formatNumber(output.ratePerChicken, 3) }}/{{ timeUnitLabel }}
          </div>
        </div>
        <div>
          <div class="text-xs text-yellow-600">Total (max hab: {{ formatNumber(output.population, 0) }})</div>
          <div class="text-2xl font-bold text-yellow-900">
            {{ formatNumber(output.totalRate, 3) }}/{{ timeUnitLabel }}
          </div>
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
          <span class="text-gray-600">Base Rate (per chicken)</span>
          <span class="font-mono text-gray-900">{{ formatNumber(output.baseRatePerSecond * 60, 4) }}/min</span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Research Multiplier</span>
          <span class="font-mono" :class="output.researchMultiplier !== 1 ? 'text-blue-600' : 'text-gray-400'">
            {{ formatMultiplier(output.researchMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('epic_egg_laying'), 64)" class="w-4 h-4 object-contain" alt="Epic Comfy Nests" />
            <span class="text-gray-600">Epic Comfy Nests</span>
          </div>
          <span class="font-mono" :class="output.epicMultiplier !== 1 ? 'text-purple-600' : 'text-gray-400'">
            {{ formatMultiplier(output.epicMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('silicon'), 64)" class="w-4 h-4 object-contain" alt="Silicon" />
            <span class="text-gray-600">Silicon Bonus</span>
          </div>
          <span class="font-mono" :class="output.siliconMultiplier !== 1 ? 'text-cyan-600' : 'text-gray-400'">
            {{ formatMultiplier(output.siliconMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Artifacts</span>
          <span class="font-mono" :class="output.artifactMultiplier !== 1 ? 'text-purple-600' : 'text-gray-400'">
            {{ formatMultiplier(output.artifactMultiplier) }}
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
    </div>

    <!-- Common Research (Read-only from Common Research) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Lay Rate Research <span class="text-xs text-gray-500 font-normal">(from Common Research)</span></h3>
      </div>
      <div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        <div
          v-for="research in commonResearchBreakdown"
          :key="research.researchId"
          class="px-4 py-2 flex justify-between items-center"
        >
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath(research.researchId), 64)" class="w-5 h-5 object-contain" :alt="research.name" />
            <span class="font-medium text-gray-900">{{ research.name }}</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="research.multiplier > 1 ? 'text-blue-600' : 'text-gray-400'"
            >
              {{ formatMultiplier(research.multiplier, true) }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono text-gray-700">{{ research.level }}</span>
            <span class="text-xs text-gray-400">/ {{ research.maxLevel }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Epic Research (Read-only from Initial State) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Epic Research <span class="text-xs text-gray-500 font-normal">(from Initial State)</span></h3>
      </div>
      <div class="px-4 py-3">
        <div class="flex justify-between items-center mb-1">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('epic_egg_laying'), 64)" class="w-6 h-6 object-contain" alt="Epic Comfy Nests" />
            <span class="font-medium text-gray-900">Epic Comfy Nests</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="epicComfyNestsLevel > 0 ? 'text-purple-600' : 'text-gray-400'"
            >
              {{ formatMultiplier(1 + epicComfyNestsLevel * 0.05, true) }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono text-gray-700">{{ epicComfyNestsLevel }}</span>
            <span class="text-xs text-gray-400">/ 20</span>
          </div>
        </div>
        <div class="text-xs text-gray-500 ml-8">+5% egg laying rate per level</div>
      </div>
    </div>

    <!-- Colleggtibles (Read-only from Initial State) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Colleggtibles <span class="text-xs text-gray-500 font-normal">(from Initial State)</span></h3>
      </div>
      <div class="px-4 py-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('silicon'), 64)" class="w-6 h-6 object-contain" alt="Silicon" />
            <span class="font-medium text-gray-900">Silicon</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="colleggtibleTier >= 0 ? 'text-cyan-600' : 'text-gray-400'"
            >
              {{ formatColleggtibleBonus(output.siliconMultiplier) }}
            </span>
          </div>
          <span class="text-sm text-gray-600">{{ formatTier(colleggtibleTier) }}</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">Lay rate bonus from colleggtibles</div>
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

<template>
  <div class="space-y-6">
    <!-- Final Result -->
    <div class="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
      <div class="text-sm text-orange-700 font-medium">Internal Hatchery Rate (4 habs)</div>
      <div class="grid grid-cols-2 gap-4 mt-2">
        <div>
          <div class="text-xs text-orange-600">Online</div>
          <div class="text-2xl font-bold text-orange-900">
            {{ formatNumber(output.onlineRate, 3) }}/min
          </div>
        </div>
        <div>
          <div class="text-xs text-orange-600">Offline</div>
          <div class="text-2xl font-bold text-orange-900">
            {{ formatNumber(output.offlineRate, 3) }}/min
          </div>
        </div>
      </div>
      <div class="text-sm text-orange-600 mt-2">
        Base: {{ formatNumber(output.baseRatePerHab, 3) }}/min per hab
      </div>
    </div>

    <!-- Multiplier Breakdown -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Multiplier Breakdown</h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Base Rate (per hab)</span>
          <span class="font-mono text-gray-900">{{ formatNumber(output.baseRatePerHab, 3) }}/min</span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">TE Bonus (1.1^{{ te }})</span>
          <span class="font-mono" :class="output.teMultiplier !== 1 ? 'text-amber-600' : 'text-gray-400'">
            {{ formatMultiplier(output.teMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('epic_internal_incubators'), 64)" class="w-4 h-4 object-contain" alt="Epic Int. Hatcheries" />
            <span class="text-gray-600">Epic Int. Hatcheries</span>
          </div>
          <span class="font-mono" :class="output.epicMultiplier !== 1 ? 'text-purple-600' : 'text-gray-400'">
            {{ formatMultiplier(output.epicMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('easter'), 64)" class="w-4 h-4 object-contain" alt="Easter" />
            <span class="text-gray-600">Easter Egg Bonus</span>
          </div>
          <span class="font-mono" :class="output.easterEggMultiplier !== 1 ? 'text-blue-600' : 'text-gray-400'">
            {{ formatMultiplier(output.easterEggMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Artifacts</span>
          <span class="font-mono" :class="output.artifactMultiplier !== 1 ? 'text-purple-600' : 'text-gray-400'">
            {{ formatMultiplier(output.artifactMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('int_hatch_calm'), 64)" class="w-4 h-4 object-contain" alt="Internal Hatchery Calm" />
            <span class="text-gray-600">Offline Multiplier</span>
          </div>
          <span class="font-mono" :class="output.offlineMultiplier !== 1 ? 'text-green-600' : 'text-gray-400'">
            {{ formatMultiplier(output.offlineMultiplier) }}
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

    <!-- Eggs of Truth -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Eggs of Truth <span class="text-xs text-gray-500 font-normal">(from Initial State)</span></h3>
      </div>
      <div class="px-4 py-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('truth'), 64)" class="w-6 h-6 object-contain" alt="Truth" />
            <span class="text-gray-600">TE Count</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="te > 0 ? 'text-amber-600' : 'text-gray-400'"
            >
              {{ formatMultiplier(output.teMultiplier) }}
            </span>
          </div>
          <div class="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
            {{ te }} <span class="text-xs text-gray-400">/ 490</span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Each TE provides 1.1x multiplier to IHR
        </p>
      </div>
    </div>

    <!-- Common Research (Read-only from Common Research) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">IHR Research <span class="text-xs text-gray-500 font-normal">(from Common Research)</span></h3>
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
              :class="research.contribution > 0 ? 'text-green-600' : 'text-gray-400'"
            >
              +{{ formatNumber(research.contribution, 0) }}/min
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
      <div class="px-4 py-3 space-y-4">
        <!-- Epic Int. Hatcheries -->
        <div>
          <div class="flex justify-between items-center mb-1">
            <div class="flex items-center gap-2">
              <img :src="iconURL(getColleggtibleIconPath('epic_internal_incubators'), 64)" class="w-6 h-6 object-contain" alt="Epic Int. Hatcheries" />
              <span class="font-medium text-gray-900">Epic Int. Hatcheries</span>
              <span
                class="ml-2 text-sm font-mono"
                :class="epicResearchLevels.epicInternalIncubators > 0 ? 'text-purple-600' : 'text-gray-400'"
              >
                {{ formatMultiplier(1 + epicResearchLevels.epicInternalIncubators * 0.05, true) }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-mono text-gray-700">{{ epicResearchLevels.epicInternalIncubators }}</span>
              <span class="text-xs text-gray-400">/ 20</span>
            </div>
          </div>
          <div class="text-xs text-gray-500 ml-8">+5% IHR per level (online & offline)</div>
        </div>

        <!-- Internal Hatchery Calm -->
        <div>
          <div class="flex justify-between items-center mb-1">
            <div class="flex items-center gap-2">
              <img :src="iconURL(getColleggtibleIconPath('int_hatch_calm'), 64)" class="w-6 h-6 object-contain" alt="Internal Hatchery Calm" />
              <span class="font-medium text-gray-900">Internal Hatchery Calm</span>
              <span
                class="ml-2 text-sm font-mono"
                :class="epicResearchLevels.internalHatcheryCalm > 0 ? 'text-green-600' : 'text-gray-400'"
              >
                {{ formatMultiplier(1 + epicResearchLevels.internalHatcheryCalm * 0.10, true) }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-mono text-gray-700">{{ epicResearchLevels.internalHatcheryCalm }}</span>
              <span class="text-xs text-gray-400">/ 20</span>
            </div>
          </div>
          <div class="text-xs text-gray-500 ml-8">+10% IHR per level (offline only)</div>
        </div>
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
            <img :src="iconURL(getColleggtibleIconPath('easter'), 64)" class="w-6 h-6 object-contain" alt="Easter" />
            <span class="font-medium text-gray-900">Easter</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="colleggtibleTier >= 0 ? 'text-blue-600' : 'text-gray-400'"
            >
              {{ formatColleggtibleBonus(output.easterEggMultiplier) }}
            </span>
          </div>
          <span class="text-sm text-gray-600">{{ formatTier(colleggtibleTier) }}</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">IHR bonus from colleggtibles</div>
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

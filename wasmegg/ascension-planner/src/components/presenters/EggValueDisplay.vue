<template>
  <div class="space-y-6">
    <!-- Final Result -->
    <div class="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
      <div class="text-sm text-yellow-700 font-medium">Final Egg Value</div>
      <div class="text-3xl font-bold text-yellow-900">
        {{ formatNumber(output.finalValue) }} gems/egg
      </div>
      <div class="text-sm text-yellow-600 mt-1">
        {{ formatMultiplier(output.finalValue / output.baseValue) }} total multiplier
      </div>
    </div>

    <!-- Multiplier Breakdown -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Multiplier Breakdown</h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Base Value</span>
          <span class="font-mono text-gray-900">{{ output.baseValue }} gem</span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Research Bonus</span>
          <span class="font-mono text-green-600">{{ formatMultiplier(output.researchMultiplier) }}</span>
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

    <!-- Research (Read-only from Common Research) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Egg Value Research <span class="text-xs text-gray-500 font-normal">(from Common Research)</span></h3>
      </div>
      <div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        <div
          v-for="research in output.researchBreakdown"
          :key="research.researchId"
          class="px-4 py-2 flex justify-between items-center"
        >
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath(research.researchId), 64)" class="w-5 h-5 object-contain" :alt="research.name" />
            <span class="font-medium text-gray-900">{{ research.name }}</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="research.multiplier > 1 ? 'text-green-600' : 'text-gray-400'"
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

<template>
  <div class="space-y-6">
    <!-- Final Result -->
    <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
      <div class="text-sm text-green-700 font-medium">Total Hab Capacity</div>
      <div class="text-3xl font-bold text-green-900">
        {{ formatNumber(output.totalFinalCapacity, 0) }} chickens
      </div>
      <div class="text-sm text-green-600 mt-1">
        {{ formatMultiplier(output.totalFinalCapacity / output.totalBaseCapacity) }} total multiplier
      </div>
    </div>

    <!-- Hab Cost Discounts Section -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Hab Cost Discounts</h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('cheaper_contractors'), 64)" class="w-6 h-6 object-contain" alt="Cheaper Contractors" />
            <span class="text-gray-600">Cheaper Contractors</span>
            <span class="text-xs text-gray-400 ml-1">(Epic Research)</span>
          </div>
          <span class="font-mono" :class="cheaperContractorsLevel > 0 ? 'text-purple-600' : 'text-gray-400'">
            {{ cheaperContractorsLevel > 0 ? `-${cheaperContractorsLevel * 5}%` : '—' }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('flame-retardant'), 64)" class="w-6 h-6 object-contain" alt="Flame Retardant" />
            <span class="text-gray-600">Flame Retardant</span>
            <span class="text-xs text-gray-400 ml-1">(Colleggtible)</span>
          </div>
          <span class="font-mono" :class="flameRetardantMultiplier < 1 ? 'text-orange-600' : 'text-gray-400'">
            {{ flameRetardantMultiplier < 1 ? formatPercent(flameRetardantMultiplier - 1, 0) : '—' }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center bg-gray-50">
          <span class="font-medium text-gray-900">Total Discount</span>
          <span class="font-mono font-medium" :class="totalCostMultiplier < 1 ? 'text-green-600' : 'text-gray-400'">
            {{ totalCostMultiplier < 1 ? formatPercent(totalCostMultiplier - 1, 0) : '—' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Hab Slots -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Habs ({{ purchasedCount }}/4)</h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div
          v-for="(hab, index) in output.habBreakdown"
          :key="index"
          class="px-4 py-3 flex justify-between items-center"
        >
          <div class="flex items-center gap-3">
            <span class="text-gray-400 text-sm w-6">{{ index + 1 }}.</span>
            <div v-if="hab.habId !== null" class="flex items-center gap-2">
              <img
                :src="iconURL(getHabById(hab.habId as any)?.iconPath ?? '', 64)"
                class="w-6 h-6 object-contain"
                :alt="getHabById(hab.habId as any)?.name"
              />
              <span class="text-sm text-gray-900">{{ getHabById(hab.habId as any)?.name }}</span>
            </div>
            <span v-else class="text-sm text-gray-400 italic">Empty</span>
          </div>
          <div class="text-right">
            <div v-if="hab.habId !== null" class="font-mono text-gray-900">
              {{ formatNumber(hab.finalCapacity, 0) }}
            </div>
            <div v-if="hab.habId !== null" class="text-xs text-gray-500">
              base: {{ formatNumber(hab.baseCapacity, 0) }}
            </div>
            <div v-if="hab.habId !== null" class="text-xs text-amber-600">
              cost: {{ formatNumber(getHabPriceForSlot(index), 0) }}
            </div>
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
          <span class="text-gray-600">Base Capacity</span>
          <span class="font-mono text-gray-900">{{ formatNumber(output.totalBaseCapacity, 0) }}</span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Research Bonus</span>
          <span class="font-mono text-green-600">{{ formatMultiplier(output.researchMultiplier) }}</span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Portal Research Bonus</span>
          <span class="font-mono" :class="output.portalResearchMultiplier !== 1 ? 'text-purple-600' : 'text-gray-400'">
            {{ formatMultiplier(output.portalResearchMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('pegg'), 64)" class="w-4 h-4 object-contain" alt="P.E.G.G" />
            <span class="text-gray-600">PEGG Bonus</span>
          </div>
          <span class="font-mono" :class="output.peggMultiplier !== 1 ? 'text-blue-600' : 'text-gray-400'">
            {{ formatMultiplier(output.peggMultiplier) }}
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

    <!-- Research (Read-only from Common Research) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Hab Capacity Research <span class="text-xs text-gray-500 font-normal">(from Common Research)</span></h3>
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
              v-if="research.portalOnly"
              class="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded"
            >
              Portal Only
            </span>
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

    <!-- Colleggtibles (Read-only from Initial State) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Colleggtibles <span class="text-xs text-gray-500 font-normal">(from Initial State)</span></h3>
      </div>
      <div class="px-4 py-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('pegg'), 64)" class="w-6 h-6 object-contain" alt="P.E.G.G" />
            <span class="font-medium text-gray-900">P.E.G.G</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="colleggtibleTier >= 0 ? 'text-blue-600' : 'text-gray-400'"
            >
              {{ formatColleggtibleBonus(output.peggMultiplier) }}
            </span>
          </div>
          <span class="text-sm text-gray-600">{{ formatTier(colleggtibleTier) }}</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">Hab capacity bonus from colleggtibles</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HabCapacityOutput } from '@/types';
import { getHabById, getDiscountedHabPrice, getHabCostMultiplier, countHabsOfType, type HabCostModifiers } from '@/lib/habs';
import { formatNumber, formatMultiplier, formatPercent } from '@/lib/format';
import { formatTier, formatColleggtibleBonus } from '@/lib/colleggtibles';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';
import { computed } from 'vue';

const props = defineProps<{
  output: HabCapacityOutput;
  colleggtibleTier: number;
  cheaperContractorsLevel: number;
  flameRetardantMultiplier: number;
}>();

const purchasedCount = computed(() =>
  props.output.habBreakdown.filter(h => h.habId !== null).length
);

// Cost modifiers object
const costModifiers = computed<HabCostModifiers>(() => ({
  cheaperContractorsLevel: props.cheaperContractorsLevel,
  flameRetardantMultiplier: props.flameRetardantMultiplier,
}));

// Total cost multiplier for display
const totalCostMultiplier = computed(() => getHabCostMultiplier(costModifiers.value));

// Get current hab IDs array
const currentHabIds = computed(() =>
  props.output.habBreakdown.map(h => h.habId)
);

/**
 * Get the price that was paid for the hab in a specific slot.
 */
function getHabPriceForSlot(slotIndex: number): number {
  const habId = currentHabIds.value[slotIndex];
  if (habId === null) return 0;

  const hab = getHabById(habId as any);
  if (!hab) return 0;

  // Count how many of this hab type are in slots before this one
  const habsBeforeSlot = currentHabIds.value.slice(0, slotIndex);
  const purchaseIndex = countHabsOfType(habsBeforeSlot, habId);

  return getDiscountedHabPrice(hab, purchaseIndex, costModifiers.value);
}
</script>

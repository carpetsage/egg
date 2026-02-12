<template>
  <div class="space-y-4">
    <div v-for="tier in tiers" :key="tier" class="border border-gray-200 rounded-lg overflow-hidden transition-all duration-300">
      <!-- Tier Header -->
      <div
        class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center"
      >
        <div
          class="flex items-center gap-2 flex-1 cursor-pointer"
          @click="toggleTier(tier)"
        >
          <span class="font-medium text-gray-900">Tier {{ tier }}</span>
          <span
            v-if="!tierSummaries[tier]?.isUnlocked"
            class="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase tracking-wide shadow-sm"
          >
            Locked ({{ tierSummaries[tier]?.purchasesNeeded ?? '?' }} more)
          </span>
          <span
            v-else
            class="text-[10px] text-gray-400 font-medium uppercase"
          >
            {{ tierSummaries[tier]?.purchasedLevels ?? 0 }} / {{ tierSummaries[tier]?.totalLevels ?? 0 }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <!-- Max Tier button -->
          <button
            v-if="tierSummaries[tier]?.isUnlocked && !isTierMaxed(tier)"
            class="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors border border-blue-200"
            @click.stop="$emit('max-tier', tier)"
            :title="`Buy all remaining research in Tier ${tier}${viewTimes.tiers[tier] ? ' (Total: ' + viewTimes.tiers[tier] + ')' : ''}`"
          >
            Max Tier
            <span v-if="viewTimes.tiers[tier]" class="ml-1 text-[9px] opacity-70">({{ viewTimes.tiers[tier] }})</span>
          </button>
          <svg
            class="w-5 h-5 text-gray-400 transition-transform cursor-pointer"
            :class="{ 'rotate-180': expandedTiers.has(tier) }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            @click="toggleTier(tier)"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Tier Research List -->
      <div v-if="expandedTiers.has(tier)" class="divide-y divide-gray-100 bg-white">
        <ResearchItem
          v-for="research in getResearchesForTier(tier)"
          :key="research.id"
          :research="research"
          :current-level="levels[research.id] || 0"
          :price="getResearchPrice(research)"
          :time-to-buy="getResearchTimeToBuy(research)"
          :can-buy="true"
          :is-maxed="(levels[research.id] || 0) >= research.levels"
          :show-max="true"
          :max-time="viewTimes.researches[research.id]"
          @buy="$emit('buy', research)"
          @max="$emit('max', research)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { type CommonResearch } from '@/calculations/commonResearch';
import ResearchItem from './ResearchItem.vue';

const props = defineProps<{
  tiers: number[];
  researchByTier: Map<number, CommonResearch[]>;
  tierSummaries: Record<number, any>;
  viewTimes: { tiers: Record<number, string>; researches: Record<string, string> };
  levels: Record<string, number>;
  getResearchPrice: (r: CommonResearch) => number;
  getResearchTimeToBuy: (r: CommonResearch) => string;
}>();

defineEmits(['buy', 'max', 'max-tier']);

const expandedTiers = ref(new Set<number>([1]));

function toggleTier(tier: number) {
  if (expandedTiers.value.has(tier)) {
    expandedTiers.value.delete(tier);
  } else {
    expandedTiers.value.add(tier);
  }
}

function getResearchesForTier(tier: number): CommonResearch[] {
  return props.researchByTier.get(tier) || [];
}

function isTierMaxed(tier: number): boolean {
  const summary = props.tierSummaries[tier];
  if (!summary) return true;
  return summary.purchasedLevels >= summary.totalLevels;
}
</script>

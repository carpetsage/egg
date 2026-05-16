<template>
  <div class="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 bg-white">
    <template v-for="(item, idx) in sortedResearches" :key="`${item.research.id}-${item.targetLevel}`">
      <!-- Tier Break Divider (Cheapest First) -->
      <div
        v-if="item.showDivider"
        class="px-4 py-1.5 bg-blue-50 border-y border-blue-100 flex items-center justify-between sticky top-0 z-10 shadow-sm"
      >
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
          <span class="text-[10px] font-black text-blue-800 uppercase tracking-widest">
            Tier {{ item.unlockTier }} Unlocked
          </span>
        </div>
        <span class="text-[10px] text-blue-600 font-bold tracking-tighter uppercase">
          {{ thresholds[(item.unlockTier ?? 1) - 1] }} Purchases Reached
        </span>
      </div>

      <ResearchItem
        :research="item.research"
        :current-level="item.currentLevel"
        :target-level="item.targetLevel"
        :price="item.price"
        :time-to-buy="item.timeToBuy || getResearchTimeToBuy(item.research)"
        :time-to-buy-seconds="item.timeToBuySeconds ?? getResearchTimeToBuySeconds(item.research)"
        :can-buy="item.canBuy"
        :is-maxed="item.isMaxed"
        :show-max="false"
        :show-tier="true"
        :show-buy-to-here="view === 'cheapest'"
        :can-buy-to-here="view === 'cheapest' ? true : item.canBuyToHere"
        :buy-to-here-time="item.buyToHereTime"
        :buy-to-here-seconds="item.buyToHereSeconds"
        :buy-to-here-tooltip="item.buyToHereTooltip"
        :extra-stats="item.extraStats"
        :extra-label="item.extraLabel"
        :extra-seconds="item.extraSeconds"
        :hpp="item.hpp"
        :realistic-stats="item.realisticStats"
        :recommendation-note="item.recommendationNote"
        :show-sale-warning="item.showSaleWarning"
        :show-deadline-warning="item.showDeadlineWarning"
        @buy="$emit('buy', item.research)"
        @max="$emit('max', item.research)"
        @buy-to-here="$emit('buy-to-here', idx)"
      />
    </template>

    <div v-if="sortedResearches.length === 0" class="px-4 py-8 text-center text-gray-500 italic bg-gray-50">
      <div v-if="isMissingRealisticData" class="max-w-xs mx-auto">
        <p class="text-gray-900 font-bold not-italic mb-1 text-sm">Artifact Data Required</p>
        <p class="text-[11px] leading-relaxed mb-4 not-italic">
          Realistic predictions require your artifact inventory. We omit this data from saved plans for privacy when sharing files.
          Click below to refresh your local data and enable the realistic view for this session.
        </p>
        <button
          class="btn-premium btn-primary w-full mt-2"
          @click="$emit('refresh-backup')"
        >
          Refresh & Fix Plan
        </button>
      </div>
      <template v-else>
        No researches match this criteria or all are maxed.
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { type CommonResearch } from '@/calculations/commonResearch';
import { type ViewType } from '@/composables/useResearchViews';
import { useInitialStateStore } from '@/stores/initialState';
import ResearchItem from './ResearchItem.vue';

interface SortedResearchItem {
  research: CommonResearch;
  targetLevel: number;
  price: number;
  currentLevel: number;
  canBuy: boolean;
  isMaxed: boolean;
  timeToBuy?: string;
  timeToBuySeconds?: number;
  buyToHereTime?: string;
  buyToHereSeconds?: number;
  buyToHereTooltip?: string;
  canBuyToHere?: boolean;
  showDivider?: boolean;
  unlockTier?: number;
  extraStats?: string;
  extraLabel?: string;
  extraSeconds?: number;
  hpp?: number;
  realisticStats?: { layRate: number; shippingRate: number; elr: number; elrDelta: number };
  recommendationNote?: string;
  showSaleWarning?: boolean;
  showDeadlineWarning?: boolean;
}

const props = defineProps<{
  sortedResearches: SortedResearchItem[];
  view: ViewType;
  thresholds: readonly number[];
  getResearchTimeToBuy: (r: CommonResearch) => string;
  getResearchTimeToBuySeconds: (r: CommonResearch) => number;
}>();

const initialStateStore = useInitialStateStore();
const isMissingRealisticData = computed(() => props.view === 'elr' && !initialStateStore.rawBackup);

defineEmits(['buy', 'max', 'buy-to-here', 'refresh-backup']);
</script>

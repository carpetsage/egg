<template>
  <div class="space-y-4">
    <ResearchSaleToggle :is-active="isResearchSaleActive" @toggle="handleToggleSale" />

    <SmartBuy
      v-model:always-on="smartBuyState.alwaysOn"
      @buy="handleSmartBuy"
      @update="state => (smartBuyState = state)"
    />

    <ResearchViewSelector v-model="currentView" :views="VIEWS" />

    <p class="text-sm text-gray-500 mb-4 px-1">
      {{ viewDescription }}
    </p>

    <ElrViewControls
      v-if="currentView === 'elr'"
      :view-mode="elrViewMode"
      :sort-mode="elrSortMode"
      @update:view-mode="elrViewMode = $event"
      @update:sort-mode="elrSortMode = $event"
    />

    <!-- Realistic Mode Summary -->
    <div 
      v-if="currentView === 'elr' && elrViewMode === 'realistic' && realisticSummary"
      class="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm"
    >
      <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-center">
        <div class="flex flex-col">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Lay Rate</span>
          <span class="text-sm font-mono font-bold text-gray-900 leading-none py-1" v-tippy="'Optimal artifacts applied, max population assumed'">
            {{ formatNumber(realisticSummary.layRate) }}/hr
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Shipping Cap</span>
          <span class="text-sm font-mono font-bold text-gray-900 leading-none py-1" v-tippy="'Optimal artifacts applied, max vehicles assumed'">
            {{ formatNumber(realisticSummary.shippingRate) }}/hr
          </span>
        </div>
        <div class="flex flex-col border-l border-gray-200 pl-6">
          <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1">ELR</span>
          <span class="text-sm font-mono font-bold text-gray-900 leading-none py-1" v-tippy="'The lower of the two rates'">
            {{ formatNumber(realisticSummary.elr) }}/hr
          </span>
        </div>
      </div>
      <p class="mt-2 text-[10px] text-gray-400 text-center italic leading-tight px-2">
        Note: These stats reflect performance after maxing habs, vehicles, and equipping optimal stone layout.
      </p>
    </div>

    <!-- Game View (Grouped by Tier) -->
    <ResearchGameView
      v-if="currentView === 'game'"
      :tiers="tiers"
      :research-by-tier="researchByTier"
      :tier-summaries="tierSummaries"
      :view-times="gameViewTimes"
      :levels="commonResearchStore.researchLevels"
      :get-research-price="getNextLevelPrice"
      :get-research-time-to-buy="getTimeToBuy"
      :get-research-time-to-buy-seconds="getTimeToBuySeconds"
      :is-research-sale-active="isResearchSaleActive"
      :research-sale-deadline="researchSaleDeadline"
      @buy="handleBuyResearch"
      @max="handleMaxResearch"
      @max-tier="handleMaxTier"
    />

    <!-- Flat/Sorted Views -->
    <ResearchFlatView
      v-else
      :sorted-researches="sortedResearches"
      :view="currentView"
      :thresholds="TIER_THRESHOLDS"
      :get-research-time-to-buy="getTimeToBuy"
      :get-research-time-to-buy-seconds="getTimeToBuySeconds"
      @buy="handleBuyResearch"
      @max="handleMaxResearch"
      @buy-to-here="handleBuyToHere"
    />

    <EventExpiryDialog
      v-if="showExpiryDialog"
      :event-name="expiryData.eventName"
      :end-time="expiryData.endTime"
      :completion-time="expiryData.completionTime"
      @confirm="handleExpiryConfirm"
      @cancel="handleExpiryCancel"
      @deactivate="handleExpiryDeactivate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  getDiscountedVirtuePrice,
  getCommonResearches,
  isTierUnlocked,
  type CommonResearch,
} from '@/calculations/commonResearch';
import { formatDuration, formatNumber } from '@/lib/format';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useActionsStore } from '@/stores/actions';
import { useSalesStore } from '@/stores/sales';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId } from '@/types';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { useResearchViews, VIEWS } from '@/composables/useResearchViews';
import { getTimeToSave } from '@/engine/apply';

// Sub-components
import ResearchSaleToggle from './ResearchSaleToggle.vue';
import SmartBuy from './SmartBuy.vue';
import ResearchViewSelector from './ResearchViewSelector.vue';
import ResearchGameView from './ResearchGameView.vue';
import ResearchFlatView from './ResearchFlatView.vue';
import ElrViewControls from './ElrViewControls.vue';
import EventExpiryDialog from '../EventExpiryDialog.vue';
import { useEventExpiry } from '@/composables/useEventExpiry';

const commonResearchStore = useCommonResearchStore();
const actionsStore = useActionsStore();
const salesStore = useSalesStore();
const { prepareExecution, completeExecution, batch } = useActionExecutor();
const {
  showExpiryDialog,
  expiryData,
  withExpiryCheck,
  confirm: handleExpiryConfirm,
  cancel: handleExpiryCancel,
  deactivateAndCancel: handleExpiryDeactivate,
} = useEventExpiry();

const smartBuyState = ref({ threshold: 0, alwaysOn: false });
let isSmartBuying = false;

const {
  currentView,
  elrViewMode,
  elrSortMode,
  viewDescription,
  costModifiers,
  isResearchSaleActive,
  tiers,
  researchByTier,
  tierSummaries,
  gameViewTimes,
  sortedResearches,
  realisticSummary,
  researchSaleDeadline,
  TIER_THRESHOLDS,
} = useResearchViews();

function getNextLevelPrice(research: CommonResearch): number {
  const currentLevel = commonResearchStore.researchLevels[research.id] || 0;
  if (currentLevel >= research.levels) return 0;
  return getDiscountedVirtuePrice(research, currentLevel, costModifiers.value, isResearchSaleActive.value);
}

function getTimeToBuy(research: CommonResearch): string {
  const price = getNextLevelPrice(research);
  const seconds = getTimeToSave(price, actionsStore.effectiveSnapshot);
  if (seconds <= 0) return '0s';
  if (seconds === Infinity) return '∞';
  return formatDuration(seconds);
}

function getTimeToBuySeconds(research: CommonResearch): number {
  const price = getNextLevelPrice(research);
  return getTimeToSave(price, actionsStore.effectiveSnapshot);
}

/**
 * Buy a single level of research and create the action.
 * Returns true if successful, false if already maxed.
 */
function buyOneLevel(research: CommonResearch): boolean {
  const currentLevel = commonResearchStore.researchLevels[research.id] || 0;
  if (currentLevel >= research.levels) return false;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  // Calculate cost based on current state (after restore if editing)
  const effectiveLevel = beforeSnapshot.researchLevels[research.id] || 0;
  const isSaleActive = beforeSnapshot.activeSales.research;
  const cost = getDiscountedVirtuePrice(research, effectiveLevel, costModifiers.value, isSaleActive);

  // Build payload
  const payload = {
    researchId: research.id,
    fromLevel: effectiveLevel,
    toLevel: effectiveLevel + 1,
  };

  // Compute dependencies (level N depends on the action that bought level N-1)
  const dependencies = computeDependencies(
    'buy_research',
    payload,
    actionsStore.actionsBeforeInsertion,
    actionsStore.initialSnapshot.researchLevels
  );

  // Apply to store
  commonResearchStore.setResearchLevel(research.id, effectiveLevel + 1);

  // Complete execution (computes snapshot, inserts/pushes action, replays if needed)
  completeExecution(
    {
      id: generateActionId(),
      timestamp: Date.now(),
      type: 'buy_research',
      payload,
      cost,
      dependsOn: dependencies,
    },
    beforeSnapshot
  );

  // Trigger automated sweep if Always On is enabled
  if (!isSmartBuying && smartBuyState.value.alwaysOn) {
    handleSmartBuy(smartBuyState.value.threshold);
  }

  return true;
}

// Automatically sweep when Always On is toggled on
watch(
  () => smartBuyState.value.alwaysOn,
  newVal => {
    if (newVal && !isSmartBuying) {
      handleSmartBuy(smartBuyState.value.threshold);
    }
  }
);

function handleBuyResearch(research: CommonResearch) {
  const duration = getTimeToBuySeconds(research);
  withExpiryCheck(duration, true, () => buyOneLevel(research));
}

function handleSmartBuy(threshold: number) {
  if (isSmartBuying) return;
  isSmartBuying = true;

  batch(() => {
    try {
      let itemBought = true;
      // Limit iterations to prevent infinite loops in edge cases
      let iterations = 0;
      const maxIterations = 2500;

      while (itemBought && iterations < maxIterations) {
        itemBought = false;
        iterations++;

        const all = getCommonResearches();
        const levels = commonResearchStore.researchLevels;
        const snapshot = actionsStore.effectiveSnapshot;
        const earnings = snapshot.offlineEarnings;
        const isSale = isResearchSaleActive.value;
        const mods = costModifiers.value;

        if (earnings <= 0) break;

        // Filter for unpurchased and unlocked
        // We only care about the very next level of each research
        const candidates = all
          .filter(r => {
            const level = levels[r.id] || 0;
            return level < r.levels && isTierUnlocked(levels, r.tier);
          })
          .map(r => {
            const level = levels[r.id] || 0;
            const price = getDiscountedVirtuePrice(r, level, mods, isSale);
            return {
              research: r,
              price,
              // Ignore bank so smart buy never factors in saved gems
              seconds: getTimeToSave(price, { ...snapshot, bankValue: 0 }),
            };
          });

        // Sort by price (Cheapest First order)
        candidates.sort((a, b) => a.price - b.price);

        // Find the first one below threshold
        const found = candidates.find(c => c.seconds <= threshold);
        if (found) {
          if (buyOneLevel(found.research)) {
            itemBought = true;
          }
        }
      }
    } finally {
      isSmartBuying = false;
    }
  });
}

function handleMaxResearch(research: CommonResearch) {
  // Estimate total duration for maxing
  const currentLevels = commonResearchStore.researchLevels[research.id] || 0;
  let totalDuration = 0;
  for (let l = currentLevels; l < research.levels; l++) {
    // This is an approximation as earnings might change, but good enough for warning
    totalDuration += getTimeToBuySeconds(research);
  }

  withExpiryCheck(totalDuration, true, () => {
    batch(() => {
      const maxLevel = research.levels;
      while ((commonResearchStore.researchLevels[research.id] || 0) < maxLevel) {
        if (!buyOneLevel(research)) break;
      }
    });
  });
}

function handleMaxTier(tier: number) {
  batch(() => {
    const researches = researchByTier.value.get(tier) || [];
    for (const research of researches) {
      const maxLevel = research.levels;
      while ((commonResearchStore.researchLevels[research.id] || 0) < maxLevel) {
        if (!buyOneLevel(research)) break;
      }
    }
  });
}

function handleBuyToHere(index: number) {
  const list = sortedResearches.value;
  if (index < 0 || index >= list.length) return;

  // Estimate total duration
  let totalDuration = 0;
  for (let i = 0; i <= index; i++) {
    totalDuration += getTimeToBuySeconds(list[i].research);
  }

  withExpiryCheck(totalDuration, true, () => {
    batch(() => {
      for (let i = 0; i <= index; i++) {
        const item = list[i];
        buyOneLevel(item.research);
      }
    });
  });
}

function handleToggleSale() {
  const beforeSnapshot = prepareExecution();
  const currentlyActive = beforeSnapshot.activeSales.research;

  const payload = {
    saleType: 'research' as const,
    active: !currentlyActive,
    multiplier: 0.3, // 70% off
  };

  // Update store state
  salesStore.setSaleActive('research', !currentlyActive);

  // Deactivate Smart Buy Always On whenever a sale is toggled
  smartBuyState.value.alwaysOn = false;

  completeExecution(
    {
      id: generateActionId(),
      timestamp: Date.now(),
      type: 'toggle_sale',
      payload,
      cost: 0,
      dependsOn: computeDependencies(
        'toggle_sale',
        payload,
        actionsStore.actionsBeforeInsertion,
        actionsStore.initialSnapshot.researchLevels
      ),
    },
    beforeSnapshot
  );
}
</script>

<template>
  <div class="space-y-4">
    <ResearchSaleToggle 
      :is-active="isResearchSaleActive" 
      @toggle="handleToggleSale" 
    />

    <ResearchViewSelector 
      v-model="currentView" 
      :views="VIEWS" 
    />

    <p class="text-sm text-gray-500 mb-4 px-1">
      {{ viewDescription }}
    </p>

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
      @buy="handleBuyResearch"
      @max="handleMaxResearch"
      @buy-to-here="handleBuyToHere"
    />
  </div>
</template>

<script setup lang="ts">
import {
  getDiscountedVirtuePrice,
  type CommonResearch,
} from '@/calculations/commonResearch';
import { formatDuration } from '@/lib/format';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useActionsStore } from '@/stores/actions';
import { useSalesStore } from '@/stores/sales';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId } from '@/types';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { useResearchViews, VIEWS } from '@/composables/useResearchViews';

// Sub-components
import ResearchSaleToggle from './ResearchSaleToggle.vue';
import ResearchViewSelector from './ResearchViewSelector.vue';
import ResearchGameView from './ResearchGameView.vue';
import ResearchFlatView from './ResearchFlatView.vue';

const commonResearchStore = useCommonResearchStore();
const actionsStore = useActionsStore();
const salesStore = useSalesStore();
const { prepareExecution, completeExecution } = useActionExecutor();

const {
  currentView,
  viewDescription,
  costModifiers,
  isResearchSaleActive,
  tiers,
  researchByTier,
  tierSummaries,
  gameViewTimes,
  sortedResearches,
  TIER_THRESHOLDS,
} = useResearchViews();

function getNextLevelPrice(research: CommonResearch): number {
  const currentLevel = commonResearchStore.researchLevels[research.id] || 0;
  if (currentLevel >= research.levels) return 0;
  return getDiscountedVirtuePrice(research, currentLevel, costModifiers.value, isResearchSaleActive.value);
}

function getTimeToBuy(research: CommonResearch): string {
  const price = getNextLevelPrice(research);
  if (price <= 0) return '';

  const snapshot = actionsStore.effectiveSnapshot;
  const offlineEarnings = snapshot.offlineEarnings;

  if (offlineEarnings <= 0) return '∞';

  const seconds = price / offlineEarnings;
  if (seconds < 1) return 'Instant';
  return formatDuration(seconds);
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
  const dependencies = computeDependencies('buy_research', payload, actionsStore.actionsBeforeInsertion);

  // Apply to store
  commonResearchStore.setResearchLevel(research.id, effectiveLevel + 1);

  // Complete execution (computes snapshot, inserts/pushes action, replays if needed)
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'buy_research',
    payload,
    cost,
    dependsOn: dependencies,
  }, beforeSnapshot);

  return true;
}

function handleBuyResearch(research: CommonResearch) {
  buyOneLevel(research);
}

function handleMaxResearch(research: CommonResearch) {
  const maxLevel = research.levels;
  while ((commonResearchStore.researchLevels[research.id] || 0) < maxLevel) {
    if (!buyOneLevel(research)) break;
  }
}

function handleMaxTier(tier: number) {
  const researches = researchByTier.value.get(tier) || [];
  for (const research of researches) {
    const maxLevel = research.levels;
    while ((commonResearchStore.researchLevels[research.id] || 0) < maxLevel) {
      if (!buyOneLevel(research)) break;
    }
  }
}

function handleBuyToHere(index: number) {
  const list = sortedResearches.value;
  if (index < 0 || index >= list.length) return;

  for (let i = 0; i <= index; i++) {
    const item = list[i];
    buyOneLevel(item.research);
  }
}

function handleToggleSale() {
  const beforeSnapshot = prepareExecution();
  const currentlyActive = beforeSnapshot.activeSales.research;

  const payload = {
    saleType: 'research' as const,
    active: !currentlyActive,
  };

  // Update store state
  salesStore.setSaleActive('research', !currentlyActive);

  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'toggle_sale',
    payload,
    cost: 0,
    dependsOn: computeDependencies('toggle_sale', payload, actionsStore.actionsBeforeInsertion),
  }, beforeSnapshot);
}
</script>

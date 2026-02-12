<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
        <span class="text-xs font-bold text-amber-900 uppercase tracking-tight">Research Sale (70% OFF)</span>
      </div>
      <button 
        @click="handleToggleSale"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
        :class="isResearchSaleActive ? 'bg-amber-500' : 'bg-gray-200'"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          :class="isResearchSaleActive ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>

    <!-- View Selection Tags -->
    <div class="flex flex-col gap-2 mb-4">
      <div class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sort Research By</div>
      <div class="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-lg shadow-inner">
        <button
          v-for="v in views"
          :key="v.id"
          @click="currentView = v.id"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap"
          :class="currentView === v.id 
            ? 'bg-white text-blue-600 shadow-sm' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'"
        >
          {{ v.label }}
        </button>
      </div>
    </div>

    <p class="text-sm text-gray-500 mb-4 px-1">
      {{ viewDescription }}
    </p>

    <!-- Game View (Grouped by Tier) -->
    <div v-if="currentView === 'game'" class="space-y-4">
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
              @click.stop="handleMaxTier(tier)"
            >
              Max Tier
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
            :current-level="getCurrentLevel(research.id)"
            :price="getNextLevelPrice(research)"
            :time-to-buy="getTimeToBuy(research)"
            :can-buy="canBuyResearch(research)"
            :is-maxed="getCurrentLevel(research.id) >= research.levels"
            :show-max="true"
            @buy="handleBuyResearch(research)"
            @max="handleMaxResearch(research)"
          />
        </div>
      </div>
    </div>

    <!-- Flat/Sorted Views -->
    <div v-else class="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 bg-white">
      <template v-for="(item, idx) in sortedResearches" :key="`${item.research.id}-${item.targetLevel}`">
        <!-- Tier Break Divider (Cheapest First) -->
        <div v-if="item.showDivider" class="px-4 py-1.5 bg-blue-50 border-y border-blue-100 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span class="text-[10px] font-black text-blue-800 uppercase tracking-widest">
              Tier {{ item.unlockTier }} Unlocked
            </span>
          </div>
          <span class="text-[10px] text-blue-600 font-bold tracking-tighter uppercase">
            {{ TIER_THRESHOLDS[item.unlockTier - 1] }} Purchases Reached
          </span>
        </div>
        
        <ResearchItem
          :research="item.research"
          :current-level="item.currentLevel"
          :target-level="item.targetLevel"
          :price="item.price"
          :time-to-buy="item.timeToBuy"
          :can-buy="item.canBuy"
          :is-maxed="item.isMaxed"
          :show-max="false"
          :show-tier="true"
          :show-buy-to-here="currentView === 'cheapest'"
          :can-buy-to-here="currentView === 'cheapest' ? true : item.canBuyToHere"
          :buy-to-here-time="item.buyToHereTime"
          :extra-stats="item.extraStats"
          :extra-label="item.extraLabel"
          @buy="handleBuyResearch(item.research)"
          @max="handleMaxResearch(item.research)"
          @buy-to-here="handleBuyToHere(idx)"
        />
      </template>
      
      <div v-if="sortedResearches.length === 0" class="px-4 py-8 text-center text-gray-500 italic bg-gray-50">
        No researches match this criteria or all are maxed.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  getCommonResearches,
  getTiers,
  getResearchByTier,
  getTierSummary,
  getDiscountedVirtuePrice,
  isTierUnlocked,
  TIER_UNLOCK_THRESHOLDS,
  type CommonResearch,
  type ResearchCostModifiers,
} from '@/calculations/commonResearch';
import { formatNumber, formatDuration } from '@/lib/format';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useSalesStore } from '@/stores/sales';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId } from '@/types';
import { useActionExecutor } from '@/composables/useActionExecutor';
import ResearchItem from './ResearchItem.vue';

// Engine imports for ROI calculations
import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import { applyAction } from '@/engine/apply';

// Calculation imports for potential impact
import { calculateMaxVehicleSlots, calculateMaxTrainLength } from '@/calculations/shippingCapacity';

type ViewType = 'game' | 'cheapest' | 'roi' | 'elr';

const currentView = ref<ViewType>('game');

const views = [
  { id: 'game', label: 'Game View' },
  { id: 'cheapest', label: 'Cheapest First' },
  { id: 'roi', label: 'Earnings ROI' },
  { id: 'elr', label: 'ELR Impact' },
] as const;

const viewDescription = computed(() => {
  switch (currentView.value) {
    case 'game': return 'Grouped by tier, exactly like the game. Best for familiar navigation.';
    case 'cheapest': return 'All unpurchased researches sorted by price. Strategically unlock tiers with "Buy to here".';
    case 'roi': return 'Prioritizes upgrades that pay for themselves fastest based on your current earnings.';
    case 'elr': return 'Sorts by theoretical maximum potential impact to Egg Laying Rate, ignoring current bottlenecks.';
    default: return '';
  }
});

const commonResearchStore = useCommonResearchStore();
const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const salesStore = useSalesStore();
const { prepareExecution, completeExecution } = useActionExecutor();

// Expose thresholds to template
const TIER_THRESHOLDS = TIER_UNLOCK_THRESHOLDS;

// Track expanded tiers
const expandedTiers = ref(new Set<number>([1]));

function toggleTier(tier: number) {
  if (expandedTiers.value.has(tier)) {
    expandedTiers.value.delete(tier);
  } else {
    expandedTiers.value.add(tier);
  }
}

// Get all tiers
const tiers = computed(() => getTiers());

// Get research by tier
const researchByTier = computed(() => getResearchByTier());

function getResearchesForTier(tier: number): CommonResearch[] {
  return researchByTier.value.get(tier) || [];
}

// Cost modifiers
const costModifiers = computed<ResearchCostModifiers>(() => ({
  labUpgradeLevel: initialStateStore.epicResearchLevels['cheaper_research'] || 0,
  waterballoonMultiplier: initialStateStore.colleggtibleModifiers.researchCost,
  puzzleCubeMultiplier: initialStateStore.artifactModifiers.researchCost.totalMultiplier,
}));

const isResearchSaleActive = computed(() => actionsStore.effectiveSnapshot.activeSales.research);

// Tier summaries
const tierSummaries = computed(() => {
  const summaries: Record<number, ReturnType<typeof getTierSummary>> = {};
  for (const tier of tiers.value) {
    summaries[tier] = getTierSummary(tier, commonResearchStore.researchLevels, costModifiers.value, isResearchSaleActive.value);
  }
  return summaries;
});

function getCurrentLevel(researchId: string): number {
  return commonResearchStore.researchLevels[researchId] || 0;
}

function getNextLevelPrice(research: CommonResearch): number {
  const currentLevel = getCurrentLevel(research.id);
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

function canBuyResearch(research: CommonResearch): boolean {
  return isTierUnlocked(commonResearchStore.researchLevels, research.tier);
}

function isTierMaxed(tier: number): boolean {
  const summary = tierSummaries.value[tier];
  if (!summary) return true;
  return summary.purchasedLevels >= summary.totalLevels;
}

// Evaluation IDs for ELR Impact
const FLEET_RESEARCH_IDS = ['vehicle_reliablity', 'excoskeletons', 'traffic_management', 'egg_loading_bots', 'autonomous_vehicles'];
const TRAIN_CAR_RESEARCH_ID = 'micro_coupling';

// Research categories to exclude from specific views
const ROI_EXCLUDED_CATEGORIES = ['hatchery_capacity', 'internal_hatchery_rate', 'running_chicken_bonus', 'hatchery_refill_rate'];
const ELR_EXCLUDED_CATEGORIES = ['hatchery_capacity', 'internal_hatchery_rate', 'running_chicken_bonus', 'hatchery_refill_rate', 'egg_value'];

/**
 * Sorted Researches for Cheapest/ROI/ELR views
 */
const sortedResearches = computed(() => {
  if (currentView.value === 'game') return [];

  const all = getCommonResearches();
  const researchLevels = commonResearchStore.researchLevels;
  const isSale = isResearchSaleActive.value;
  const mods = costModifiers.value;

  // Filter out excluded categories for ROI and ELR views
  const filterByCategories = (r: CommonResearch) => {
    if (currentView.value === 'game' || currentView.value === 'cheapest') return true;
    
    const categories = r.categories.split(',').map(c => c.trim());
    const excluded = currentView.value === 'roi' ? ROI_EXCLUDED_CATEGORIES : ELR_EXCLUDED_CATEGORIES;
    
    return !categories.some(c => excluded.includes(c));
  };

  if (currentView.value === 'cheapest') {
    // 1. Flatten EVERY unpurchased level
    const unpurchased: any[] = [];
    all.forEach(r => {
      const currentLevel = researchLevels[r.id] || 0;
      for (let lvl = currentLevel; lvl < r.levels; lvl++) {
        unpurchased.push({
          research: r,
          targetLevel: lvl + 1,
          price: getDiscountedVirtuePrice(r, lvl, mods, isSale),
        });
      }
    });
    // Sort all individual levels by price
    unpurchased.sort((a, b) => a.price - b.price);

    // 2. Iterative construction with tier stashing
    const result: any[] = [];
    const pool: any[] = [];
    
    // Simulation state for cumulative earnings
    const context = getSimulationContext();
    const baseSnapshot = actionsStore.effectiveSnapshot;
    let currentSimState = createBaseEngineState(baseSnapshot);
    let currentSimSnapshot = baseSnapshot;
    let totalSeconds = 0;

    const formatTimeToBuy = (price: number, earnings: number): string => {
      if (price <= 0) return '';
      if (earnings <= 0) return '∞';
      const seconds = price / earnings;
      if (seconds < 1) return 'Instant';
      return formatDuration(seconds);
    };

    const processed = new Set<string>();

    const processItem = (item: any) => {
      const r = item.research;
      const key = `${r.id}-${item.targetLevel}`;
      if (processed.has(key)) return;

      const actuallyUnlocked = isTierUnlocked(currentSimState.researchLevels, r.tier);

      if (actuallyUnlocked) {
        processed.add(key);
        // Did we just unlock a new tier?
        let highestUnlockedBefore = Array.from({length: 13}, (_, i) => i + 1)
          .reverse().find(t => isTierUnlocked(currentSimState.researchLevels, t)) || 1;

        const itemSeconds = currentSimSnapshot.offlineEarnings > 0 ? item.price / currentSimSnapshot.offlineEarnings : 0;
        totalSeconds += itemSeconds;

        // Add to result using the SITUATIONAL earnings (after previous purchases)
        result.push({
          research: r,
          targetLevel: item.targetLevel,
          price: item.price,
          currentLevel: researchLevels[r.id] || 0,
          timeToBuy: formatTimeToBuy(item.price, currentSimSnapshot.offlineEarnings),
          buyToHereTime: totalSeconds > 0 ? formatDuration(totalSeconds) : 'Instant',
          canBuy: true, // Always allow sequential purchases in Cheapest view
          isMaxed: false,
          showDivider: item.showDivider || false,
          unlockTier: item.unlockTier || 0,
        });

        // "Purchase" exactly 1 level for simulation
        currentSimState = {
          ...currentSimState,
          researchLevels: {
            ...currentSimState.researchLevels,
            [r.id]: (currentSimState.researchLevels[r.id] || 0) + 1
          }
        };

        // RE-COMPUTE snapshot to catch earnings/ELR updates
        currentSimSnapshot = computeSnapshot(currentSimState, context);

        // Check if new tiers unlocked
        const getMaxUnlocked = () => Array.from({length: 13}, (_, i) => i + 1)
          .reverse().find(t => isTierUnlocked(currentSimState.researchLevels, t)) || 1;
        
        let highestAfter = getMaxUnlocked();
        
        if (highestAfter > highestUnlockedBefore) {
          // Re-check pool for any items that are now unlocked
          for (let i = 0; i < pool.length; i++) {
            const poolTier = pool[i].research.tier;
            if (isTierUnlocked(currentSimState.researchLevels, poolTier)) {
              const stashed = pool.splice(i, 1)[0];
              
              // If this item is from a tier we just "passed", show a divider
              if (poolTier > highestUnlockedBefore) {
                stashed.showDivider = true;
                stashed.unlockTier = poolTier;
                highestUnlockedBefore = poolTier; // Advance threshold so next items in this tier don't get dividers
              }
              
              processItem(stashed);
              i = -1; // Restart loop
            }
          }
        }
      } else {
        pool.push(item);
      }
    };

    unpurchased.forEach(item => {
      processItem(item);
    });

    // Add remaining pool items (truly locked or beyond simulation scope)
    pool.forEach(item => {
      const r = item.research;
      const key = `${r.id}-${item.targetLevel}`;
      if (!processed.has(key)) {
        processed.add(key);
        const itemSeconds = currentSimSnapshot.offlineEarnings > 0 ? item.price / currentSimSnapshot.offlineEarnings : 0;
        totalSeconds += itemSeconds;

        result.push({
          research: r,
          targetLevel: item.targetLevel,
          price: item.price,
          currentLevel: researchLevels[r.id] || 0,
          timeToBuy: formatTimeToBuy(item.price, currentSimSnapshot.offlineEarnings),
          buyToHereTime: totalSeconds > 0 ? formatDuration(totalSeconds) : 'Instant',
          canBuy: true,
          isMaxed: false,
        });
      }
    });

    // canBuyToHere logic: sequential connectivity from current state
    let pathUnlocked = true;
    for (const item of result) {
      if (!isTierUnlocked(researchLevels, item.research.tier)) {
        pathUnlocked = false;
      }
      item.canBuyToHere = pathUnlocked;
    }

    return result;
  }

  if (currentView.value === 'roi') {
    // Earnings ROI
    const context = getSimulationContext();
    const effectiveSnapshot = actionsStore.effectiveSnapshot;
    const baseState = createBaseEngineState(effectiveSnapshot);
    const currentEarnings = effectiveSnapshot.offlineEarnings;

    if (currentEarnings <= 0) return [];

    const unpurchased = all.filter(r => (researchLevels[r.id] || 0) < r.levels && filterByCategories(r));
    
    // Deduplicate by research ID to ensure only one entry per research
    const uniqueUnpurchased = Array.from(new Map(unpurchased.map(r => [r.id, r])).values());
    
    const candidates = uniqueUnpurchased.map(r => {
      const level = researchLevels[r.id] || 0;
      const price = getDiscountedVirtuePrice(r, level, mods, isSale);
      const canBuy = isTierUnlocked(researchLevels, r.tier);
      
      // Simulate buying 1 level
      const tempAction = {
        id: 'tmp',
        type: 'buy_research' as const,
        payload: { researchId: r.id, fromLevel: level, toLevel: level + 1 },
        cost: price,
        timestamp: Date.now(),
        dependsOn: [],
      };
      
      const nextState = applyAction(baseState, tempAction as any);
      const nextSnapshot = computeSnapshot(nextState, context);
      const newEarnings = nextSnapshot.offlineEarnings;
      
      const delta = newEarnings - currentEarnings;
      const roiSeconds = delta > 0 ? price / delta : Infinity;

      return {
        research: r,
        price,
        currentLevel: level,
        targetLevel: level + 1,
        timeToBuy: getTimeToBuy(r),
        canBuy,
        isMaxed: false,
        roiSeconds,
        roiLabel: delta > 0 ? formatDuration(roiSeconds) : 'No Impact',
      };
    })
    .filter(c => c.roiSeconds !== Infinity)
    .sort((a, b) => {
      // Primary sort: Unlocked (canBuy) first
      if (a.canBuy !== b.canBuy) {
        return a.canBuy ? -1 : 1;
      }
      // Secondary sort: Ascending ROI
      return a.roiSeconds - b.roiSeconds;
    });

    return candidates.map(c => ({
      ...c,
      extraStats: c.roiLabel,
      extraLabel: 'Payback',
    }));
  }

  if (currentView.value === 'elr') {
    // ELR Impact (Relative Potential Max)
    const effectiveSnapshot = actionsStore.effectiveSnapshot;
    
    const currentSlots = calculateMaxVehicleSlots(researchLevels);
    const currentMaxCars = calculateMaxTrainLength(researchLevels);

    const unpurchased = all.filter(r => (researchLevels[r.id] || 0) < r.levels && filterByCategories(r));
    
    // Deduplicate by research ID to ensure only one entry per research
    const uniqueUnpurchased = Array.from(new Map(unpurchased.map(r => [r.id, r])).values());
    
    const candidates = uniqueUnpurchased.map(r => {
      const level = researchLevels[r.id] || 0;
      const price = getDiscountedVirtuePrice(r, level, mods, isSale);
      let impact = 0;

      if (FLEET_RESEARCH_IDS.includes(r.id)) {
        impact = 1 / currentSlots;
      } else if (r.id === TRAIN_CAR_RESEARCH_ID) {
        impact = 1 / currentMaxCars;
      } else {
        // Lay Rate or Hab Capacity (Percentage increase)
        // Formula: perLevel / (1 + currentLevel * perLevel)
        impact = r.per_level / (1 + (level * r.per_level));
      }

      return {
        research: r,
        price,
        currentLevel: level,
        targetLevel: level + 1,
        timeToBuy: getTimeToBuy(r),
        canBuy: isTierUnlocked(researchLevels, r.tier),
        isMaxed: false,
        impact,
      };
    })
    .filter(c => c.impact > 0)
    .sort((a, b) => {
      // Primary sort: Unlocked (canBuy) first
      if (a.canBuy !== b.canBuy) {
        return a.canBuy ? -1 : 1;
      }
      // Secondary sort: Descending impact
      return b.impact - a.impact;
    });

    return candidates.map(c => ({
      ...c,
      extraStats: `+${(c.impact * 100).toFixed(3)}%`,
      extraLabel: 'Impact',
    }));
  }

  return [];
});

/**
 * Buy a single level of research and create the action.
 * Returns true if successful, false if already maxed.
 */
function buyOneLevel(research: CommonResearch): boolean {
  const currentLevel = getCurrentLevel(research.id);
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

/**
 * Buy all remaining levels of a single research.
 */
function handleMaxResearch(research: CommonResearch) {
  const maxLevel = research.levels;
  while (getCurrentLevel(research.id) < maxLevel) {
    if (!buyOneLevel(research)) break;
  }
}

/**
 * Buy all remaining levels of all research in a tier.
 * Processes research in order, buying all levels of each before moving to the next.
 */
function handleMaxTier(tier: number) {
  const researches = getResearchesForTier(tier);
  for (const research of researches) {
    const maxLevel = research.levels;
    while (getCurrentLevel(research.id) < maxLevel) {
      if (!buyOneLevel(research)) break;
    }
  }
}

/**
 * Buy everything up to the selected index in the sorted list.
 */
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

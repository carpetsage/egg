import { ref, computed, watch } from 'vue';
import {
  getCommonResearches,
  getResearchById,
  getTiers,
  getResearchByTier,
  getTierSummary,
  getDiscountedVirtuePrice,
  isTierUnlocked,
  TIER_UNLOCK_THRESHOLDS,
  type CommonResearch,
} from '@/calculations/commonResearch';
import { formatDuration, formatAbsoluteTime } from '@/lib/format';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import { applyAction, applyTime, getTimeToSave, calculateEarningsForTime } from '@/engine/apply';
import { calculateMaxVehicleSlots, calculateMaxTrainLength, calculateShippingCapacity } from '@/calculations/shippingCapacity';
import type { SimulationContext, EngineState } from '@/engine/types';
import { getNextPacificTime } from '@/lib/events';
import { type CalculationsSnapshot } from '@/types';
import { getOptimalELRSet } from '@/lib/artifacts/virtue';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { calculateLayRate } from '@/calculations/layRate';
import { calculateEffectiveLayRate } from '@/calculations/effectiveLayRate';
import { calculateHabCapacity_Full } from '@/calculations/habCapacity';
import { computeRealisticELR } from '@/calculations/realisticELR';
import { calculateResearchROI } from '@/calculations/researchROI';
import { createSimAction } from '@/types/actions/meta';

export type ViewType = 'game' | 'cheapest' | 'roi' | 'elr' | 'milestones';
export type ElrViewMode = 'realistic' | 'potential';
export type ElrSortMode = 'efficiency' | 'impact';
export type RoiMode = 'immediate' | 'maxed_vehicles';

export type MilestoneTarget =
  | { kind: 'tier'; tier: number }
  | { kind: 'research'; researchId: string; targetLevel: number };

function buildMaxVehiclesSnapshot(
  baseSnapshot: CalculationsSnapshot,
  researchLevels: Record<string, number>,
  context: SimulationContext
): CalculationsSnapshot {
  const maxSlots = calculateMaxVehicleSlots(researchLevels);
  const maxTrainLen = calculateMaxTrainLength(researchLevels);
  const engineState = createBaseEngineState(baseSnapshot);
  const modifiedState = {
    ...engineState,
    researchLevels,
    vehicles: Array(maxSlots).fill(null).map(() => ({ vehicleId: 11, trainLength: maxTrainLen })),
  };
  return computeSnapshot(modifiedState, context);
}

/**
 * Common interface for research items across different views.
 */
export interface ResearchViewItem {
  research: CommonResearch;
  targetLevel: number;
  currentLevel: number;
  price: number;
  timeToBuy: string;
  timeToBuySeconds: number;
  canBuy: boolean;
  isMaxed: boolean;
  canBuyToHere?: boolean;

  // ROI specific
  roiSeconds?: number;
  totalRoiSeconds?: number;
  roiLabel?: string;
  totalRoiLabel?: string;
  isLaying?: boolean;
  isShipping?: boolean;
  recommendationNote?: string;
  showSaleWarning?: boolean;
  showDeadlineWarning?: boolean;

  // ELR specific
  impact?: number;
  hpp?: number;

  // Cheapest specific / generic
  buyToHereTime?: string;
  buyToHereSeconds?: number;
  showDivider?: boolean;
  unlockTier?: number;
  extraStats?: string;
  extraLabel?: string;
  extraSeconds?: number;
  buyToHereTooltip?: string;
  realisticStats?: { layRate: number; shippingRate: number; elr: number; elrDelta: number };
}

export const VIEWS = [
  { id: 'game', label: 'Game View', description: 'Grouped by tier, exactly like the game.' },
  { id: 'cheapest', label: 'Cheapest First', description: 'All unpurchased researches sorted by price.' },
  { id: 'roi', label: 'Earnings ROI', description: 'Prioritizes upgrades that pay for themselves fastest.' },
  { id: 'elr', label: 'Delivery Impact', description: 'Sorted by impact to your Delivery Rate.' },
  { id: 'milestones', label: 'Milestones', description: 'Fastest ROI path to a tier unlock or research level.' },
] as const;

const RESEARCH_VIEW_STORAGE_KEY = 'ascension_research_view';
const ELR_VIEW_MODE_STORAGE_KEY = 'ascension_research_elr_view_mode';
const ELR_SORT_MODE_STORAGE_KEY = 'ascension_research_elr_sort_mode';
const DELIVERY_IMPACT_ONLY_STORAGE_KEY = 'ascension_research_delivery_impact_only';
const ROI_MODE_STORAGE_KEY = 'ascension_research_roi_mode';
const MILESTONE_TARGET_STORAGE_KEY = 'ascension_research_milestone_target';

function loadStoredResearchView(): ViewType {
  const stored = localStorage.getItem(RESEARCH_VIEW_STORAGE_KEY);
  return VIEWS.some(v => v.id === stored) ? (stored as ViewType) : 'game';
}

function loadStoredElrViewMode(): ElrViewMode {
  const stored = localStorage.getItem(ELR_VIEW_MODE_STORAGE_KEY);
  return stored === 'realistic' || stored === 'potential' ? stored : 'realistic';
}

function loadStoredElrSortMode(): ElrSortMode {
  const stored = localStorage.getItem(ELR_SORT_MODE_STORAGE_KEY);
  return stored === 'efficiency' || stored === 'impact' ? stored : 'efficiency';
}

function loadStoredDeliveryImpactOnly(): boolean {
  return localStorage.getItem(DELIVERY_IMPACT_ONLY_STORAGE_KEY) === 'true';
}

function loadStoredRoiMode(): RoiMode {
  const stored = localStorage.getItem(ROI_MODE_STORAGE_KEY);
  return stored === 'immediate' || stored === 'maxed_vehicles' ? stored : 'immediate';
}

function loadStoredMilestoneTarget(): MilestoneTarget | null {
  const stored = localStorage.getItem(MILESTONE_TARGET_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (parsed?.kind === 'tier' && typeof parsed.tier === 'number') {
      return { kind: 'tier', tier: parsed.tier };
    }
    if (parsed?.kind === 'research' && typeof parsed.researchId === 'string' && typeof parsed.targetLevel === 'number') {
      return { kind: 'research', researchId: parsed.researchId, targetLevel: parsed.targetLevel };
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

// Evaluation IDs for ELR Impact
const FLEET_RESEARCH_IDS = [
  'vehicle_reliablity',
  'excoskeletons',
  'traffic_management',
  'egg_loading_bots',
  'autonomous_vehicles',
];
const TRAIN_CAR_RESEARCH_ID = 'micro_coupling';

// Research categories to exclude from specific views
const ROI_EXCLUDED_CATEGORIES = [
  'hatchery_capacity',
  'internal_hatchery_rate',
  'running_chicken_bonus',
  'hatchery_refill_rate',
];
const ELR_EXCLUDED_CATEGORIES = [
  'hatchery_capacity',
  'internal_hatchery_rate',
  'running_chicken_bonus',
  'hatchery_refill_rate',
  'egg_value',
];



const DELIVERY_IMPACT_CATEGORIES = new Set(['hab_capacity', 'fleet_size', 'egg_laying_rate', 'shipping_capacity']);

export function useResearchViews() {
  const commonResearchStore = useCommonResearchStore();
  const initialStateStore = useInitialStateStore();
  const actionsStore = useActionsStore();
  const virtueStore = useVirtueStore();

  const currentView = ref<ViewType>(loadStoredResearchView());
  watch(currentView, v => localStorage.setItem(RESEARCH_VIEW_STORAGE_KEY, v));
  const elrViewMode = ref<ElrViewMode>(loadStoredElrViewMode());
  watch(elrViewMode, v => localStorage.setItem(ELR_VIEW_MODE_STORAGE_KEY, v));
  const elrSortMode = ref<ElrSortMode>(loadStoredElrSortMode());
  watch(elrSortMode, v => localStorage.setItem(ELR_SORT_MODE_STORAGE_KEY, v));
  const deliveryImpactOnly = ref(loadStoredDeliveryImpactOnly());
  watch(deliveryImpactOnly, v => localStorage.setItem(DELIVERY_IMPACT_ONLY_STORAGE_KEY, String(v)));
  const roiMode = ref<RoiMode>(loadStoredRoiMode());
  watch(roiMode, v => localStorage.setItem(ROI_MODE_STORAGE_KEY, v));
  const milestoneTarget = ref<MilestoneTarget | null>(loadStoredMilestoneTarget());
  watch(
    milestoneTarget,
    v => {
      if (v) {
        localStorage.setItem(MILESTONE_TARGET_STORAGE_KEY, JSON.stringify(v));
      } else {
        localStorage.removeItem(MILESTONE_TARGET_STORAGE_KEY);
      }
    },
    { deep: true }
  );

  const realisticSummary = computed(() => {
    const rawBackup = initialStateStore.rawBackup;
    if (!rawBackup || elrViewMode.value !== 'realistic') return null;

    const researchLevels = commonResearchStore.researchLevels;
    const context = getSimulationContext();
    
    const optimal = getOptimalELRSet(rawBackup, {
      assumeMaxHabsVehicles: true,
      excludeGusset: false,
      commonResearch: researchLevels,
      epicResearchLevels: context.epicResearchLevels,
      colleggtibleModifiers: context.colleggtibleModifiers,
    });
    const artifactMods = calculateArtifactModifiers(optimal);
    const stats = computeRealisticELR(researchLevels, artifactMods, context.epicResearchLevels, context.colleggtibleModifiers);

    return {
      layRate: stats.layRate * 3600,
      shippingRate: stats.shippingRate * 3600,
      elr: stats.effectiveRate * 3600,
    };
  });

  const viewDescription = computed(() => {
    switch (currentView.value) {
      case 'game':
        return 'Grouped by tier, exactly like the game. Best for familiar navigation.';
      case 'cheapest':
        return 'All unpurchased researches sorted by price. Strategically unlock tiers with "Buy to here".';
      case 'roi':
        return 'Prioritizes upgrades that pay for themselves fastest based on your current earnings.';
      case 'elr': {
        const view = elrViewMode.value;
        const sort = elrSortMode.value;
        if (view === 'potential' && sort === 'efficiency') {
          return 'Theoretical max impact to Delivery Rate, sorted by time efficiency.';
        } else if (view === 'potential' && sort === 'impact') {
          return 'Theoretical max impact to Delivery Rate, sorted by total impact.';
        } else if (view === 'realistic' && sort === 'efficiency') {
          return 'True Delivery Rate impact with optimal artifacts and max habs/vehicles, sorted by time efficiency.';
        } else {
          return 'True Delivery Rate impact with optimal artifacts and max habs/vehicles, sorted by total impact.';
        }
      }
      case 'milestones':
        return 'Pick a tier unlock or a specific research level, and see the fastest ROI-optimal path to it.';
      default:
        return '';
    }
  });

  const costModifiers = computed(() => ({
    labUpgradeLevel: initialStateStore.epicResearchLevels['cheaper_research'] || 0,
    waterballoonMultiplier: initialStateStore.colleggtibleModifiers.researchCost,
    puzzleCubeMultiplier: initialStateStore.artifactModifiers.researchCost.totalMultiplier,
  }));

  const isResearchSaleActive = computed(() => actionsStore.effectiveSnapshot.activeSales.research);

  const tiers = computed(() => getTiers());
  const researchByTier = computed(() => getResearchByTier());

  const milestoneNextLockedTier = computed(() => {
    const levels = commonResearchStore.researchLevels;
    return tiers.value.find(tier => !isTierUnlocked(levels, tier)) ?? null;
  });

  const milestoneResearchOptions = computed(() => {
    const levels = commonResearchStore.researchLevels;
    return getCommonResearches()
      .filter(r => (levels[r.id] || 0) < r.levels && isTierUnlocked(levels, r.tier))
      .map(r => ({ research: r, currentLevel: levels[r.id] || 0 }));
  });

  const tierSummaries = computed(() => {
    const summaries: Record<number, ReturnType<typeof getTierSummary>> = {};
    for (const tier of tiers.value) {
      summaries[tier] = getTierSummary(
        tier,
        commonResearchStore.researchLevels,
        costModifiers.value,
        isResearchSaleActive.value
      );
    }
    return summaries;
  });

  const researchSaleDeadline = computed(() => {
    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - offset);
    return getNextPacificTime(6, 9, absoluteSimTime);
  });

  function isMilestoneReached(target: MilestoneTarget, levels: Record<string, number>): boolean {
    return target.kind === 'tier' ? isTierUnlocked(levels, target.tier) : (levels[target.researchId] || 0) >= target.targetLevel;
  }

  const MILESTONE_MAX_STEPS = 2000;

  // For a "research level" milestone there's always a well-defined fallback: just save up and buy
  // the target directly. So a detour through some other research is only worth suggesting if it
  // provably shortens the total time versus that direct purchase — not merely because the detour
  // has good ROI in isolation (a great-ROI item can still make you arrive at the target *later*,
  // since you also have to spend time saving up for the detour itself).
  function computeResearchMilestoneChain(target: { researchId: string; targetLevel: number }, context: SimulationContext) {
    const mods = costModifiers.value;
    const isSale = isResearchSaleActive.value;

    const targetResearch = getResearchById(target.researchId);

    let state = createBaseEngineState(actionsStore.effectiveSnapshot);
    let snapshot = actionsStore.effectiveSnapshot;
    let totalSeconds = 0;
    const items: ResearchViewItem[] = [];

    if (!targetResearch) return { items, reached: false, totalSeconds };

    while (items.length < MILESTONE_MAX_STEPS && (state.researchLevels[targetResearch.id] || 0) < target.targetLevel) {
      const levels = state.researchLevels;
      const targetLevel = levels[targetResearch.id] || 0;
      const targetPrice = getDiscountedVirtuePrice(targetResearch, targetLevel, mods, isSale);
      const directSeconds = getTimeToSave(targetPrice, snapshot);

      let best: { research: CommonResearch; level: number; price: number; secondsToBuy: number; pathSeconds: number } | null = null;

      for (const r of getCommonResearches()) {
        if (r.id === targetResearch.id) continue;
        const level = levels[r.id] || 0;
        if (level >= r.levels || !isTierUnlocked(levels, r.tier)) continue;

        const price = getDiscountedVirtuePrice(r, level, mods, isSale);
        const secondsToBuy = getTimeToSave(price, snapshot);
        if (secondsToBuy === Infinity) continue;

        const stateAfter = applyTime(
          applyAction(state, {
            type: 'buy_research',
            payload: { researchId: r.id, fromLevel: level, toLevel: level + 1 },
            cost: price,
          }),
          secondsToBuy,
          snapshot
        );
        const snapshotAfter = computeSnapshot(stateAfter, context);
        const secondsToTargetAfter = getTimeToSave(targetPrice, snapshotAfter);
        const pathSeconds = secondsToBuy + secondsToTargetAfter;

        if (pathSeconds < directSeconds && (!best || pathSeconds < best.pathSeconds)) {
          best = { research: r, level, price, secondsToBuy, pathSeconds };
        }
      }

      if (best) {
        totalSeconds += best.secondsToBuy;
        state = applyAction(state, {
          type: 'buy_research',
          payload: { researchId: best.research.id, fromLevel: best.level, toLevel: best.level + 1 },
          cost: best.price,
        });
        state = applyTime(state, best.secondsToBuy, snapshot);
        snapshot = computeSnapshot(state, context);

        const timeSaved = directSeconds - best.pathSeconds;
        items.push({
          research: best.research,
          targetLevel: best.level + 1,
          currentLevel: best.level,
          price: best.price,
          timeToBuy: best.secondsToBuy < 0.1 ? '0s' : formatDuration(best.secondsToBuy),
          timeToBuySeconds: best.secondsToBuy,
          buyToHereTime: totalSeconds < 0.1 ? '0s' : formatDuration(totalSeconds),
          buyToHereSeconds: totalSeconds,
          canBuy: true,
          isMaxed: false,
          canBuyToHere: true,
          extraStats: isFinite(timeSaved) ? formatDuration(timeSaved) : '—',
          extraLabel: 'Saves',
        });
      } else {
        if (directSeconds === Infinity) break;

        totalSeconds += directSeconds;
        state = applyAction(state, {
          type: 'buy_research',
          payload: { researchId: targetResearch.id, fromLevel: targetLevel, toLevel: targetLevel + 1 },
          cost: targetPrice,
        });
        state = applyTime(state, directSeconds, snapshot);
        snapshot = computeSnapshot(state, context);

        items.push({
          research: targetResearch,
          targetLevel: targetLevel + 1,
          currentLevel: targetLevel,
          price: targetPrice,
          timeToBuy: directSeconds < 0.1 ? '0s' : formatDuration(directSeconds),
          timeToBuySeconds: directSeconds,
          buyToHereTime: totalSeconds < 0.1 ? '0s' : formatDuration(totalSeconds),
          buyToHereSeconds: totalSeconds,
          canBuy: true,
          isMaxed: false,
          canBuyToHere: true,
        });
      }
    }

    return { items, reached: (state.researchLevels[targetResearch.id] || 0) >= target.targetLevel, totalSeconds };
  }

  // Tier-unlock milestone, cheapest-first strategy from an arbitrary starting point: buys whatever's
  // cheapest (ignoring ROI) until the tier unlocks. Much cheaper to compute per step than the ROI
  // strategy (just a price compare, no ROI/snapshot projection).
  function simulateCheapestFirstTierChain(
    state: EngineState,
    snapshot: CalculationsSnapshot,
    totalSecondsSoFar: number,
    target: { tier: number },
    context: SimulationContext
  ) {
    const mods = costModifiers.value;
    const isSale = isResearchSaleActive.value;

    let curState = state;
    let curSnapshot = snapshot;
    let totalSeconds = totalSecondsSoFar;
    const items: ResearchViewItem[] = [];

    while (items.length < MILESTONE_MAX_STEPS && !isTierUnlocked(curState.researchLevels, target.tier)) {
      const levels = curState.researchLevels;

      const candidates = getCommonResearches()
        .filter(r => (levels[r.id] || 0) < r.levels && isTierUnlocked(levels, r.tier))
        .map(r => {
          const level = levels[r.id] || 0;
          return { research: r, level, price: getDiscountedVirtuePrice(r, level, mods, isSale) };
        });

      if (candidates.length === 0) break;

      candidates.sort((a, b) => a.price - b.price);
      const best = candidates[0];
      const secondsToBuy = getTimeToSave(best.price, curSnapshot);
      if (secondsToBuy === Infinity) break;

      totalSeconds += secondsToBuy;

      curState = applyAction(curState, {
        type: 'buy_research',
        payload: { researchId: best.research.id, fromLevel: best.level, toLevel: best.level + 1 },
        cost: best.price,
      });
      curState = applyTime(curState, secondsToBuy, curSnapshot);
      curSnapshot = computeSnapshot(curState, context);

      items.push({
        research: best.research,
        targetLevel: best.level + 1,
        currentLevel: best.level,
        price: best.price,
        timeToBuy: secondsToBuy < 0.1 ? '0s' : formatDuration(secondsToBuy),
        timeToBuySeconds: secondsToBuy,
        buyToHereTime: totalSeconds < 0.1 ? '0s' : formatDuration(totalSeconds),
        buyToHereSeconds: totalSeconds,
        canBuy: true,
        isMaxed: false,
        canBuyToHere: true,
      });
    }

    return { items, reached: isTierUnlocked(curState.researchLevels, target.tier), totalSeconds };
  }

  function computeCheapestFirstTierChain(target: { tier: number }, context: SimulationContext) {
    return simulateCheapestFirstTierChain(createBaseEngineState(actionsStore.effectiveSnapshot), actionsStore.effectiveSnapshot, 0, target, context);
  }

  // Re-sequences a FIXED set of purchases (same researches, same levels — just picked by price) into
  // ROI order instead. The set of purchases and their total price don't change, but since each
  // purchase's own price only depends on its own current level (never on what else has been bought),
  // buying the ROI-positive ones earlier can only grow earnings sooner and speed up the rest — never
  // slower than the original price-only order. Per-research level order is preserved (you can't buy
  // level N+1 before level N of the same research).
  function reorderTierChainByROI(
    tailItems: ResearchViewItem[],
    startState: EngineState,
    startSnapshot: CalculationsSnapshot,
    startTotalSeconds: number,
    context: SimulationContext
  ) {
    const mods = costModifiers.value;
    const isSale = isResearchSaleActive.value;

    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - offset);

    const pendingByResearch = new Map<string, { research: CommonResearch; levels: number[] }>();
    for (const item of tailItems) {
      const entry = pendingByResearch.get(item.research.id);
      if (entry) {
        entry.levels.push(item.targetLevel);
      } else {
        pendingByResearch.set(item.research.id, { research: item.research, levels: [item.targetLevel] });
      }
    }

    let state = startState;
    let snapshot = startSnapshot;
    let totalSeconds = startTotalSeconds;
    const items: ResearchViewItem[] = [];

    while (items.length < tailItems.length) {
      const currentAbsoluteTime = absoluteSimTime + totalSeconds;
      const nextSaleStart = getNextPacificTime(5, 9, currentAbsoluteTime);
      const upcoming9amDurations = Array.from({ length: 7 }, (_, i) => getNextPacificTime(i, 9, currentAbsoluteTime) - currentAbsoluteTime);
      const eventExpirationSeconds = Math.min(...upcoming9amDurations);

      const candidates = Array.from(pendingByResearch.values())
        .filter(entry => entry.levels.length > 0)
        .map(entry => {
          const targetLevel = entry.levels[0];
          const level = targetLevel - 1;
          const price = getDiscountedVirtuePrice(entry.research, level, mods, isSale);
          const roiResult = calculateResearchROI({
            research: entry.research,
            level,
            price,
            snapshot,
            context,
            eventTiming: {
              absoluteSimTime: currentAbsoluteTime,
              nextSaleStart,
              eventExpirationSeconds,
              researchSaleDeadline: researchSaleDeadline.value,
              isSaleActive: isSale,
            },
          });
          return { research: entry.research, level, targetLevel, price, roiResult };
        });

      if (candidates.length === 0) break;

      candidates.sort((a, b) => {
        if (a.roiResult.roiSeconds !== b.roiResult.roiSeconds) return a.roiResult.roiSeconds - b.roiResult.roiSeconds;
        return a.price - b.price;
      });

      const best = candidates[0];
      const secondsToBuy = getTimeToSave(best.price, snapshot);
      if (secondsToBuy === Infinity) break;

      totalSeconds += secondsToBuy;

      state = applyAction(state, {
        type: 'buy_research',
        payload: { researchId: best.research.id, fromLevel: best.level, toLevel: best.targetLevel },
        cost: best.price,
      });
      state = applyTime(state, secondsToBuy, snapshot);
      snapshot = computeSnapshot(state, context);

      const roiLabel =
        best.roiResult.roiSeconds === Infinity || best.roiResult.roiSeconds > 999 * 86400
          ? '>999d'
          : formatDuration(best.roiResult.roiSeconds);

      items.push({
        research: best.research,
        targetLevel: best.targetLevel,
        currentLevel: best.level,
        price: best.price,
        timeToBuy: secondsToBuy < 0.1 ? '0s' : formatDuration(secondsToBuy),
        timeToBuySeconds: secondsToBuy,
        buyToHereTime: totalSeconds < 0.1 ? '0s' : formatDuration(totalSeconds),
        buyToHereSeconds: totalSeconds,
        canBuy: true,
        isMaxed: false,
        canBuyToHere: true,
        roiSeconds: best.roiResult.roiSeconds,
        totalRoiSeconds: best.roiResult.totalRoiSeconds,
        roiLabel,
        extraStats: roiLabel,
        extraLabel: 'ROI',
        extraSeconds: best.roiResult.roiSeconds,
        showSaleWarning: best.roiResult.showSaleWarning,
        showDeadlineWarning: best.roiResult.showDeadlineWarning,
      });

      pendingByResearch.get(best.research.id)!.levels.shift();
    }

    return { items, totalSeconds };
  }

  // Tier-unlock milestone: every purchase (in an already-unlocked tier) counts toward the threshold,
  // so there's no "wasted" purchase the way there is for a research-level target. But that doesn't
  // mean ROI-first is always fastest — an expensive, high-ROI purchase only pays off if there's
  // enough remaining runway for its earnings boost to matter; buying it when the milestone could
  // instead be finished with a pile of purchases cheaper than it just wastes time saving up.
  //
  // At each step: compare (a) finishing via pure cheapest-first from here, against (b) buying the
  // single best-ROI candidate now, then finishing via cheapest-first from THAT state. Whichever is
  // faster wins. If (b) wins, commit to that one purchase and repeat the comparison (another detour
  // may or may not be worth it next); if (a) wins, stop inserting detours and finish with the
  // cheapest-first tail. This naturally orders the result as [ROI detours..., cheap purchases...],
  // since detours are only ever prepended while they keep winning, and once cheapest-first wins the
  // remaining tail is pure cheapest-first.
  function computeTierMilestoneChain(target: { tier: number }, context: SimulationContext) {
    const mods = costModifiers.value;
    const isSale = isResearchSaleActive.value;

    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - offset);

    let state = createBaseEngineState(actionsStore.effectiveSnapshot);
    let snapshot = actionsStore.effectiveSnapshot;
    let totalSeconds = 0;
    const items: ResearchViewItem[] = [];

    while (items.length < MILESTONE_MAX_STEPS && !isTierUnlocked(state.researchLevels, target.tier)) {
      const cheapPlan = simulateCheapestFirstTierChain(state, snapshot, totalSeconds, target, context);

      const levels = state.researchLevels;
      const currentAbsoluteTime = absoluteSimTime + totalSeconds;
      const nextSaleStart = getNextPacificTime(5, 9, currentAbsoluteTime);
      const upcoming9amDurations = Array.from({ length: 7 }, (_, i) => getNextPacificTime(i, 9, currentAbsoluteTime) - currentAbsoluteTime);
      const eventExpirationSeconds = Math.min(...upcoming9amDurations);

      const roiCandidates = getCommonResearches()
        .filter(r => (levels[r.id] || 0) < r.levels && isTierUnlocked(levels, r.tier))
        .map(r => {
          const level = levels[r.id] || 0;
          const price = getDiscountedVirtuePrice(r, level, mods, isSale);
          const roiResult = calculateResearchROI({
            research: r,
            level,
            price,
            snapshot,
            context,
            eventTiming: {
              absoluteSimTime: currentAbsoluteTime,
              nextSaleStart,
              eventExpirationSeconds,
              researchSaleDeadline: researchSaleDeadline.value,
              isSaleActive: isSale,
            },
          });
          return { research: r, level, price, roiResult };
        });

      roiCandidates.sort((a, b) => {
        if (a.roiResult.roiSeconds !== b.roiResult.roiSeconds) return a.roiResult.roiSeconds - b.roiResult.roiSeconds;
        return a.price - b.price;
      });

      let detourPlan: { detourItem: ResearchViewItem; secondsToBuy: number; totalSeconds: number; reached: boolean } | null = null;

      if (roiCandidates.length > 0) {
        const bestRoi = roiCandidates[0];
        const secondsToBuy = getTimeToSave(bestRoi.price, snapshot);

        if (secondsToBuy !== Infinity) {
          const stateAfterDetour = applyTime(
            applyAction(state, {
              type: 'buy_research',
              payload: { researchId: bestRoi.research.id, fromLevel: bestRoi.level, toLevel: bestRoi.level + 1 },
              cost: bestRoi.price,
            }),
            secondsToBuy,
            snapshot
          );
          const snapshotAfterDetour = computeSnapshot(stateAfterDetour, context);
          const restOfPlan = simulateCheapestFirstTierChain(
            stateAfterDetour,
            snapshotAfterDetour,
            totalSeconds + secondsToBuy,
            target,
            context
          );

          const roiLabel =
            bestRoi.roiResult.roiSeconds === Infinity || bestRoi.roiResult.roiSeconds > 999 * 86400
              ? '>999d'
              : formatDuration(bestRoi.roiResult.roiSeconds);

          detourPlan = {
            detourItem: {
              research: bestRoi.research,
              targetLevel: bestRoi.level + 1,
              currentLevel: bestRoi.level,
              price: bestRoi.price,
              timeToBuy: secondsToBuy < 0.1 ? '0s' : formatDuration(secondsToBuy),
              timeToBuySeconds: secondsToBuy,
              buyToHereTime: totalSeconds + secondsToBuy < 0.1 ? '0s' : formatDuration(totalSeconds + secondsToBuy),
              buyToHereSeconds: totalSeconds + secondsToBuy,
              canBuy: true,
              isMaxed: false,
              canBuyToHere: true,
              roiSeconds: bestRoi.roiResult.roiSeconds,
              totalRoiSeconds: bestRoi.roiResult.totalRoiSeconds,
              roiLabel,
              extraStats: roiLabel,
              extraLabel: 'ROI',
              extraSeconds: bestRoi.roiResult.roiSeconds,
              showSaleWarning: bestRoi.roiResult.showSaleWarning,
              showDeadlineWarning: bestRoi.roiResult.showDeadlineWarning,
            },
            secondsToBuy,
            totalSeconds: restOfPlan.totalSeconds,
            reached: restOfPlan.reached,
          };
        }
      }

      const detourWins = detourPlan && detourPlan.reached && (!cheapPlan.reached || detourPlan.totalSeconds < cheapPlan.totalSeconds);

      if (detourWins && detourPlan) {
        items.push(detourPlan.detourItem);
        totalSeconds += detourPlan.secondsToBuy;
        state = applyAction(state, {
          type: 'buy_research',
          payload: {
            researchId: detourPlan.detourItem.research.id,
            fromLevel: detourPlan.detourItem.currentLevel,
            toLevel: detourPlan.detourItem.targetLevel,
          },
          cost: detourPlan.detourItem.price,
        });
        state = applyTime(state, detourPlan.secondsToBuy, snapshot);
        snapshot = computeSnapshot(state, context);
        continue;
      }

      // Cheapest-first wins (or no detour is viable) — buy the same set of items, but re-sequenced
      // by ROI so any ROI-positive purchases in the tail happen before the zero-ROI filler.
      const reordered = reorderTierChainByROI(cheapPlan.items, state, snapshot, totalSeconds, context);
      items.push(...reordered.items);
      return { items, reached: cheapPlan.reached, totalSeconds: reordered.totalSeconds };
    }

    return { items, reached: isTierUnlocked(state.researchLevels, target.tier), totalSeconds };
  }

  const milestoneChainResult = computed(() => {
    const target = milestoneTarget.value;
    if (!target) return { items: [] as ResearchViewItem[], reached: false, totalSeconds: 0 };

    const context = getSimulationContext();
    return target.kind === 'tier' ? computeTierMilestoneChain(target, context) : computeResearchMilestoneChain(target, context);
  });

  // Baseline comparison ("without this research"). For a research-level milestone there's a
  // well-defined direct alternative — just save up and buy that research's next level with no
  // detours — which is exactly what the chain algorithm above compares each detour against, so
  // using the same number here keeps "with" guaranteed no worse than "without". A tier-unlock
  // milestone has no single "direct" purchase, so its baseline is buying cheapest-first (no ROI
  // reordering) until the tier unlocks — the naive strategy already used elsewhere in the app.
  const milestoneBaselineResult = computed(() => {
    const target = milestoneTarget.value;
    if (!target) return { reached: false, totalSeconds: 0 };

    const mods = costModifiers.value;
    const isSale = isResearchSaleActive.value;

    if (target.kind === 'research') {
      const targetResearch = getResearchById(target.researchId);
      if (!targetResearch) return { reached: false, totalSeconds: 0 };

      const level = commonResearchStore.researchLevels[targetResearch.id] || 0;
      const price = getDiscountedVirtuePrice(targetResearch, level, mods, isSale);
      const seconds = getTimeToSave(price, actionsStore.effectiveSnapshot);
      return { reached: seconds !== Infinity, totalSeconds: seconds };
    }

    const context = getSimulationContext();
    const cheapChain = computeCheapestFirstTierChain(target, context);
    return { reached: cheapChain.reached, totalSeconds: cheapChain.totalSeconds };
  });

  const milestoneSummary = computed(() => {
    const target = milestoneTarget.value;
    if (!target) return null;
    if (isMilestoneReached(target, commonResearchStore.researchLevels)) return null;

    const chain = milestoneChainResult.value;
    const baseline = milestoneBaselineResult.value;

    if (!chain.reached || !baseline.reached) {
      return { truncated: true as const };
    }

    const baseTimestamp =
      virtueStore.planStartTime.getTime() + (actionsStore.effectiveSnapshot.lastStepTime - actionsStore.planStartOffset) * 1000;

    return {
      truncated: false as const,
      baselineSeconds: baseline.totalSeconds,
      optimizedSeconds: chain.totalSeconds,
      timeSavedSeconds: baseline.totalSeconds - chain.totalSeconds,
      purchaseCount: chain.items.length,
      finishAbsoluteTime: formatAbsoluteTime(chain.totalSeconds, baseTimestamp, virtueStore.ascensionTimezone),
    };
  });

  const gameViewTimes = computed(() => {
    if (currentView.value !== 'game') return { tiers: {}, researches: {}, tierSeconds: {}, researchSeconds: {} };

    const context = getSimulationContext();
    const baseSnapshot = actionsStore.effectiveSnapshot;
    const mods = costModifiers.value;

    const resultResearches: Record<string, string> = {};
    const resultTiers: Record<number, string> = {};
    const resultResearchSeconds: Record<string, number> = {};
    const resultTierSeconds: Record<number, number> = {};

    const levels = commonResearchStore.researchLevels;

    for (const tier of tiers.value) {
      const researches = researchByTier.value.get(tier) || [];

      for (const r of researches) {
        const currentLevel = levels[r.id] || 0;
        if (currentLevel >= r.levels) continue;

        let rState = createBaseEngineState(baseSnapshot);
        let rSnapshot = baseSnapshot;
        let rSeconds = 0;
        let rInfinite = false;
        let rVirtualBank = baseSnapshot.bankValue || 0;

        for (let l = currentLevel; l < r.levels; l++) {
          const price = getDiscountedVirtuePrice(r, l, mods, rSnapshot.activeSales.research);
          const seconds = getTimeToSave(price, rSnapshot);

          if (seconds === Infinity) {
            rInfinite = true;
            break;
          }
          rSeconds += seconds;

          rState = applyAction(rState, {
            type: 'buy_research',
            payload: { researchId: r.id, fromLevel: l, toLevel: l + 1 },
            cost: price,
          });
          rState = applyTime(rState, seconds, rSnapshot);
          rSnapshot = computeSnapshot(rState, context);
        }
        resultResearches[r.id] = rInfinite ? '∞' : rSeconds < 0.1 ? '0s' : formatDuration(rSeconds);
        resultResearchSeconds[r.id] = rInfinite ? Infinity : rSeconds;
      }

      let tierState = createBaseEngineState(baseSnapshot);
      let tierSnapshot = baseSnapshot;
      let tierSeconds = 0;
      let tierInfinite = false;
      let anyUnpurchasedInTier = false;

      for (const r of researches) {
        const currentLevel = levels[r.id] || 0;
        for (let l = currentLevel; l < r.levels; l++) {
          anyUnpurchasedInTier = true;
          const price = getDiscountedVirtuePrice(r, l, mods, tierSnapshot.activeSales.research);
          const seconds = getTimeToSave(price, tierSnapshot);

          if (seconds === Infinity) {
            tierInfinite = true;
            break;
          }
          tierSeconds += seconds;

          tierState = applyAction(tierState, {
            type: 'buy_research',
            payload: { researchId: r.id, fromLevel: l, toLevel: l + 1 },
            cost: price,
          });
          tierState = applyTime(tierState, seconds, tierSnapshot);
          tierSnapshot = computeSnapshot(tierState, context);
        }
        if (tierInfinite) break;
      }

      if (anyUnpurchasedInTier) {
        resultTiers[tier] = tierInfinite ? '∞' : tierSeconds < 1 ? '0s' : formatDuration(tierSeconds);
        resultTierSeconds[tier] = tierInfinite ? Infinity : tierSeconds;
      }
    }

    return {
      tiers: resultTiers,
      researches: resultResearches,
      tierSeconds: resultTierSeconds,
      researchSeconds: resultResearchSeconds,
    };
  });

  const sortedResearches = computed(() => {
    if (currentView.value === 'game') return [];

    const all = getCommonResearches();
    const researchLevels = commonResearchStore.researchLevels;
    const isSale = isResearchSaleActive.value;
    const mods = costModifiers.value;

    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - offset);

    const filterByCategories = (r: CommonResearch) => {
      const categories = r.categories.split(',').map(c => c.trim());
      const excluded = currentView.value === 'roi' ? ROI_EXCLUDED_CATEGORIES : ELR_EXCLUDED_CATEGORIES;
      return !categories.some(c => excluded.includes(c));
    };

    interface UnpurchasedResearch {
      research: CommonResearch;
      targetLevel: number;
      price: number;
      showDivider?: boolean;
      unlockTier?: number;
    }

    if (currentView.value === 'cheapest') {
      const unpurchased: UnpurchasedResearch[] = [];
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
      unpurchased.sort((a, b) => a.price - b.price);

      const result: ResearchViewItem[] = [];
      const pool: UnpurchasedResearch[] = [];
      const context = getSimulationContext();
      const baseSnapshot = actionsStore.effectiveSnapshot;
      let currentSimState = createBaseEngineState(baseSnapshot);
      let currentSimSnapshot = baseSnapshot;
      let totalSeconds = 0;

      const formatTimeToBuy = (
        price: number,
        snapshot: CalculationsSnapshot
      ): { timeToBuy: string; secondsToBuy: number } => {
        const seconds = getTimeToSave(price, snapshot);
        if (seconds === Infinity) return { timeToBuy: '∞', secondsToBuy: Infinity };
        return {
          timeToBuy: seconds < 0.1 ? '0s' : formatDuration(seconds),
          secondsToBuy: seconds,
        };
      };

      const processed = new Set<string>();
      // Track tiers that were unlocked but had no items in the pool to receive the divider
      const pendingDividerTiers = new Set<number>();

      const processItem = (item: UnpurchasedResearch) => {
        const r = item.research;
        const key = `${r.id}-${item.targetLevel}`;
        if (processed.has(key)) return;

        const actuallyUnlocked = isTierUnlocked(currentSimState.researchLevels, r.tier);

        if (actuallyUnlocked) {
          processed.add(key);
          const highestUnlockedBefore =
            Array.from({ length: 13 }, (_, i) => i + 1)
              .reverse()
              .find(t => isTierUnlocked(currentSimState.researchLevels, t)) || 1;

          // If this item's tier has a pending divider (unlocked earlier with no pool items),
          // apply the divider to this item
          if (pendingDividerTiers.has(r.tier)) {
            item.showDivider = true;
            item.unlockTier = r.tier;
            pendingDividerTiers.delete(r.tier);
          }

          const { secondsToBuy: sequentialSecondsToBuy } = formatTimeToBuy(item.price, currentSimSnapshot);
          totalSeconds += sequentialSecondsToBuy === Infinity ? 0 : sequentialSecondsToBuy;

          const rawSnapshot = { ...currentSimSnapshot, bankValue: 0 };
          const { timeToBuy: rawTimeToBuy, secondsToBuy: rawSecondsToBuy } = formatTimeToBuy(item.price, rawSnapshot);

          result.push({
            research: r,
            targetLevel: item.targetLevel,
            price: item.price,
            currentLevel: researchLevels[r.id] || 0,
            timeToBuy: sequentialSecondsToBuy < 0.1 ? '0s' : formatDuration(sequentialSecondsToBuy),
            timeToBuySeconds: sequentialSecondsToBuy,
            buyToHereTime: totalSeconds > 0 ? formatDuration(totalSeconds) : '0s',
            buyToHereSeconds: totalSeconds,
            canBuy: true,
            isMaxed: false,
            showDivider: item.showDivider || false,
            unlockTier: item.unlockTier || 0,
            showDeadlineWarning: isSale && (absoluteSimTime + totalSeconds > researchSaleDeadline.value),
          });

          currentSimState = applyAction(currentSimState, {
            type: 'buy_research',
            payload: { researchId: r.id, fromLevel: item.targetLevel - 1, toLevel: item.targetLevel },
            cost: item.price,
          });
          currentSimState = applyTime(
            currentSimState,
            sequentialSecondsToBuy === Infinity ? 0 : sequentialSecondsToBuy,
            currentSimSnapshot
          );
          currentSimSnapshot = computeSnapshot(currentSimState, context);

          const getMaxUnlocked = () =>
            Array.from({ length: 13 }, (_, i) => i + 1)
              .reverse()
              .find(t => isTierUnlocked(currentSimState.researchLevels, t)) || 1;

          const highestAfter = getMaxUnlocked();

          if (highestAfter > highestUnlockedBefore) {
            // Record all newly-unlocked tiers as needing dividers
            for (let t = highestUnlockedBefore + 1; t <= highestAfter; t++) {
              if (isTierUnlocked(currentSimState.researchLevels, t)) {
                pendingDividerTiers.add(t);
              }
            }

            for (let i = 0; i < pool.length; i++) {
              const poolTier = pool[i].research.tier;
              if (isTierUnlocked(currentSimState.researchLevels, poolTier)) {
                const stashed = pool.splice(i, 1)[0];
                if (pendingDividerTiers.has(poolTier)) {
                  stashed.showDivider = true;
                  stashed.unlockTier = poolTier;
                  pendingDividerTiers.delete(poolTier);
                }
                processItem(stashed);
                i = -1;
              }
            }
          }
        } else {
          pool.push(item);
        }
      };

      unpurchased.forEach(item => processItem(item));

      pool.forEach(item => {
        const r = item.research;
        const key = `${r.id}-${item.targetLevel}`;
        if (!processed.has(key)) {
          processed.add(key);
          const { secondsToBuy: sequentialSecondsToBuy } = formatTimeToBuy(item.price, currentSimSnapshot);
          totalSeconds += sequentialSecondsToBuy === Infinity ? 0 : sequentialSecondsToBuy;

          const rawSnapshot = { ...currentSimSnapshot, bankValue: 0 };
          const { timeToBuy: rawTimeToBuy, secondsToBuy: rawSecondsToBuy } = formatTimeToBuy(item.price, rawSnapshot);

          result.push({
            research: r,
            targetLevel: item.targetLevel,
            price: item.price,
            currentLevel: researchLevels[r.id] || 0,
            timeToBuy: rawTimeToBuy,
            timeToBuySeconds: rawSecondsToBuy,
            buyToHereTime: totalSeconds > 0 ? formatDuration(totalSeconds) : '0s',
            buyToHereSeconds: totalSeconds,
            buyToHereTooltip: totalSeconds < rawSecondsToBuy ? 'Includes existing gems from your bank. Individual research wait times show the time to save from 0.' : undefined,
            canBuy: true,
            isMaxed: false,
            showDeadlineWarning: isSale && (absoluteSimTime + totalSeconds > researchSaleDeadline.value),
          });
        }
      });

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
      const context = getSimulationContext();
      const effectiveSnapshot = actionsStore.effectiveSnapshot;
      const baseState = createBaseEngineState(effectiveSnapshot);
      const currentEarnings = effectiveSnapshot.offlineEarnings;

      const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
      const offset = actionsStore.planStartOffset;
      const absoluteSimTime = baseTimestamp + (effectiveSnapshot.lastStepTime - offset);
      const nextSaleStart = getNextPacificTime(5, 9, absoluteSimTime);
      
      // Every earnings event (2x, 3x, etc.) is currently assumed to end at the next 9AM Los Angeles time.
      const upcoming9amDurations = Array.from({ length: 7 }, (_, i) => getNextPacificTime(i, 9, absoluteSimTime) - absoluteSimTime);
      const eventExpirationSeconds = Math.min(...upcoming9amDurations);

      if (currentEarnings <= 0) return [];

      const unpurchased = all.filter(r => (researchLevels[r.id] || 0) < r.levels && filterByCategories(r));
      const uniqueUnpurchased = Array.from(new Map(unpurchased.map(r => [r.id, r])).values());

      const baseMaxVehiclesSnapshot = roiMode.value === 'maxed_vehicles'
        ? buildMaxVehiclesSnapshot(effectiveSnapshot, researchLevels, context)
        : null;

      const basicCandidates = uniqueUnpurchased.map(r => {
        const level = researchLevels[r.id] || 0;
        const price = getDiscountedVirtuePrice(r, level, mods, isSale);
        const canBuy = isTierUnlocked(researchLevels, r.tier);
        const categories = r.categories.split(',').map(c => c.trim());
        const isLaying = categories.includes('egg_laying_rate');
        const isShipping = categories.includes('shipping_capacity');

        let roiSeconds: number;
        let totalRoiSeconds: number;
        let showSaleWarning: boolean;
        let showDeadlineWarning: boolean;
        let resultTimeToBuySeconds: number;
        let nextSnapshot: CalculationsSnapshot;

        if (roiMode.value === 'maxed_vehicles' && baseMaxVehiclesSnapshot) {
          resultTimeToBuySeconds = getTimeToSave(price, effectiveSnapshot);
          const afterMaxSnapshot = buildMaxVehiclesSnapshot(effectiveSnapshot, { ...researchLevels, [r.id]: level + 1 }, context);
          nextSnapshot = afterMaxSnapshot;
          const maxTime = 1e9;
          const getExtra = (t: number) =>
            calculateEarningsForTime(t, afterMaxSnapshot) -
            calculateEarningsForTime(t, baseMaxVehiclesSnapshot);
          if (getExtra(maxTime) >= price) {
            let low = 0, high = maxTime;
            for (let i = 0; i < 60; i++) {
              const mid = (low + high) / 2;
              if (getExtra(mid) >= price) high = mid;
              else low = mid;
            }
            roiSeconds = high;
          } else {
            roiSeconds = Infinity;
          }
          totalRoiSeconds = isFinite(resultTimeToBuySeconds) ? resultTimeToBuySeconds + roiSeconds : Infinity;
          showSaleWarning = !isSale && (absoluteSimTime + resultTimeToBuySeconds >= nextSaleStart);
          showDeadlineWarning = isSale && (absoluteSimTime + resultTimeToBuySeconds > researchSaleDeadline.value);
        } else {
          const roiResult = calculateResearchROI({
            research: r,
            level,
            price,
            snapshot: effectiveSnapshot,
            context,
            eventTiming: {
              absoluteSimTime,
              nextSaleStart,
              eventExpirationSeconds,
              researchSaleDeadline: researchSaleDeadline.value,
              isSaleActive: isSale,
            },
          });
          ({ roiSeconds, totalRoiSeconds, showSaleWarning, showDeadlineWarning, nextSnapshot } = roiResult);
          resultTimeToBuySeconds = roiResult.timeToBuySeconds;
        }

        return {
          research: r,
          price,
          currentLevel: level,
          targetLevel: level + 1,
          timeToBuy:
            resultTimeToBuySeconds > 0
              ? resultTimeToBuySeconds === Infinity
                ? '∞'
                : resultTimeToBuySeconds < 1
                  ? '0s'
                  : formatDuration(resultTimeToBuySeconds)
              : '',
          canBuy,
          isMaxed: false,
          roiSeconds,
          totalRoiSeconds,
          roiLabel: roiSeconds === Infinity || roiSeconds > 999 * 86400 ? '>999d' : formatDuration(roiSeconds),
          totalRoiLabel:
            totalRoiSeconds === Infinity || totalRoiSeconds > 999 * 86400 ? '>999d' : totalRoiSeconds < 1 ? '0s' : formatDuration(totalRoiSeconds),
          isLaying,
          isShipping,
          nextSnapshot,
          showSaleWarning,
          showDeadlineWarning,
        };
      });

      const bestLaying = [...basicCandidates]
        .filter(c => c.isLaying && c.canBuy && c.roiSeconds !== Infinity)
        .sort((a, b) => a.roiSeconds - b.roiSeconds)[0];

      const bestShipping = [...basicCandidates]
        .filter(c => c.isShipping && c.canBuy && c.roiSeconds !== Infinity)
        .sort((a, b) => a.roiSeconds - b.roiSeconds)[0];

      return basicCandidates
        .map(c => {
          let recommendationNote: string | undefined = undefined;

          if (roiMode.value === 'immediate') {
            const isBottlenecked = c.roiSeconds === Infinity || c.roiSeconds > 3600 * 24 * 7;

            if (isBottlenecked && (c.isLaying || c.isShipping)) {
              const partner = c.isLaying ? bestShipping : bestLaying;
              if (partner && partner.research.id !== c.research.id) {
                const level1 = researchLevels[c.research.id] || 0;
                const level2 = researchLevels[partner.research.id] || 0;

                let pairState = applyAction(baseState, createSimAction('buy_research', {
                  researchId: c.research.id,
                  fromLevel: level1,
                  toLevel: level1 + 1,
                }, c.price));

                pairState = applyAction(pairState, createSimAction('buy_research', {
                  researchId: partner.research.id,
                  fromLevel: level2,
                  toLevel: level2 + 1,
                }, partner.price));

                const pairSnapshot = computeSnapshot(pairState, context);
                const pairEarnings = pairSnapshot.offlineEarnings;
                const partnerEarnings = partner.nextSnapshot.offlineEarnings;

                if (pairEarnings > partnerEarnings) {
                  const pairTotalCost = c.price + partner.price;
                  const pairDelta = pairEarnings - currentEarnings;
                  const pairRoiSeconds = pairTotalCost / pairDelta;

                  if (pairRoiSeconds < c.roiSeconds) {
                    recommendationNote = `Buying this with "${partner.research.name}" would have a much better combined payback time of ${formatDuration(pairRoiSeconds)}.`;
                  }
                }
              }
            }
          }

          return {
            ...c,
            extraStats: c.totalRoiLabel,
            extraLabel: 'Achieve ROI',
            extraSeconds: c.totalRoiSeconds,
            recommendationNote,
          };
        })
        .filter(c => {
          if (!deliveryImpactOnly.value) return true;
          const cats = c.research.categories.split(',').map(s => s.trim());
          return cats.some(cat => DELIVERY_IMPACT_CATEGORIES.has(cat));
        })
        .sort((a, b) => {
          if (a.canBuy !== b.canBuy) return a.canBuy ? -1 : 1;
          if (a.totalRoiSeconds === b.totalRoiSeconds) {
            return a.price - b.price;
          }
          return a.totalRoiSeconds - b.totalRoiSeconds;
        });
    }

    if (currentView.value === 'elr') {
      const researchLevels = commonResearchStore.researchLevels;

      const unpurchased = all.filter(r => (researchLevels[r.id] || 0) < r.levels && filterByCategories(r));
      const uniqueUnpurchased = Array.from(new Map(unpurchased.map(r => [r.id, r])).values());

      // Build candidate list based on view mode
      let candidates: {
        research: CommonResearch;
        price: number;
        currentLevel: number;
        targetLevel: number;
        timeToBuy: string;
        canBuy: boolean;
        isMaxed: boolean;
        impact: number;
        hpp: number;
        realisticStats?: { layRate: number; shippingRate: number; elr: number; elrDelta: number };
        showDeadlineWarning: boolean;
      }[];

      if (elrViewMode.value === 'realistic') {
        // Realistic mode: full ELR pipeline with optimal artifacts, max habs/vehicles, gusset included
        const rawBackup = initialStateStore.rawBackup;
        if (!rawBackup) return [];

        const context = getSimulationContext();
        
        // Baseline: Optimal artifacts for CURRENT research levels
        const baselineOptimal = getOptimalELRSet(rawBackup, {
          assumeMaxHabsVehicles: true,
          excludeGusset: false,
          commonResearch: researchLevels,
          epicResearchLevels: context.epicResearchLevels,
          colleggtibleModifiers: context.colleggtibleModifiers,
        });
        const baselineArtifactMods = calculateArtifactModifiers(baselineOptimal);
        const baseline = computeRealisticELR(researchLevels, baselineArtifactMods, context.epicResearchLevels, context.colleggtibleModifiers);

        if (baseline.effectiveRate <= 0) return [];

        const baselineFmt = (n: number) => n.toExponential(3);
        // console.log(`[ELR View] Baseline (max Hyperloops): lay=${baselineFmt(baseline.layRate * 3600)}/hr, ship=${baselineFmt(baseline.shippingRate * 3600)}/hr, ELR=${baselineFmt(baseline.effectiveRate * 3600)}/hr — bottleneck: ${baseline.layRate < baseline.shippingRate ? 'LAY RATE' : 'SHIPPING'}`);

        candidates = uniqueUnpurchased
          .map(r => {
            const level = researchLevels[r.id] || 0;
            const price = getDiscountedVirtuePrice(r, level, mods, isSale);

            const tempLevels = { ...researchLevels, [r.id]: level + 1 };

            const tempOptimal = getOptimalELRSet(rawBackup, {
              assumeMaxHabsVehicles: true,
              excludeGusset: false,
              commonResearch: tempLevels,
              epicResearchLevels: context.epicResearchLevels,
              colleggtibleModifiers: context.colleggtibleModifiers,
            });

            const tempArtifactMods = calculateArtifactModifiers(tempOptimal);
            const stats = computeRealisticELR(tempLevels, tempArtifactMods, context.epicResearchLevels, context.colleggtibleModifiers);
            const impact = (stats.effectiveRate - baseline.effectiveRate) / baseline.effectiveRate;

            const noBankSnapshot = { ...actionsStore.effectiveSnapshot, bankValue: 0 };
            const secondsToBuyNoBank = getTimeToSave(price, noBankSnapshot);
            const secondsToBuyWithBank = getTimeToSave(price, actionsStore.effectiveSnapshot);
            const hoursToBuy = secondsToBuyNoBank / 3600;
            const hpp = impact > 0 ? hoursToBuy / (impact * 100) : Infinity;

            // Lookahead: find minimum N levels that unlock positive ELR impact.
            let lookahead: { minLevels: number; impact: number; hpp: number; realisticStats: { layRate: number; shippingRate: number; elr: number; elrDelta: number } } | undefined;
            if (impact <= 0 && level + 1 < r.levels) {
              for (let n = 2; n <= r.levels - level; n++) {
                const laLevels = { ...researchLevels, [r.id]: level + n };
                const laOptimal = getOptimalELRSet(rawBackup, {
                  assumeMaxHabsVehicles: true,
                  excludeGusset: false,
                  commonResearch: laLevels,
                  epicResearchLevels: context.epicResearchLevels,
                  colleggtibleModifiers: context.colleggtibleModifiers,
                });
                const laArtifactMods = calculateArtifactModifiers(laOptimal);
                const laStats = computeRealisticELR(laLevels, laArtifactMods, context.epicResearchLevels, context.colleggtibleModifiers);
                const laImpact = (laStats.effectiveRate - baseline.effectiveRate) / baseline.effectiveRate;
                if (laImpact > 0) {
                  let totalPriceForN = 0;
                  for (let l = level; l < level + n; l++) {
                    totalPriceForN += getDiscountedVirtuePrice(r, l, mods, isSale);
                  }
                  const totalHoursForN = getTimeToSave(totalPriceForN, noBankSnapshot) / 3600;
                  lookahead = {
                    minLevels: n,
                    impact: laImpact,
                    hpp: totalHoursForN / (laImpact * 100),
                    realisticStats: {
                      layRate: laStats.layRate * 3600,
                      shippingRate: laStats.shippingRate * 3600,
                      elr: laStats.effectiveRate * 3600,
                      elrDelta: (laStats.effectiveRate - baseline.effectiveRate) * 3600,
                    },
                  };
                  break;
                }
              }
            }

            return {
              research: r,
              price,
              currentLevel: level,
              targetLevel: level + 1,
              timeToBuy: '',
              canBuy: isTierUnlocked(researchLevels, r.tier),
              isMaxed: false,
              impact,
              hpp,
              lookahead,
              realisticStats: {
                layRate: stats.layRate * 3600,
                shippingRate: stats.shippingRate * 3600,
                elr: stats.effectiveRate * 3600,
                elrDelta: (stats.effectiveRate - baseline.effectiveRate) * 3600,
              },
              showDeadlineWarning: isSale && (absoluteSimTime + secondsToBuyWithBank > researchSaleDeadline.value),
            };
          })
          .map(c => {
            const fmt = (n: number) => n.toExponential(3);
            const DEBUG_IDS = ['neural_net_refine', 'hyper_portalling'];
            if (DEBUG_IDS.includes(c.research.id) || c.impact > 0 || c.lookahead) {
              const stats = c.realisticStats!;
              const laNote = c.lookahead ? ` [lookahead ${c.lookahead.minLevels} levels → +${(c.lookahead.impact * 100).toFixed(4)}%]` : '';
              // console.log(`[ELR View] ${c.research.name}: impact=${(c.impact * 100).toFixed(4)}%, lay=${fmt(stats.layRate)}/hr, ship=${fmt(stats.shippingRate)}/hr, elr=${fmt(stats.elr)}/hr${laNote}`);
            }
            return c;
          })
          .filter(c => c.impact > 0 || c.lookahead !== undefined);
      } else {
        // Potential mode: theoretical formula-based impact
        const currentSlots = calculateMaxVehicleSlots(researchLevels);
        const currentMaxCars = calculateMaxTrainLength(researchLevels);

        candidates = uniqueUnpurchased
          .map(r => {
            const level = researchLevels[r.id] || 0;
            const price = getDiscountedVirtuePrice(r, level, mods, isSale);
            let impact = 0;

            if (FLEET_RESEARCH_IDS.includes(r.id)) {
              impact = 1 / currentSlots;
            } else if (r.id === TRAIN_CAR_RESEARCH_ID) {
              impact = 1 / currentMaxCars;
            } else {
              impact = r.per_level / (1 + level * r.per_level);
            }

            // Hours per percentage point
            // Use a snapshot with bankValue zeroed so hpp reflects pure earnings time, not savings.
            const noBankSnapshot = { ...actionsStore.effectiveSnapshot, bankValue: 0 };
            const secondsToBuyNoBank = getTimeToSave(price, noBankSnapshot);
            const secondsToBuyWithBank = getTimeToSave(price, actionsStore.effectiveSnapshot);
            const hoursToBuy = secondsToBuyNoBank / 3600;
            const hpp = impact > 0 ? hoursToBuy / (impact * 100) : Infinity;

            return {
              research: r,
              price,
              currentLevel: level,
              targetLevel: level + 1,
              timeToBuy: '',
              canBuy: isTierUnlocked(researchLevels, r.tier),
              isMaxed: false,
              impact,
              hpp,
              showDeadlineWarning: isSale && (absoluteSimTime + secondsToBuyWithBank > researchSaleDeadline.value),
            };
          })
          .filter(c => c.impact > 0);
      }

      // Sort based on elrSortMode
      if (elrSortMode.value === 'efficiency') {
        candidates.sort((a, b) => {
          if (a.canBuy !== b.canBuy) return a.canBuy ? -1 : 1;
          if (isFinite(a.hpp) || isFinite(b.hpp)) {
            if (a.hpp !== b.hpp) return a.hpp - b.hpp;
          }
          return b.impact - a.impact;
        });
      } else {
        candidates.sort((a, b) => {
          if (a.canBuy !== b.canBuy) return a.canBuy ? -1 : 1;
          if (a.impact !== b.impact) return b.impact - a.impact;
          return a.hpp - b.hpp;
        });
      }

      return candidates.map(c => {
        const la = (c as { lookahead?: { minLevels: number; impact: number; hpp: number; realisticStats: typeof c.realisticStats } }).lookahead;
        return {
          ...c,
          extraStats: la ? `+${(la.impact * 100).toFixed(3)}%` : `+${(c.impact * 100).toFixed(3)}%`,
          extraLabel: la ? `${la.minLevels}-lvl impact` : 'Impact',
          hpp: la ? la.hpp : c.hpp,
          realisticStats: la ? la.realisticStats : c.realisticStats,
          lookahead: la ? { minLevels: la.minLevels, impact: la.impact, hpp: la.hpp } : undefined,
        };
      });
    }

    if (currentView.value === 'milestones') {
      return milestoneChainResult.value.items;
    }

    return [];
  });

  return {
    currentView,
    elrViewMode,
    elrSortMode,
    deliveryImpactOnly,
    roiMode,
    milestoneTarget,
    milestoneNextLockedTier,
    milestoneResearchOptions,
    milestoneSummary,
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
    TIER_THRESHOLDS: TIER_UNLOCK_THRESHOLDS,
  };
}

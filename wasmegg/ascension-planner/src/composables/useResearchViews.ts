import { ref, computed, watch, watchEffect } from 'vue';
import {
  getCommonResearches,
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
import { applyAction, applyTime, getTimeToSave } from '@/engine/apply';
import { calculateShippingCapacity } from '@/calculations/shippingCapacity';
import { getNextPacificTime, isResearchSaleActive as isRealSaleActiveAt } from '@/lib/events';
import { debugLog, debugLogStart, debugLogEnd } from '@/lib/debugLog';
import { type CalculationsSnapshot } from '@/types';
import { getOptimalELRSet } from '@/lib/artifacts/virtue';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { calculateLayRate } from '@/calculations/layRate';
import { calculateEffectiveLayRate } from '@/calculations/effectiveLayRate';
import { calculateHabCapacity_Full } from '@/calculations/habCapacity';
import { computeRealisticELR } from '@/calculations/realisticELR';
import {
  type MilestoneTarget,
  type MilestoneChainItem,
  isMilestoneReached,
  computeResearchMilestoneChain,
  computeTierMilestoneChain,
  computeMilestoneBaseline,
  computeMilestoneSummaryCore,
} from '@/calculations/milestoneChain';
import { type ResearchRankingItem, rankResearchByROI, rankResearchByELRImpact } from '@/calculations/researchRanking';
import { type PurchaseEventCrossings } from '@/calculations/researchROI';
import {
  simulateSaleAwareBuy,
  simulateSaleEndsBuy,
  summarizeResearchLevelChanges,
} from '@/calculations/smartBuyPreview';
import { yieldForOverlayPaint } from '@/lib/yieldForOverlayPaint';
import type { SimulationContext } from '@/engine/types';
import { ei } from 'lib';

/**
 * Shared by `realisticSummary` (current research levels) and the Smart Buy tab's before/after
 * delivery-rate comparisons (simulated post-purchase levels) — same "optimal artifacts + max
 * habs/vehicles" pipeline, just parameterized over which research levels to evaluate instead of
 * always reading the live store, so both callers stay in sync by construction.
 */
function computeRealisticDeliverySummary(
  researchLevels: Record<string, number>,
  rawBackup: ei.IBackup | null | undefined,
  context: SimulationContext
): { layRate: number; shippingRate: number; elr: number } | null {
  if (!rawBackup) return null;

  const optimal = getOptimalELRSet(rawBackup, {
    assumeMaxHabsVehicles: true,
    excludeGusset: false,
    commonResearch: researchLevels,
    epicResearchLevels: context.epicResearchLevels,
    colleggtibleModifiers: context.colleggtibleModifiers,
  });
  const artifactMods = calculateArtifactModifiers(optimal);
  const stats = computeRealisticELR(
    researchLevels,
    artifactMods,
    context.epicResearchLevels,
    context.colleggtibleModifiers
  );

  return {
    layRate: stats.layRate * 3600,
    shippingRate: stats.shippingRate * 3600,
    elr: stats.effectiveRate * 3600,
  };
}

export type { MilestoneTarget } from '@/calculations/milestoneChain';

export type ViewType = 'game' | 'cheapest' | 'roi' | 'elr' | 'milestones' | 'smart_buy';
export type ElrViewMode = 'realistic' | 'potential';
export type ElrSortMode = 'efficiency' | 'impact';
export type ElrRoiDisplayMode = 'hpp' | 'time';
export type RoiMode = 'immediate' | 'maxed_vehicles';

/**
 * Common interface for research items across different views.
 */
export interface ResearchViewItem {
  research: CommonResearch;
  targetLevel: number;
  currentLevel: number;
  price: number;
  timeToBuy: string;
  // Only the cheapest/roi/milestone branches simulate this step-by-step; the elr branch omits it
  // so consumers fall back to a live rate-based estimate instead (see ResearchFlatView.vue).
  timeToBuySeconds?: number;
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
  pairRoiSeconds?: number;
  showSaleWarning?: boolean;
  showDeadlineWarning?: boolean;
  // Whether this purchase's price reflects a research sale, and whether it would complete during
  // a 2x earnings boost. Distinct from showSaleWarning/showDeadlineWarning ("you should hold off").
  duringSale?: boolean;
  duringEarningsBoost?: boolean;
  // Event boundaries (if any) this purchase's own wait crosses while saving up. Only set on the
  // milestones branch — lets the preview show the same wait/toggle split the manual planner
  // inserts when actually executing the chain, instead of only revealing it after clicking "Buy".
  eventCrossings?: PurchaseEventCrossings;
  // Extra $/sec this purchase would add to earnings once bought. Only set on the roi branch
  // (see ResearchRankingItem's field of the same name).
  earningsDelta?: number;
  // Absolute sim timestamp (seconds) this purchase would actually complete at (absoluteSimTime +
  // timeToBuySeconds). Only set on the roi branch — lets callers run meetsROIByDeadline against an
  // arbitrary target without re-deriving absoluteSimTime themselves.
  purchaseTimestamp?: number;

  // ELR specific
  impact?: number;
  hpp?: number;
  timeRoiSeconds?: number;
  lookahead?: { minLevels: number; impact: number; hpp: number };

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
  {
    id: 'smart_buy',
    label: 'Smart Buy',
    description: 'Auto-buy research: sale-aware and threshold-based buying in one place.',
  },
] as const;

const RESEARCH_VIEW_STORAGE_KEY = 'ascension_research_view';
const ELR_VIEW_MODE_STORAGE_KEY = 'ascension_research_elr_view_mode';
const ELR_SORT_MODE_STORAGE_KEY = 'ascension_research_elr_sort_mode';
const ELR_ROI_DISPLAY_MODE_STORAGE_KEY = 'ascension_research_elr_roi_display_mode';
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

function loadStoredElrRoiDisplayMode(): ElrRoiDisplayMode {
  const stored = localStorage.getItem(ELR_ROI_DISPLAY_MODE_STORAGE_KEY);
  return stored === 'hpp' || stored === 'time' ? stored : 'hpp';
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
    if (
      parsed?.kind === 'research' &&
      typeof parsed.researchId === 'string' &&
      typeof parsed.targetLevel === 'number'
    ) {
      return { kind: 'research', researchId: parsed.researchId, targetLevel: parsed.targetLevel };
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

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
  const elrRoiDisplayMode = ref<ElrRoiDisplayMode>(loadStoredElrRoiDisplayMode());
  watch(elrRoiDisplayMode, v => localStorage.setItem(ELR_ROI_DISPLAY_MODE_STORAGE_KEY, v));
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
  // `milestoneTarget` is a localStorage-backed ref, entirely outside the Pinia store system —
  // resetAllStores() (which every mode-init flow calls first) only resets Pinia stores, so it never
  // touches this. Left alone, a milestone target selected in one plan (possibly deep into a
  // developed save) silently survives into a brand new blank ascension and immediately re-triggers
  // an expensive computation against a near-zero earn rate — this is exactly the "cross-mode state
  // leakage" resetAllStores() exists to prevent (see its own doc comment), just missed because this
  // particular piece of state doesn't live in a store. Clear it in lockstep with isPlanInitializing
  // so it's gone before the milestoneChain watchEffect below gets a chance to act on it.
  watch(
    () => actionsStore.isPlanInitializing,
    initializing => {
      if (initializing && milestoneTarget.value !== null) {
        debugLog('useResearchViews: clearing stale milestoneTarget on mode-init', {
          staleTarget: milestoneTarget.value,
        });
        milestoneTarget.value = null;
      }
    }
  );

  const realisticSummary = computed(() => {
    if (elrViewMode.value !== 'realistic') return null;
    return computeRealisticDeliverySummary(
      commonResearchStore.researchLevels,
      initialStateStore.rawBackup,
      getSimulationContext()
    );
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
      case 'smart_buy':
        return 'Auto-buy research: sale-aware ROI buying and threshold-based smart buy, all in one place.';
      default:
        return '';
    }
  });

  const costModifiers = computed(() => ({
    labUpgradeLevel: initialStateStore.epicResearchLevels['cheaper_research'] || 0,
    researchCostMultiplier: initialStateStore.colleggtibleModifiers.researchCost,
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

  const nextSaleStart = computed(() => {
    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - offset);
    return getNextPacificTime(5, 9, absoluteSimTime);
  });

  // Converts the pure-calculation MilestoneChainItem shape (raw seconds, no formatting) into the
  // view's ResearchViewItem shape. roiSeconds/totalRoiSeconds are only set on detour items — both
  // computeTierMilestoneChain's ROI-reorder path and computeResearchMilestoneChain's ROI-ranked
  // detour path populate them the same way; direct target/cheapest-first purchases leave them
  // unset.
  function toResearchViewItem(item: MilestoneChainItem): ResearchViewItem {
    const result: ResearchViewItem = {
      research: item.research,
      targetLevel: item.targetLevel,
      currentLevel: item.currentLevel,
      price: item.price,
      timeToBuy: item.timeToBuySeconds < 0.1 ? '0s' : formatDuration(item.timeToBuySeconds),
      timeToBuySeconds: item.timeToBuySeconds,
      buyToHereTime: item.buyToHereSeconds < 0.1 ? '0s' : formatDuration(item.buyToHereSeconds),
      buyToHereSeconds: item.buyToHereSeconds,
      canBuy: true,
      isMaxed: false,
      canBuyToHere: true,
      showSaleWarning: item.showSaleWarning,
      showDeadlineWarning: item.showDeadlineWarning,
      duringSale: item.duringSale,
      duringEarningsBoost: item.duringEarningsBoost,
      eventCrossings: item.eventCrossings,
    };

    if (item.roiSeconds !== undefined) {
      const roiLabel =
        item.roiSeconds === Infinity || item.roiSeconds > 999 * 86400 ? '>999d' : formatDuration(item.roiSeconds);
      result.roiSeconds = item.roiSeconds;
      result.totalRoiSeconds = item.totalRoiSeconds;
      result.roiLabel = roiLabel;
      result.extraStats = roiLabel;
      result.extraLabel = 'ROI';
      result.extraSeconds = item.roiSeconds;
    }

    return result;
  }

  // Converts the pure-calculation ResearchRankingItem shape (raw seconds, no formatting) from
  // rankResearchByROI into the view's ResearchViewItem shape.
  function toResearchViewItemFromROI(item: ResearchRankingItem, absoluteSimTime: number): ResearchViewItem {
    const roiSeconds = item.roiSeconds!;
    const totalRoiSeconds = item.totalRoiSeconds!;
    const timeToBuySeconds = item.timeToBuySeconds!;
    const roiLabel = roiSeconds === Infinity || roiSeconds > 999 * 86400 ? '>999d' : formatDuration(roiSeconds);
    const totalRoiLabel =
      totalRoiSeconds === Infinity || totalRoiSeconds > 999 * 86400
        ? '>999d'
        : totalRoiSeconds < 1
          ? '0s'
          : formatDuration(totalRoiSeconds);

    return {
      research: item.research,
      price: item.price,
      currentLevel: item.currentLevel,
      targetLevel: item.targetLevel,
      timeToBuy:
        timeToBuySeconds > 0
          ? timeToBuySeconds === Infinity
            ? '∞'
            : timeToBuySeconds < 1
              ? '0s'
              : formatDuration(timeToBuySeconds)
          : '',
      timeToBuySeconds,
      canBuy: item.canBuy,
      isMaxed: false,
      roiSeconds,
      totalRoiSeconds,
      roiLabel,
      totalRoiLabel,
      isLaying: item.isLaying,
      isShipping: item.isShipping,
      recommendationNote:
        item.pairPartnerResearch && item.pairRoiSeconds !== undefined
          ? `Buying this with "${item.pairPartnerResearch.name}" would have a much better combined payback time of ${formatDuration(item.pairRoiSeconds)}.`
          : undefined,
      pairRoiSeconds: item.pairRoiSeconds,
      showSaleWarning: item.showSaleWarning,
      showDeadlineWarning: item.showDeadlineWarning,
      duringSale: item.duringSale,
      duringEarningsBoost: item.duringEarningsBoost,
      earningsDelta: item.earningsDelta,
      purchaseTimestamp: absoluteSimTime + timeToBuySeconds,
      extraStats: totalRoiLabel,
      extraLabel: 'Achieve ROI',
      extraSeconds: totalRoiSeconds,
    };
  }

  // Converts the pure-calculation ResearchRankingItem shape from rankResearchByELRImpact into the
  // view's ResearchViewItem shape. Deliberately omits timeToBuySeconds (see ResearchViewItem's
  // doc comment) — matches pre-hoist behavior of never populating it for this view.
  function toResearchViewItemFromELR(item: ResearchRankingItem): ResearchViewItem {
    const la = item.lookahead;
    return {
      research: item.research,
      price: item.price,
      currentLevel: item.currentLevel,
      targetLevel: item.targetLevel,
      timeToBuy: '',
      canBuy: item.canBuy,
      isMaxed: false,
      impact: item.impact,
      hpp: la ? la.hpp : item.hpp,
      timeRoiSeconds: la ? la.timeRoiSeconds : item.timeRoiSeconds,
      realisticStats: la ? la.realisticStats : item.realisticStats,
      lookahead: la ? { minLevels: la.minLevels, impact: la.impact, hpp: la.hpp } : undefined,
      showDeadlineWarning: item.showDeadlineWarning,
      duringSale: item.duringSale,
      duringEarningsBoost: item.duringEarningsBoost,
      extraStats: `+${((la ? la.impact : item.impact!) * 100).toFixed(3)}%`,
      extraLabel: la ? `${la.minLevels}-lvl impact` : 'Impact',
    };
  }

  // `computeTierMilestoneChain`/`computeResearchMilestoneChain` are synchronous and can take a
  // couple of seconds for a large tier-unlock chain. A plain `computed` can't show a loading state
  // for that: Vue computeds are fully synchronous, so setting a flag right before calling it would
  // never actually get painted — the flag flip and the freeze both happen within the same tick.
  // Instead this is a `watchEffect` that captures every reactive dependency it needs SYNCHRONOUSLY
  // (so Vue's automatic dependency tracking — which only sees reads before the first `await` —
  // still picks all of them up), flips the loading flag, then yields (see `yieldForOverlayPaint`
  // below) before running the actual blocking computation, so the browser gets a chance to paint
  // the loading state first.
  const isComputingMilestoneChain = ref(false);
  const milestoneChainResultRef = ref<{ items: MilestoneChainItem[]; reached: boolean; totalSeconds: number }>({
    items: [],
    reached: false,
    totalSeconds: 0,
  });
  let milestoneChainGeneration = 0;

  watchEffect(async () => {
    // Must be the first read so Vue tracks it and re-runs this effect once mode-init settles.
    // While a mode switch (start from scratch / plan future / reconcile / load plan / etc.) is
    // resetting stores, they briefly disagree with each other (e.g. virtueStore already reset while
    // actionsStore still holds the previous plan's snapshot) — computing a milestone chain against
    // that transitional mix has produced nonsensical absolute timestamps and hung the tab.
    if (actionsStore.isPlanInitializing) {
      debugLog('milestoneChain watchEffect: skipped, isPlanInitializing=true');
      return;
    }

    const target = milestoneTarget.value;
    const generation = ++milestoneChainGeneration;
    debugLog('milestoneChain watchEffect: fired', { generation, target });

    if (!target) {
      milestoneChainResultRef.value = { items: [], reached: false, totalSeconds: 0 };
      // Must clear this here too, not just after a completed compute below: if a prior invocation
      // (for the previous target) is still in flight when the target is cleared, it will later find
      // itself superseded (`generation !== milestoneChainGeneration`) and discard its result without
      // touching this flag — leaving the overlay stuck on forever with nothing left computing.
      isComputingMilestoneChain.value = false;
      return;
    }

    const context = getSimulationContext();
    const startSnapshot = actionsStore.effectiveSnapshot;
    const mods = costModifiers.value;
    const deadline = researchSaleDeadline.value;
    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (startSnapshot.lastStepTime - offset);

    isComputingMilestoneChain.value = true;
    await yieldForOverlayPaint();

    debugLogStart('milestoneChain compute', { generation, target, absoluteSimTime });
    let result: { items: MilestoneChainItem[]; reached: boolean; totalSeconds: number };
    try {
      result =
        target.kind === 'tier'
          ? computeTierMilestoneChain(target, startSnapshot, context, mods, absoluteSimTime, deadline)
          : computeResearchMilestoneChain(
              target,
              createBaseEngineState(startSnapshot),
              startSnapshot,
              context,
              mods,
              absoluteSimTime,
              deadline
            );
    } finally {
      debugLogEnd('milestoneChain compute', { generation });
    }

    // Discard if a newer invocation has started since (e.g. the user changed the milestone target
    // again before this one finished) — only the latest result should ever land.
    if (generation === milestoneChainGeneration) {
      milestoneChainResultRef.value = result;
      isComputingMilestoneChain.value = false;
    } else {
      debugLog('milestoneChain watchEffect: stale, discarding', {
        generation,
        currentGeneration: milestoneChainGeneration,
      });
    }
  });

  const milestoneChainResult = computed(() => milestoneChainResultRef.value);

  // Baseline comparison ("without this research"). For a research-level milestone there's a
  // well-defined direct alternative — just save up and buy that research's next level with no
  // detours — which is exactly what the chain algorithm above compares each detour against, so
  // using the same number here keeps "with" guaranteed no worse than "without". A tier-unlock
  // milestone has no single "direct" purchase, so its baseline is buying cheapest-first (no ROI
  // reordering) until the tier unlocks — the naive strategy already used elsewhere in the app.
  const milestoneBaselineResult = computed(() => {
    const target = milestoneTarget.value;
    if (!target) return { reached: false, totalSeconds: 0 };

    const context = getSimulationContext();
    const startSnapshot = actionsStore.effectiveSnapshot;
    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (startSnapshot.lastStepTime - offset);
    return computeMilestoneBaseline(target, startSnapshot, context, costModifiers.value, absoluteSimTime);
  });

  // Whether the currently-selected milestone target is already reached at the current research
  // levels — exposed separately from `milestoneSummary` (which returns `null` in this case) so
  // `ResearchFlatView`'s empty state can tell "already done" apart from "chain got stuck/truncated
  // with zero purchases queued," which also produces an empty `sortedResearches` list but means
  // something very different.
  const milestoneAlreadyReached = computed(() => {
    const target = milestoneTarget.value;
    if (!target) return false;
    return isMilestoneReached(target, commonResearchStore.researchLevels);
  });

  const milestoneSummary = computed(() => {
    const target = milestoneTarget.value;
    if (!target) return null;
    if (milestoneAlreadyReached.value) return null;

    const core = computeMilestoneSummaryCore(milestoneChainResult.value, milestoneBaselineResult.value);

    if (core.truncated) {
      return {
        truncated: true as const,
        partialPurchaseCount: core.partialPurchaseCount ?? 0,
        partialSeconds: core.partialSeconds ?? 0,
      };
    }

    const baseTimestamp =
      virtueStore.planStartTime.getTime() +
      (actionsStore.effectiveSnapshot.lastStepTime - actionsStore.planStartOffset) * 1000;

    return {
      truncated: false as const,
      baselineSeconds: core.baselineSeconds!,
      optimizedSeconds: core.optimizedSeconds!,
      timeSavedSeconds: core.timeSavedSeconds!,
      purchaseCount: core.purchaseCount!,
      finishAbsoluteTime: formatAbsoluteTime(core.optimizedSeconds!, baseTimestamp, virtueStore.ascensionTimezone),
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
        const rVirtualBank = baseSnapshot.bankValue || 0;

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

  // Independent, reactive wrapper around `rankResearchByROI` — deliberately has no `currentView`
  // dependency of its own. Vue computeds are lazy (only re-run when actually read), so whether this
  // does real work already tracks "is something currently reading it" rather than "which tab is
  // selected" — the roi/elr/smart_buy tabs' own `v-if`s already gate that for template consumers.
  // Baking a view check in here would just mean updating an allowlist by hand every time a new
  // consumer (e.g. the smart_buy tab) needs this list, which is the exact rigidity being avoided.
  const roiRankedResearches = computed(() => {
    const researchLevels = commonResearchStore.researchLevels;
    const isSale = isResearchSaleActive.value;
    const mods = costModifiers.value;
    const context = getSimulationContext();
    const effectiveSnapshot = actionsStore.effectiveSnapshot;

    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (effectiveSnapshot.lastStepTime - offset);

    const ranked = rankResearchByROI(
      researchLevels,
      effectiveSnapshot,
      context,
      mods,
      isSale,
      absoluteSimTime,
      researchSaleDeadline.value,
      roiMode.value,
      deliveryImpactOnly.value
    );

    return ranked.map(item => toResearchViewItemFromROI(item, absoluteSimTime));
  });

  // Independent, reactive wrapper around `rankResearchByELRImpact` — see `roiRankedResearches`'
  // doc comment above for why this has no `currentView` dependency of its own either.
  const elrRankedResearches = computed(() => {
    const researchLevels = commonResearchStore.researchLevels;
    const isSale = isResearchSaleActive.value;
    const mods = costModifiers.value;
    const context = getSimulationContext();

    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - offset);

    const ranked = rankResearchByELRImpact(
      researchLevels,
      initialStateStore.rawBackup,
      actionsStore.effectiveSnapshot,
      context,
      mods,
      isSale,
      absoluteSimTime,
      researchSaleDeadline.value,
      elrViewMode.value,
      elrSortMode.value
    );

    return ranked.map(toResearchViewItemFromELR);
  });

  // Dry-run plan for the sale-aware ROI buy flow ("70% Return" / "100% Return") — the single
  // source of truth for "what gets bought, in what order" for both the Smart Buy preview and the
  // real button click (see `simulateSaleAwareBuy`'s own doc comment). No `currentView` gate, same
  // rationale as `roiRankedResearches` above.
  const saleAwarePlan70 = computed(() => {
    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - offset);
    return simulateSaleAwareBuy(
      commonResearchStore.researchLevels,
      actionsStore.effectiveSnapshot,
      getSimulationContext(),
      costModifiers.value,
      absoluteSimTime,
      researchSaleDeadline.value,
      nextSaleStart.value,
      roiMode.value,
      deliveryImpactOnly.value,
      70
    );
  });

  const saleAwarePlan100 = computed(() => {
    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - offset);
    return simulateSaleAwareBuy(
      commonResearchStore.researchLevels,
      actionsStore.effectiveSnapshot,
      getSimulationContext(),
      costModifiers.value,
      absoluteSimTime,
      researchSaleDeadline.value,
      nextSaleStart.value,
      roiMode.value,
      deliveryImpactOnly.value,
      100
    );
  });

  const saleAwarePreview = computed(() =>
    summarizeResearchLevelChanges(commonResearchStore.researchLevels, saleAwarePlan70.value.endLevels)
  );

  // "What 70% Return buys beyond what 100% Return would" — same summarizer, just with the two
  // simulated end-states swapped in as "start"/"end" instead of "current"/"simulated".
  const saleAwareExcludedAt100Preview = computed(() =>
    summarizeResearchLevelChanges(saleAwarePlan100.value.endLevels, saleAwarePlan70.value.endLevels)
  );

  // Dry-run plan for "Buy Until Sale Ends" — only computed while a sale is actually active, same
  // gating `canBuyUntilSaleDeadline` already applies (there's nothing meaningful to preview
  // otherwise).
  const saleEndsPlan = computed(() => {
    if (!isResearchSaleActive.value) {
      return {
        researchIds: [] as string[],
        earningsResearchIds: [] as string[],
        deliveryResearchIds: [] as string[],
        earningsEndLevels: {} as Record<string, number>,
        earningsEndSnapshot: actionsStore.effectiveSnapshot,
        endLevels: {} as Record<string, number>,
        endSnapshot: actionsStore.effectiveSnapshot,
      };
    }
    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - offset);
    return simulateSaleEndsBuy(
      commonResearchStore.researchLevels,
      actionsStore.effectiveSnapshot,
      getSimulationContext(),
      costModifiers.value,
      absoluteSimTime,
      researchSaleDeadline.value,
      elrViewMode.value,
      elrSortMode.value,
      initialStateStore.rawBackup
    );
  });

  // Split into two summaries instead of one combined diff, so the UI can label the earnings-prelude
  // purchases (bought purely to speed up the delivery research that follows) separately from the
  // delivery research they were bought to speed up. `earningsEndLevels` is the midpoint `simulateSaleEndsBuy`
  // already computes between the plan's start levels and its final `endLevels`.
  const saleEndsEarningsPreview = computed(() =>
    summarizeResearchLevelChanges(commonResearchStore.researchLevels, saleEndsPlan.value.earningsEndLevels)
  );

  const saleEndsPreview = computed(() =>
    summarizeResearchLevelChanges(saleEndsPlan.value.earningsEndLevels, saleEndsPlan.value.endLevels)
  );

  // Current vs. simulated-post-purchase earnings rate for the 70%/100% Return buttons — the
  // `endSnapshot` each plan already carries (see `simulateSaleAwareBuy`'s doc comment) is exactly
  // what this needed, no extra simulation required.
  const currentOfflineEarningsHourly = computed(() => actionsStore.effectiveSnapshot.offlineEarnings * 3600);

  const saleAwareEarningsSummary70 = computed(() => ({
    before: currentOfflineEarningsHourly.value,
    after: saleAwarePlan70.value.endSnapshot.offlineEarnings * 3600,
  }));

  const saleAwareEarningsSummary100 = computed(() => ({
    before: currentOfflineEarningsHourly.value,
    after: saleAwarePlan100.value.endSnapshot.offlineEarnings * 3600,
  }));

  // Current vs. simulated-post-earnings-prelude earnings rate for "Buy Until Sale Ends" — same
  // shape as `saleAwareEarningsSummary70/100` above, just measured at `earningsEndSnapshot` (the
  // midpoint between the plan's earnings-prelude and delivery portions) instead of a whole plan's
  // `endSnapshot`.
  const saleEndsEarningsSummary = computed(() => ({
    before: currentOfflineEarningsHourly.value,
    after: saleEndsPlan.value.earningsEndSnapshot.offlineEarnings * 3600,
  }));

  // Current vs. simulated-post-purchase Delivery Rate for "Buy Until Sale Ends" — same "realistic"
  // (optimal artifacts + max habs/vehicles) calculation `realisticSummary` uses, just evaluated
  // against the plan's simulated end levels instead of the live research levels.
  const saleEndsDeliverySummary = computed(() => {
    const rawBackup = initialStateStore.rawBackup;
    const context = getSimulationContext();
    const before = computeRealisticDeliverySummary(commonResearchStore.researchLevels, rawBackup, context);
    const after = computeRealisticDeliverySummary(saleEndsPlan.value.endLevels, rawBackup, context);
    if (!before || !after) return null;
    return { before: before.elr, after: after.elr };
  });

  const sortedResearches = computed(() => {
    if (currentView.value === 'game' || currentView.value === 'smart_buy') return [];

    if (currentView.value === 'roi') return roiRankedResearches.value;
    if (currentView.value === 'elr') return elrRankedResearches.value;
    if (currentView.value === 'milestones') return milestoneChainResult.value.items.map(toResearchViewItem);

    const all = getCommonResearches();
    const researchLevels = commonResearchStore.researchLevels;
    const isSale = isResearchSaleActive.value;
    const mods = costModifiers.value;

    const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
    const offset = actionsStore.planStartOffset;
    const absoluteSimTime = baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - offset);

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
            // `isSale` alone can be a stale plan-snapshot flag rather than calendar truth (see
            // `isActuallyDuringSale`'s doc comment in researchROI.ts) — re-verify against the real
            // calendar before letting it gate this warning.
            showDeadlineWarning:
              isRealSaleActiveAt(absoluteSimTime) && absoluteSimTime + totalSeconds > researchSaleDeadline.value,
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
            buyToHereTooltip:
              totalSeconds < rawSecondsToBuy
                ? 'Includes existing gems from your bank. Individual research wait times show the time to save from 0.'
                : undefined,
            canBuy: true,
            isMaxed: false,
            // `isSale` alone can be a stale plan-snapshot flag rather than calendar truth (see
            // `isActuallyDuringSale`'s doc comment in researchROI.ts) — re-verify against the real
            // calendar before letting it gate this warning.
            showDeadlineWarning:
              isRealSaleActiveAt(absoluteSimTime) && absoluteSimTime + totalSeconds > researchSaleDeadline.value,
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

    return [];
  });

  return {
    currentView,
    elrViewMode,
    elrSortMode,
    elrRoiDisplayMode,
    deliveryImpactOnly,
    roiMode,
    milestoneTarget,
    milestoneNextLockedTier,
    milestoneResearchOptions,
    milestoneSummary,
    milestoneAlreadyReached,
    isComputingMilestoneChain,
    viewDescription,
    costModifiers,
    isResearchSaleActive,
    tiers,
    researchByTier,
    tierSummaries,
    gameViewTimes,
    sortedResearches,
    roiRankedResearches,
    elrRankedResearches,
    saleAwarePlan70,
    saleAwarePlan100,
    saleAwarePreview,
    saleAwareExcludedAt100Preview,
    saleEndsPlan,
    saleEndsPreview,
    saleEndsEarningsPreview,
    saleEndsEarningsSummary,
    saleAwareEarningsSummary70,
    saleAwareEarningsSummary100,
    saleEndsDeliverySummary,
    realisticSummary,
    researchSaleDeadline,
    nextSaleStart,
    TIER_THRESHOLDS: TIER_UNLOCK_THRESHOLDS,
  };
}

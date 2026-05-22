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
} from '@/calculations/commonResearch';
import { formatDuration } from '@/lib/format';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import { applyAction, applyTime, getTimeToSave, calculateEarningsForTime } from '@/engine/apply';
import { calculateMaxVehicleSlots, calculateMaxTrainLength, calculateShippingCapacity } from '@/calculations/shippingCapacity';
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

export type ViewType = 'game' | 'cheapest' | 'roi' | 'elr';
export type ElrViewMode = 'realistic' | 'potential';
export type ElrSortMode = 'efficiency' | 'impact';

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
  { id: 'game', label: 'Game View' },
  { id: 'cheapest', label: 'Cheapest First' },
  { id: 'roi', label: 'Earnings ROI' },
  { id: 'elr', label: 'ELR Impact' },
] as const;

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



export function useResearchViews() {
  const commonResearchStore = useCommonResearchStore();
  const initialStateStore = useInitialStateStore();
  const actionsStore = useActionsStore();
  const virtueStore = useVirtueStore();

  const currentView = ref<ViewType>('game');
  const elrViewMode = ref<ElrViewMode>('realistic');
  const elrSortMode = ref<ElrSortMode>('efficiency');

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
          return 'Theoretical max impact to ELR, sorted by time efficiency.';
        } else if (view === 'potential' && sort === 'impact') {
          return 'Theoretical max impact to ELR, sorted by total impact.';
        } else if (view === 'realistic' && sort === 'efficiency') {
          return 'True ELR impact with optimal artifacts and max habs/vehicles, sorted by time efficiency.';
        } else {
          return 'True ELR impact with optimal artifacts and max habs/vehicles, sorted by total impact.';
        }
      }
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

      const basicCandidates = uniqueUnpurchased.map(r => {
        const level = researchLevels[r.id] || 0;
        const price = getDiscountedVirtuePrice(r, level, mods, isSale);
        const canBuy = isTierUnlocked(researchLevels, r.tier);
        const categories = r.categories.split(',').map(c => c.trim());
        const isLaying = categories.includes('egg_laying_rate');
        const isShipping = categories.includes('shipping_capacity');

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

        const { roiSeconds, totalRoiSeconds, showSaleWarning, showDeadlineWarning, timeToBuySeconds: resultTimeToBuySeconds, nextSnapshot } = roiResult;

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

          return {
            ...c,
            extraStats: c.totalRoiLabel,
            extraLabel: 'Achieve ROI',
            extraSeconds: c.totalRoiSeconds,
            recommendationNote,
          };
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
        console.log(`[ELR View] Baseline (max Hyperloops): lay=${baselineFmt(baseline.layRate * 3600)}/hr, ship=${baselineFmt(baseline.shippingRate * 3600)}/hr, ELR=${baselineFmt(baseline.effectiveRate * 3600)}/hr — bottleneck: ${baseline.layRate < baseline.shippingRate ? 'LAY RATE' : 'SHIPPING'}`);

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
              console.log(`[ELR View] ${c.research.name}: impact=${(c.impact * 100).toFixed(4)}%, lay=${fmt(stats.layRate)}/hr, ship=${fmt(stats.shippingRate)}/hr, elr=${fmt(stats.elr)}/hr${laNote}`);
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

    return [];
  });

  return {
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
    TIER_THRESHOLDS: TIER_UNLOCK_THRESHOLDS,
  };
}

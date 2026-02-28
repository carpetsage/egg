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
import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import { applyAction, getTimeToSave, calculateEarningsForTime } from '@/engine/apply';
import { calculateMaxVehicleSlots, calculateMaxTrainLength } from '@/calculations/shippingCapacity';
import { type CalculationsSnapshot } from '@/types';

export type ViewType = 'game' | 'cheapest' | 'roi' | 'elr';

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

  const currentView = ref<ViewType>('game');

  const viewDescription = computed(() => {
    switch (currentView.value) {
      case 'game':
        return 'Grouped by tier, exactly like the game. Best for familiar navigation.';
      case 'cheapest':
        return 'All unpurchased researches sorted by price. Strategically unlock tiers with "Buy to here".';
      case 'roi':
        return 'Prioritizes upgrades that pay for themselves fastest based on your current earnings.';
      case 'elr':
        return 'Sorts by theoretical maximum potential impact to Egg Laying Rate, ignoring current bottlenecks.';
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

          rState = {
            ...rState,
            population: Math.min(rSnapshot.habCapacity, rSnapshot.population + (rSnapshot.offlineIHR / 60) * seconds),
            bankValue: 0, // Reset bank after "buying"
            researchLevels: {
              ...rState.researchLevels,
              [r.id]: l + 1,
            },
          };
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

          tierState = {
            ...tierState,
            population: Math.min(
              tierSnapshot.habCapacity,
              tierSnapshot.population + (tierSnapshot.offlineIHR / 60) * seconds
            ),
            bankValue: 0,
            researchLevels: {
              ...tierState.researchLevels,
              [r.id]: l + 1,
            },
          };
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

      const result: any[] = [];
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

      const processItem = (item: UnpurchasedResearch) => {
        const r = item.research;
        const key = `${r.id}-${item.targetLevel}`;
        if (processed.has(key)) return;

        const actuallyUnlocked = isTierUnlocked(currentSimState.researchLevels, r.tier);

        if (actuallyUnlocked) {
          processed.add(key);
          let highestUnlockedBefore =
            Array.from({ length: 13 }, (_, i) => i + 1)
              .reverse()
              .find(t => isTierUnlocked(currentSimState.researchLevels, t)) || 1;

          const { timeToBuy, secondsToBuy } = formatTimeToBuy(item.price, currentSimSnapshot);
          totalSeconds += secondsToBuy === Infinity ? 0 : secondsToBuy;

          result.push({
            research: r,
            targetLevel: item.targetLevel,
            price: item.price,
            currentLevel: researchLevels[r.id] || 0,
            timeToBuy: timeToBuy,
            timeToBuySeconds: secondsToBuy,
            buyToHereTime: totalSeconds > 0 ? formatDuration(totalSeconds) : '0s',
            buyToHereSeconds: totalSeconds,
            canBuy: true,
            isMaxed: false,
            showDivider: item.showDivider || false,
            unlockTier: item.unlockTier || 0,
          });

          currentSimState = {
            ...currentSimState,
            population: Math.min(
              currentSimSnapshot.habCapacity,
              currentSimSnapshot.population +
                (currentSimSnapshot.offlineIHR / 60) * (secondsToBuy === Infinity ? 0 : secondsToBuy)
            ),
            bankValue: 0,
            researchLevels: {
              ...currentSimState.researchLevels,
              [r.id]: (currentSimState.researchLevels[r.id] || 0) + 1,
            },
          };
          currentSimSnapshot = computeSnapshot(currentSimState, context);

          const getMaxUnlocked = () =>
            Array.from({ length: 13 }, (_, i) => i + 1)
              .reverse()
              .find(t => isTierUnlocked(currentSimState.researchLevels, t)) || 1;

          let highestAfter = getMaxUnlocked();

          if (highestAfter > highestUnlockedBefore) {
            for (let i = 0; i < pool.length; i++) {
              const poolTier = pool[i].research.tier;
              if (isTierUnlocked(currentSimState.researchLevels, poolTier)) {
                const stashed = pool.splice(i, 1)[0];
                if (poolTier > highestUnlockedBefore) {
                  stashed.showDivider = true;
                  stashed.unlockTier = poolTier;
                  highestUnlockedBefore = poolTier;
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
          const { timeToBuy, secondsToBuy } = formatTimeToBuy(item.price, currentSimSnapshot);
          totalSeconds += secondsToBuy === Infinity ? 0 : secondsToBuy;

          result.push({
            research: r,
            targetLevel: item.targetLevel,
            price: item.price,
            currentLevel: researchLevels[r.id] || 0,
            timeToBuy: timeToBuy,
            timeToBuySeconds: secondsToBuy,
            buyToHereTime: totalSeconds > 0 ? formatDuration(totalSeconds) : '0s',
            buyToHereSeconds: totalSeconds,
            canBuy: true,
            isMaxed: false,
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
        const bankValue = effectiveSnapshot.bankValue || 0;
        const effectivePrice = Math.max(0, price - bankValue);
        const roiSeconds = delta > 0 ? price / delta : Infinity;
        const timeToBuySeconds = getTimeToSave(price, effectiveSnapshot);
        const totalRoiSeconds = timeToBuySeconds + roiSeconds;

        return {
          research: r,
          price,
          currentLevel: level,
          targetLevel: level + 1,
          timeToBuy:
            timeToBuySeconds > 0
              ? timeToBuySeconds === Infinity
                ? '∞'
                : timeToBuySeconds < 1
                  ? '0s'
                  : formatDuration(timeToBuySeconds)
              : '',
          canBuy,
          isMaxed: false,
          roiSeconds,
          totalRoiSeconds,
          roiLabel: delta > 0 ? formatDuration(roiSeconds) : 'No Impact',
          totalRoiLabel:
            totalRoiSeconds === Infinity ? 'No Impact' : totalRoiSeconds < 1 ? '0s' : formatDuration(totalRoiSeconds),
          isLaying,
          isShipping,
          nextSnapshot,
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

              let pairState = applyAction(baseState, {
                id: 'tmp1',
                type: 'buy_research',
                payload: { researchId: c.research.id, fromLevel: level1, toLevel: level1 + 1 },
                cost: c.price,
                timestamp: Date.now(),
                dependsOn: [],
              } as any);

              pairState = applyAction(pairState, {
                id: 'tmp2',
                type: 'buy_research',
                payload: { researchId: partner.research.id, fromLevel: level2, toLevel: level2 + 1 },
                cost: partner.price,
                timestamp: Date.now(),
                dependsOn: [],
              } as any);

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
      const currentSlots = calculateMaxVehicleSlots(researchLevels);
      const currentMaxCars = calculateMaxTrainLength(researchLevels);

      const unpurchased = all.filter(r => (researchLevels[r.id] || 0) < r.levels && filterByCategories(r));
      const uniqueUnpurchased = Array.from(new Map(unpurchased.map(r => [r.id, r])).values());

      const currentEarnings = actionsStore.effectiveSnapshot.offlineEarnings;

      const candidates = uniqueUnpurchased
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
          // (Price / Earnings) = Seconds to buy
          // (Seconds / 3600) = Hours to buy
          // HPP = Hours / (Impact * 100)
          const secondsToBuy = getTimeToSave(price, actionsStore.effectiveSnapshot);
          const hoursToBuy = secondsToBuy / 3600;
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
          };
        })
        .filter(c => c.impact > 0)
        .sort((a, b) => {
          if (a.canBuy !== b.canBuy) return a.canBuy ? -1 : 1;
          if (isFinite(a.hpp) || isFinite(b.hpp)) {
            if (a.hpp !== b.hpp) return a.hpp - b.hpp;
          }
          return b.impact - a.impact;
        });

      return candidates.map(c => ({
        ...c,
        extraStats: `+${(c.impact * 100).toFixed(3)}%`,
        extraLabel: 'Impact',
        hpp: c.hpp,
      }));
    }

    return [];
  });

  return {
    currentView,
    viewDescription,
    costModifiers,
    isResearchSaleActive,
    tiers,
    researchByTier,
    tierSummaries,
    gameViewTimes,
    sortedResearches,
    TIER_THRESHOLDS: TIER_UNLOCK_THRESHOLDS,
  };
}

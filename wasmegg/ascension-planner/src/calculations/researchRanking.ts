import {
  type CommonResearch,
  getCommonResearches,
  getDiscountedVirtuePrice,
  isTierUnlocked,
  type ResearchCostModifiers,
} from './commonResearch';
import { calculateResearchROI, getSaleAwareTimeToSave } from './researchROI';
import { calculateMaxVehicleSlots, calculateMaxTrainLength } from './shippingCapacity';
import { getOptimalELRSet } from '@/lib/artifacts/virtue';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { computeRealisticELR } from './realisticELR';
import type { SimulationContext } from '@/engine/types';
import type { CalculationsSnapshot } from '@/types';
import { computeSnapshot } from '@/engine/compute';
import { createBaseEngineState } from '@/engine/adapter';
import { applyAction, getTimeToSave, calculateEarningsForTime } from '@/engine/apply';
import { createSimAction } from '@/types/actions/meta';
import { getNextPacificTime, isEarningsBoostActive } from '@/lib/events';
import { ei } from 'lib';

// Research categories to exclude from specific ranking views
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

// Evaluation IDs for ELR "potential" mode
const FLEET_RESEARCH_IDS = [
  'vehicle_reliablity',
  'excoskeletons',
  'traffic_management',
  'egg_loading_bots',
  'autonomous_vehicles',
];
const TRAIN_CAR_RESEARCH_ID = 'micro_coupling';

function filterByCategories(r: CommonResearch, excluded: string[]): boolean {
  const categories = r.categories.split(',').map(c => c.trim());
  return !categories.some(c => excluded.includes(c));
}

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
    vehicles: Array(maxSlots)
      .fill(null)
      .map(() => ({ vehicleId: 11, trainLength: maxTrainLen })),
  };
  return computeSnapshot(modifiedState, context);
}

/**
 * Common shape for a ranked research candidate. Raw numeric data only — no formatted
 * strings/labels (those are a view-layer concern, derived by the caller, same convention as
 * `calculateResearchROI` and `milestoneChain.ts`). Not every field is populated by every ranking
 * function: the ROI-specific fields are only set by `rankResearchByROI`, the ELR-specific fields
 * only by `rankResearchByELRImpact`.
 */
export interface ResearchRankingItem {
  research: CommonResearch;
  price: number;
  currentLevel: number;
  targetLevel: number;
  canBuy: boolean;
  // Only set by rankResearchByROI. rankResearchByELRImpact intentionally leaves this unset —
  // matching the pre-hoist behavior — so callers fall back to computing it live off the current
  // earnings rate instead of a value that may already be stale by the time it's read.
  timeToBuySeconds?: number;

  // ROI ranking fields (rankResearchByROI)
  roiSeconds?: number;
  totalRoiSeconds?: number;
  pairRoiSeconds?: number;
  pairPartnerResearch?: CommonResearch;
  isLaying?: boolean;
  isShipping?: boolean;

  // ELR ranking fields (rankResearchByELRImpact)
  impact?: number;
  hpp?: number;
  timeRoiSeconds?: number;
  realisticStats?: { layRate: number; shippingRate: number; elr: number; elrDelta: number };
  lookahead?: {
    minLevels: number;
    impact: number;
    hpp: number;
    timeRoiSeconds: number;
    realisticStats: { layRate: number; shippingRate: number; elr: number; elrDelta: number };
  };

  showSaleWarning?: boolean;
  showDeadlineWarning?: boolean;

  // Whether this candidate's price reflects a research sale (decision-time truth, matching what
  // would actually be charged), and whether the wait to afford it would complete during a 2x
  // earnings boost — same semantics as MilestoneChainItem's fields of the same name.
  duringSale: boolean;
  duringEarningsBoost: boolean;
  // Only set by rankResearchByROI — the extra $/sec this purchase would add to earnings once
  // bought (already computed internally via calculateResearchROI, just not previously surfaced).
  // Not a meaningful concept for rankResearchByELRImpact's lay-rate/shipping-impact candidates.
  earningsDelta?: number;
}

/**
 * Ranks unpurchased research by earnings ROI (how fast it pays for itself), with the "immediate
 * impact" mode's bottleneck-pairing logic: a laying/shipping research with poor solo ROI (because
 * the other side of the pipeline bottlenecks it) is paired with the best-ROI research on the
 * *other* side, and ranked by their combined payback time if that's better than either alone.
 */
export function rankResearchByROI(
  researchLevels: Record<string, number>,
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  isSale: boolean,
  absoluteSimTime: number,
  researchSaleDeadline: number,
  roiMode: 'immediate' | 'maxed_vehicles',
  deliveryImpactOnly: boolean
): ResearchRankingItem[] {
  const baseState = createBaseEngineState(startSnapshot);
  const currentEarnings = startSnapshot.offlineEarnings;

  const nextSaleStart = getNextPacificTime(5, 9, absoluteSimTime);
  const upcoming9amDurations = Array.from(
    { length: 7 },
    (_, i) => getNextPacificTime(i, 9, absoluteSimTime) - absoluteSimTime
  );
  const eventExpirationSeconds = Math.min(...upcoming9amDurations);

  if (currentEarnings <= 0) return [];

  const unpurchased = getCommonResearches().filter(
    r => (researchLevels[r.id] || 0) < r.levels && filterByCategories(r, ROI_EXCLUDED_CATEGORIES)
  );
  const uniqueUnpurchased = Array.from(new Map(unpurchased.map(r => [r.id, r])).values());

  const baseMaxVehiclesSnapshot =
    roiMode === 'maxed_vehicles' ? buildMaxVehiclesSnapshot(startSnapshot, researchLevels, context) : null;

  const basicCandidates = uniqueUnpurchased.map(r => {
    const level = researchLevels[r.id] || 0;
    const canBuy = isTierUnlocked(researchLevels, r.tier);
    const categories = r.categories.split(',').map(c => c.trim());
    const isLaying = categories.includes('egg_laying_rate');
    const isShipping = categories.includes('shipping_capacity');

    let roiSeconds: number;
    let totalRoiSeconds: number;
    let showSaleWarning: boolean;
    let showDeadlineWarning: boolean;
    let resultTimeToBuySeconds: number;
    let resultEarningsDelta: number;
    let resultPrice: number;
    let resultDuringSale: boolean;
    let nextSnapshot: CalculationsSnapshot;

    if (roiMode === 'maxed_vehicles' && baseMaxVehiclesSnapshot) {
      const purchase = getSaleAwareTimeToSave(r, level, mods, isSale, absoluteSimTime, startSnapshot, []);
      resultPrice = purchase.price;
      resultDuringSale = purchase.duringSale;
      resultTimeToBuySeconds = purchase.waitSeconds;
      const afterMaxSnapshot = buildMaxVehiclesSnapshot(
        startSnapshot,
        { ...researchLevels, [r.id]: level + 1 },
        context
      );
      nextSnapshot = afterMaxSnapshot;
      const maxTime = 1e9;
      const getExtra = (t: number) =>
        calculateEarningsForTime(t, afterMaxSnapshot) - calculateEarningsForTime(t, baseMaxVehiclesSnapshot);
      if (getExtra(maxTime) >= resultPrice) {
        let low = 0,
          high = maxTime;
        for (let i = 0; i < 60; i++) {
          const mid = (low + high) / 2;
          if (getExtra(mid) >= resultPrice) high = mid;
          else low = mid;
        }
        roiSeconds = high;
      } else {
        roiSeconds = Infinity;
      }
      totalRoiSeconds = isFinite(resultTimeToBuySeconds) ? resultTimeToBuySeconds + roiSeconds : Infinity;
      resultEarningsDelta = roiSeconds !== Infinity && roiSeconds > 0 ? resultPrice / roiSeconds : 0;
      showSaleWarning = !resultDuringSale && absoluteSimTime + resultTimeToBuySeconds >= nextSaleStart;
      showDeadlineWarning = isSale && absoluteSimTime + resultTimeToBuySeconds > researchSaleDeadline;
    } else {
      const roiResult = calculateResearchROI({
        research: r,
        level,
        mods,
        snapshot: startSnapshot,
        context,
        eventTiming: {
          absoluteSimTime,
          nextSaleStart,
          eventExpirationSeconds,
          researchSaleDeadline,
          isSaleActive: isSale,
        },
      });
      ({ roiSeconds, totalRoiSeconds, showSaleWarning, showDeadlineWarning, nextSnapshot } = roiResult);
      resultTimeToBuySeconds = roiResult.timeToBuySeconds;
      resultEarningsDelta = roiResult.earningsDelta;
      resultPrice = roiResult.price;
      resultDuringSale = roiResult.duringSale;
    }

    return {
      research: r,
      price: resultPrice,
      currentLevel: level,
      targetLevel: level + 1,
      timeToBuySeconds: resultTimeToBuySeconds,
      canBuy,
      roiSeconds,
      totalRoiSeconds,
      isLaying,
      isShipping,
      nextSnapshot,
      showSaleWarning,
      showDeadlineWarning,
      earningsDelta: resultEarningsDelta,
      duringSale: resultDuringSale,
      duringEarningsBoost: isEarningsBoostActive(absoluteSimTime + resultTimeToBuySeconds),
    };
  });

  const bestLaying = [...basicCandidates]
    .filter(c => c.isLaying && c.canBuy && c.roiSeconds !== Infinity)
    .sort((a, b) => a.roiSeconds - b.roiSeconds)[0];

  const bestShipping = [...basicCandidates]
    .filter(c => c.isShipping && c.canBuy && c.roiSeconds !== Infinity)
    .sort((a, b) => a.roiSeconds - b.roiSeconds)[0];

  return basicCandidates
    .map((c): ResearchRankingItem => {
      let pairRoiSeconds: number | undefined;
      let pairPartnerResearch: CommonResearch | undefined;
      let showSaleWarning = c.showSaleWarning;

      if (roiMode === 'immediate') {
        const isBottlenecked = c.roiSeconds === Infinity || c.roiSeconds > 3600 * 24 * 7;

        if (isBottlenecked && (c.isLaying || c.isShipping)) {
          const partner = c.isLaying ? bestShipping : bestLaying;
          if (partner && partner.research.id !== c.research.id) {
            const level1 = researchLevels[c.research.id] || 0;
            const level2 = researchLevels[partner.research.id] || 0;

            let pairState = applyAction(
              baseState,
              createSimAction(
                'buy_research',
                {
                  researchId: c.research.id,
                  fromLevel: level1,
                  toLevel: level1 + 1,
                },
                c.price
              )
            );

            pairState = applyAction(
              pairState,
              createSimAction(
                'buy_research',
                {
                  researchId: partner.research.id,
                  fromLevel: level2,
                  toLevel: level2 + 1,
                },
                partner.price
              )
            );

            const pairSnapshot = computeSnapshot(pairState, context);
            const pairEarnings = pairSnapshot.offlineEarnings;
            const partnerEarnings = partner.nextSnapshot.offlineEarnings;

            if (pairEarnings > partnerEarnings) {
              const pairTotalCost = c.price + partner.price;
              const pairDelta = pairEarnings - currentEarnings;
              const combinedRoiSeconds = pairTotalCost / pairDelta;

              if (combinedRoiSeconds < c.roiSeconds) {
                pairRoiSeconds = combinedRoiSeconds;
                pairPartnerResearch = partner.research;

                // This item alone won't reach 70% payback before the next sale, but it
                // only makes sense to buy as part of the pair — so judge the sale warning
                // against the pair's combined payback time instead of this item's solo ROI.
                showSaleWarning =
                  !isSale &&
                  (absoluteSimTime + c.timeToBuySeconds >= nextSaleStart ||
                    pairDelta * (nextSaleStart - (absoluteSimTime + c.timeToBuySeconds)) < 0.7 * pairTotalCost);
              }
            }
          }
        }
      }

      return {
        research: c.research,
        price: c.price,
        currentLevel: c.currentLevel,
        targetLevel: c.targetLevel,
        timeToBuySeconds: c.timeToBuySeconds,
        canBuy: c.canBuy,
        roiSeconds: c.roiSeconds,
        totalRoiSeconds: c.totalRoiSeconds,
        isLaying: c.isLaying,
        isShipping: c.isShipping,
        pairRoiSeconds,
        pairPartnerResearch,
        showSaleWarning,
        showDeadlineWarning: c.showDeadlineWarning,
        earningsDelta: c.earningsDelta,
        duringSale: c.duringSale,
        duringEarningsBoost: c.duringEarningsBoost,
      };
    })
    .filter(c => {
      if (!deliveryImpactOnly) return true;
      const cats = c.research.categories.split(',').map(s => s.trim());
      return cats.some(cat => DELIVERY_IMPACT_CATEGORIES.has(cat));
    })
    .sort((a, b) => {
      if (a.canBuy !== b.canBuy) return a.canBuy ? -1 : 1;
      const aSortSeconds =
        a.pairRoiSeconds !== undefined ? Math.min(a.totalRoiSeconds!, a.pairRoiSeconds) : a.totalRoiSeconds!;
      const bSortSeconds =
        b.pairRoiSeconds !== undefined ? Math.min(b.totalRoiSeconds!, b.pairRoiSeconds) : b.totalRoiSeconds!;
      if (aSortSeconds === bSortSeconds) {
        return a.price - b.price;
      }
      return aSortSeconds - bSortSeconds;
    });
}

/**
 * Ranks unpurchased research by Delivery Rate impact. `realistic` mode runs the full pipeline
 * (optimal artifacts + max habs/vehicles via `getOptimalELRSet`/`computeRealisticELR`), with a
 * lookahead search for multi-level research where level+1 alone has zero impact. `potential` mode
 * uses a cheaper formula-based estimate instead. Both compute `hpp` (hours per impact-percentage-
 * point) and can be sorted by it (`efficiency`) or by raw impact (`impact`).
 */
export function rankResearchByELRImpact(
  researchLevels: Record<string, number>,
  rawBackup: ei.IBackup | null | undefined,
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  isSale: boolean,
  absoluteSimTime: number,
  researchSaleDeadline: number,
  viewMode: 'realistic' | 'potential',
  sortMode: 'efficiency' | 'impact'
): ResearchRankingItem[] {
  const unpurchased = getCommonResearches().filter(
    r => (researchLevels[r.id] || 0) < r.levels && filterByCategories(r, ELR_EXCLUDED_CATEGORIES)
  );
  const uniqueUnpurchased = Array.from(new Map(unpurchased.map(r => [r.id, r])).values());

  let candidates: ResearchRankingItem[];

  if (viewMode === 'realistic') {
    if (!rawBackup) return [];

    const baselineOptimal = getOptimalELRSet(rawBackup, {
      assumeMaxHabsVehicles: true,
      excludeGusset: false,
      commonResearch: researchLevels,
      epicResearchLevels: context.epicResearchLevels,
      colleggtibleModifiers: context.colleggtibleModifiers,
    });
    const baselineArtifactMods = calculateArtifactModifiers(baselineOptimal);
    const baseline = computeRealisticELR(
      researchLevels,
      baselineArtifactMods,
      context.epicResearchLevels,
      context.colleggtibleModifiers
    );

    if (baseline.effectiveRate <= 0) return [];

    candidates = uniqueUnpurchased
      .map((r): ResearchRankingItem => {
        const level = researchLevels[r.id] || 0;
        // Two separate sale-aware decisions: "no bank" is a fair cross-item comparison metric
        // (hpp/timeRoiSeconds), "with bank" is what actually gets charged/shown — they can
        // legitimately disagree about whether waiting for the sale wins, since a bigger bank
        // shortens the "buy now" wait without changing the "wait for sale" one.
        const noBankSnapshot = { ...startSnapshot, bankValue: 0 };
        const noBankPurchase = getSaleAwareTimeToSave(r, level, mods, isSale, absoluteSimTime, noBankSnapshot, []);
        const withBankPurchase = getSaleAwareTimeToSave(r, level, mods, isSale, absoluteSimTime, startSnapshot, []);
        const price = withBankPurchase.price;
        const secondsToBuyNoBank = noBankPurchase.waitSeconds;
        const secondsToBuyWithBank = withBankPurchase.waitSeconds;

        const tempLevels = { ...researchLevels, [r.id]: level + 1 };
        const tempOptimal = getOptimalELRSet(rawBackup, {
          assumeMaxHabsVehicles: true,
          excludeGusset: false,
          commonResearch: tempLevels,
          epicResearchLevels: context.epicResearchLevels,
          colleggtibleModifiers: context.colleggtibleModifiers,
        });
        const tempArtifactMods = calculateArtifactModifiers(tempOptimal);
        const stats = computeRealisticELR(
          tempLevels,
          tempArtifactMods,
          context.epicResearchLevels,
          context.colleggtibleModifiers
        );
        const impact = (stats.effectiveRate - baseline.effectiveRate) / baseline.effectiveRate;

        const hoursToBuy = secondsToBuyNoBank / 3600;
        const hpp = impact > 0 ? hoursToBuy / (impact * 100) : Infinity;
        const timeRoiSeconds = impact > 0 ? secondsToBuyNoBank / impact : Infinity;

        // Lookahead: find the minimum N levels that unlock positive ELR impact.
        let lookahead:
          | {
              minLevels: number;
              impact: number;
              hpp: number;
              timeRoiSeconds: number;
              realisticStats: { layRate: number; shippingRate: number; elr: number; elrDelta: number };
            }
          | undefined;
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
            const laStats = computeRealisticELR(
              laLevels,
              laArtifactMods,
              context.epicResearchLevels,
              context.colleggtibleModifiers
            );
            const laImpact = (laStats.effectiveRate - baseline.effectiveRate) / baseline.effectiveRate;
            if (laImpact > 0) {
              let totalPriceForN = 0;
              for (let l = level; l < level + n; l++) {
                totalPriceForN += getDiscountedVirtuePrice(r, l, mods, isSale);
              }
              const totalSecondsForN = getTimeToSave(totalPriceForN, noBankSnapshot);
              const totalHoursForN = totalSecondsForN / 3600;
              lookahead = {
                minLevels: n,
                impact: laImpact,
                hpp: totalHoursForN / (laImpact * 100),
                timeRoiSeconds: totalSecondsForN / laImpact,
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
          canBuy: isTierUnlocked(researchLevels, r.tier),
          impact,
          hpp,
          timeRoiSeconds,
          lookahead,
          realisticStats: {
            layRate: stats.layRate * 3600,
            shippingRate: stats.shippingRate * 3600,
            elr: stats.effectiveRate * 3600,
            elrDelta: (stats.effectiveRate - baseline.effectiveRate) * 3600,
          },
          showDeadlineWarning: isSale && absoluteSimTime + secondsToBuyWithBank > researchSaleDeadline,
          duringSale: withBankPurchase.duringSale,
          duringEarningsBoost: isEarningsBoostActive(absoluteSimTime + secondsToBuyWithBank),
        };
      })
      .filter(c => (c.impact ?? 0) > 0 || c.lookahead !== undefined);
  } else {
    const currentSlots = calculateMaxVehicleSlots(researchLevels);
    const currentMaxCars = calculateMaxTrainLength(researchLevels);

    candidates = uniqueUnpurchased
      .map((r): ResearchRankingItem => {
        const level = researchLevels[r.id] || 0;
        // Two separate sale-aware decisions: "no bank" is a fair cross-item comparison metric
        // (hpp/timeRoiSeconds), "with bank" is what actually gets charged/shown — they can
        // legitimately disagree about whether waiting for the sale wins, since a bigger bank
        // shortens the "buy now" wait without changing the "wait for sale" one.
        const noBankSnapshot = { ...startSnapshot, bankValue: 0 };
        const noBankPurchase = getSaleAwareTimeToSave(r, level, mods, isSale, absoluteSimTime, noBankSnapshot, []);
        const withBankPurchase = getSaleAwareTimeToSave(r, level, mods, isSale, absoluteSimTime, startSnapshot, []);
        const price = withBankPurchase.price;
        const secondsToBuyNoBank = noBankPurchase.waitSeconds;
        const secondsToBuyWithBank = withBankPurchase.waitSeconds;
        const impact = FLEET_RESEARCH_IDS.includes(r.id)
          ? 1 / currentSlots
          : r.id === TRAIN_CAR_RESEARCH_ID
            ? 1 / currentMaxCars
            : r.per_level / (1 + level * r.per_level);

        const hoursToBuy = secondsToBuyNoBank / 3600;
        const hpp = impact > 0 ? hoursToBuy / (impact * 100) : Infinity;
        const timeRoiSeconds = impact > 0 ? secondsToBuyNoBank / impact : Infinity;

        return {
          research: r,
          price,
          currentLevel: level,
          targetLevel: level + 1,
          canBuy: isTierUnlocked(researchLevels, r.tier),
          impact,
          hpp,
          timeRoiSeconds,
          showDeadlineWarning: isSale && absoluteSimTime + secondsToBuyWithBank > researchSaleDeadline,
          duringSale: withBankPurchase.duringSale,
          duringEarningsBoost: isEarningsBoostActive(absoluteSimTime + secondsToBuyWithBank),
        };
      })
      .filter(c => (c.impact ?? 0) > 0);
  }

  if (sortMode === 'efficiency') {
    candidates.sort((a, b) => {
      if (a.canBuy !== b.canBuy) return a.canBuy ? -1 : 1;
      if (isFinite(a.hpp!) || isFinite(b.hpp!)) {
        if (a.hpp !== b.hpp) return a.hpp! - b.hpp!;
      }
      return b.impact! - a.impact!;
    });
  } else {
    candidates.sort((a, b) => {
      if (a.canBuy !== b.canBuy) return a.canBuy ? -1 : 1;
      if (a.impact !== b.impact) return b.impact! - a.impact!;
      return a.hpp! - b.hpp!;
    });
  }

  // Note: `hpp`/`timeRoiSeconds`/`realisticStats`/`impact` above are the item's own (pre-lookahead)
  // values; when `lookahead` is set, the caller displays *its* hpp/timeRoiSeconds/realisticStats/
  // impact instead (this item alone has no positive impact, so its own stats aren't meaningful to
  // show) — that swap is a view-layer formatting choice, done by the caller, not baked in here.
  return candidates;
}

/**
 * Shared "buy the next passing candidate, repeat" loop shape behind the manual planner's "Buy
 * Until Sale Warning" / "Buy Until Sale Ends" buttons and the auto-planner's equivalents.
 * `getCandidate` re-ranks and picks the next candidate each call — the caller closes over
 * whatever current state it's re-ranking against (Pinia stores for the manual planner, a mutable
 * `EngineState` for the auto planner) — so buying research on one iteration is reflected in the
 * next call's ranking.
 */
export function buyWhilePassingCheck(
  getCandidate: () => { researchId: string } | undefined,
  buyOne: (researchId: string) => boolean,
  maxIterations = 1000
): number {
  let purchased = 0;
  for (let i = 0; i < maxIterations; i++) {
    const next = getCandidate();
    if (!next) break;
    if (!buyOne(next.researchId)) break;
    purchased++;
  }
  return purchased;
}

import type { EngineState, SimulationContext } from '../types';
import { calculateResearchROI } from '../../calculations/researchROI';
import {
  getCommonResearches,
  getDiscountedVirtuePrice,
  type ResearchCostModifiers,
  isTierUnlocked,
  purchasesNeededForTier,
} from '../../calculations/commonResearch';
import { computeSnapshot } from '../../engine/compute';

export interface EventTiming {
  absoluteSimTime: number;
  nextSaleStart: number;
  eventExpirationSeconds: number;
  researchSaleDeadline: number;
  isSaleActive: boolean;
}

export interface EarningsRecommendation {
  researchId: string;
  price: number;
  isFiller: boolean;
  roiSeconds: number;
  name: string;
  timeToBuySeconds: number;
  earningsDelta: number;
}

export const DEFAULT_EARNINGS_CATEGORIES = [
  'egg_value',
  'egg_laying_rate',
  'shipping_capacity',
  'hab_capacity',
];

/**
 * Finds the best earnings-related research to buy, considering both direct ROI 
 * and the "Path ROI" of unlocking higher tiers.
 */
export function getBestEarningsRecommendation(
  currentState: EngineState,
  context: SimulationContext,
  eventTiming: EventTiming,
  modifiers: ResearchCostModifiers,
  timeLeft: number,
  categories: string[] = DEFAULT_EARNINGS_CATEGORIES,
  buildPhaseEnd?: number
): EarningsRecommendation | null {
  if (timeLeft <= 0 || timeLeft === Infinity) return null;

  const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
  const allCommon = getCommonResearches();
  const unmaxed = allCommon.filter(r => (currentState.researchLevels[r.id] || 0) < r.levels);
  const unlockedTiers = Array.from(
    new Set(allCommon.filter(r => isTierUnlocked(currentState.researchLevels, r.tier)).map(r => r.tier))
  );
  const maxUnlockedTier = Math.max(0, ...unlockedTiers);
  const absTime = eventTiming.absoluteSimTime;

  // 1. Evaluate current best ROI among unlocked research
  const candidates = unmaxed
    .filter(r => categories.some(cat => r.categories.includes(cat)))
    .filter(r => r.tier <= maxUnlockedTier)
    .map(r => {
      const level = currentState.researchLevels[r.id] || 0;
      const price = getDiscountedVirtuePrice(r, level, modifiers, eventTiming.isSaleActive);
      return {
        research: r,
        price,
        roi: calculateResearchROI({
          research: r,
          level,
          price,
          snapshot: currentSnap,
          context,
          eventTiming,
        }),
      };
    })
    .filter(item => item.roi.roiSeconds < timeLeft)
    .sort((a, b) => a.roi.roiSeconds - b.roi.roiSeconds);

  const bestCurrentROI = candidates.length > 0 ? candidates[0].roi.roiSeconds : Infinity;

  // Filter candidates by "Meets A/B" criteria if buildPhaseEnd is provided
  const validCandidates = candidates.filter(c => {
    if (buildPhaseEnd === undefined) return true;

    const purchaseTime = absTime + c.roi.timeToBuySeconds;
    if (purchaseTime > buildPhaseEnd) return false;
    
    // Meets B: Research pays for itself before the end of the build phase
    const meetsB = c.roi.earningsDelta * (buildPhaseEnd - purchaseTime) >= c.price;
    if (!meetsB) return false;

    // Meets A: If no sale, is it better to buy now vs wait for Friday?
    // (Buying now is worth it if it earns back at least 70% of its price before the sale starts)
    const meetsA = eventTiming.isSaleActive || 
      (c.roi.earningsDelta * (eventTiming.nextSaleStart - purchaseTime) >= 0.7 * c.price);
    
    return meetsA;
  });

  let bestRecommendation: EarningsRecommendation | null = null;
  if (validCandidates.length > 0) {
    const best = validCandidates[0];
    bestRecommendation = {
      researchId: best.research.id,
      price: best.price,
      isFiller: false,
      roiSeconds: best.roi.roiSeconds,
      name: best.research.name,
      timeToBuySeconds: best.roi.timeToBuySeconds,
      earningsDelta: best.roi.earningsDelta,
    };
  }

  // 2. Evaluate ROI of unlocking the next tier (targeting big gains)
  if (maxUnlockedTier < 13) {
    const nextTier = maxUnlockedTier + 1;
    const needed = purchasesNeededForTier(currentState.researchLevels, nextTier);

    if (needed > 0) {
      const fillers = unmaxed
        .filter(r => r.tier < nextTier)
        .map(r => {
          const currentLevel = currentState.researchLevels[r.id] || 0;
          const price = getDiscountedVirtuePrice(
            r,
            currentLevel,
            modifiers,
            eventTiming.isSaleActive
          );
          return { id: r.id, name: r.name, price, levelsLeft: r.levels - currentLevel };
        })
        .sort((a, b) => a.price - b.price);

      const totalFillerLevels = fillers.reduce((sum, f) => sum + f.levelsLeft, 0);

      if (totalFillerLevels >= needed) {
        // Approximate cost to unlock using the cheapest filler
        const unlockPrice = fillers[0].price * Math.min(needed, fillers[0].levelsLeft);

        const nextTierEarnings = unmaxed
          .filter(r => r.tier === nextTier && categories.some(cat => r.categories.includes(cat)))
          .map(r => {
            const level = currentState.researchLevels[r.id] || 0;
            const price = getDiscountedVirtuePrice(r, level, modifiers, eventTiming.isSaleActive);
            return {
              research: r,
              price,
              roi: calculateResearchROI({
                research: r,
                level,
                price,
                snapshot: currentSnap,
                context,
                eventTiming,
              }),
            };
          })
          .filter(c => c.roi.roiSeconds !== Infinity)
          .sort((a, b) => a.roi.roiSeconds - b.roi.roiSeconds);

        if (nextTierEarnings.length > 0) {
          const bestNext = nextTierEarnings[0];
          const totalPathPrice = unlockPrice + bestNext.price;

          const timeToSaveAll =
            currentSnap.offlineEarnings > 0 ? totalPathPrice / currentSnap.offlineEarnings : Infinity;
          const paybackTime =
            bestNext.roi.earningsDelta > 0 ? totalPathPrice / bestNext.roi.earningsDelta : Infinity;
          const pathROI = timeToSaveAll + paybackTime;

          if (pathROI < timeLeft && pathROI < bestCurrentROI) {
            const cheapest = fillers[0];
            bestRecommendation = {
              researchId: cheapest.id,
              price: cheapest.price,
              isFiller: true,
              roiSeconds: pathROI,
              name: cheapest.name,
              timeToBuySeconds: currentSnap.offlineEarnings > 0 
                ? Math.max(0, (cheapest.price - currentSnap.bankValue) / currentSnap.offlineEarnings)
                : Infinity,
              earningsDelta: bestNext.roi.earningsDelta,
            };
          }
        }
      }
    }
  }

  return bestRecommendation;
}


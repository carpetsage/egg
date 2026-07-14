import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import {
  getCommonResearches,
  getDiscountedVirtuePrice,
  type ResearchCostModifiers,
  getResearchById,
  isTierUnlocked,
} from '../../calculations/commonResearch';
import {
  getBestEarningsRecommendation,
} from '../engine/strategist';
import { computeSnapshot } from '../../engine/compute';
import { applyAction, calculateEggsDeliveredForTime } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
import { shiftCost } from 'lib';
import {
  isResearchSaleActive,
  getNextSaleStart,
  getNextSaleEnd,
  isEarningsBoostActive,
  getNextEarningsBoostEnd,
  getNextEarningsBoostStart,
} from '../calendar';
import { computeRealisticELR } from '../../calculations/realisticELR';
import { buildELRCandidatePool, evaluateELRWithPool, evaluateELRForStructure, type ELRCandidatePool } from '../../lib/artifacts/virtue';
import type { EquippedArtifact } from '../../lib/artifacts/types';
import { calculateArtifactModifiers } from '../../lib/artifacts';

const EARNINGS_CATEGORIES = ['egg_value', 'egg_laying_rate', 'shipping_capacity', 'hab_capacity'];

/** Research IDs that feed into ELR calculations (lay rate, shipping capacity, hab capacity). */
const ELR_RELEVANT_RESEARCH_IDS = new Set([
  // Lay rate
  'comfy_nests', 'hen_house_ac', 'improved_genetics', 'time_compress',
  'timeline_diversion', 'relativity_optimization',
  // Shipping capacity
  'leafsprings', 'lightweight_boxes', 'driver_training', 'super_alloy',
  'quantum_storage', 'hover_upgrades', 'dark_containment', 'neural_net_refine', 'hyper_portalling',
  // Fleet size (vehicle slots → total shipping)
  'vehicle_reliablity', 'excoskeletons', 'traffic_management', 'egg_loading_bots', 'autonomous_vehicles',
  // Train length (Graviton Coupling → shipping per vehicle)
  'micro_coupling',
  // Hab capacity (population → lay rate)
  'hab_capacity1', 'microlux', 'grav_plating', 'wormhole_dampening',
]);

function calculateTotalPurchases(researchLevels: Record<string, number>): number {
  let total = 0;
  for (const level of Object.values(researchLevels)) {
    total += level;
  }
  return total;
}

export function runC3(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number = 0
): ShiftResult {
  let currentState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const getAbsTime = () => context.ascensionStartTime + context.planStartOffset + (startState.lastStepTime || 0) + elapsedSeconds;

  const getModifiers = (snapshot: any): ResearchCostModifiers => {
    const artifactMods = calculateArtifactModifiers(currentState.artifactLoadout);
    return {
      labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
      waterballoonMultiplier: context.colleggtibleModifiers.researchCost || 1,
      puzzleCubeMultiplier: artifactMods.researchCost.totalMultiplier,
    };
  };

  const advanceTime = (totalSeconds: number) => {
    let remaining = totalSeconds;

    while (remaining > 0) {
      const absTime = getAbsTime();
      const nextSaleStart = getNextSaleStart(absTime);
      const nextBoostStart = getNextEarningsBoostStart(absTime);
      const nextSaleEnd = getNextSaleStart(absTime) + 24 * 3600; // rough, but works for boundaries
      const nextBoostEnd = getNextEarningsBoostEnd(absTime);
      
      const boundaries = [
        { time: nextSaleStart, type: 'research_sale' },
        { time: getNextSaleEnd(absTime), type: 'research_sale_end' },
        { time: nextBoostStart, type: 'earnings_boost' },
        { time: nextBoostEnd, type: 'earnings_boost_end' },
      ].filter(b => b.time > absTime).sort((a, b) => a.time - b.time);

      const nextBoundary = boundaries[0];
      
      let stepSeconds = remaining;
      let targetEvent: string | undefined;

      if (nextBoundary && (nextBoundary.time - absTime) <= remaining) {
        stepSeconds = nextBoundary.time - absTime;
        targetEvent = nextBoundary.type;
      }

      if (stepSeconds > 0) {
        let actionType: any = 'wait_for_time';
        if (targetEvent === 'research_sale') actionType = 'wait_for_research_sale';
        else if (targetEvent === 'earnings_boost') actionType = 'wait_for_earnings_boost';

        const snap = computeSnapshot(currentState, context, { skipGrowth: true });
        const waitAction = createSimAction(actionType, { totalTimeSeconds: stepSeconds });
        const passiveEggs = calculateEggsDeliveredForTime(stepSeconds, snap);

        currentState = applyAction(currentState, waitAction);
        currentState = {
          ...currentState,
          lastStepTime: (currentState.lastStepTime || 0) + stepSeconds,
          bankValue: (currentState.bankValue || 0) + snap.offlineEarnings * stepSeconds,
          eggsDelivered: { ...currentState.eggsDelivered, [currentState.currentEgg]: (currentState.eggsDelivered[currentState.currentEgg] || 0) + passiveEggs },
        };

        const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
        waitAction.endState = finalSnap;
        waitAction.totalTimeSeconds = stepSeconds;
        waitAction.bankDelta = snap.offlineEarnings * stepSeconds;

        actions.push(waitAction);
        elapsedSeconds += stepSeconds;
        remaining -= stepSeconds;
      }

      // Check toggles after advancing
      const newAbsTime = getAbsTime();
      
      const isBoostNow = isEarningsBoostActive(newAbsTime);
      if (currentState.earningsBoost?.active !== isBoostNow) {
        const toggleBoost = createSimAction('toggle_earnings_boost', {
          active: isBoostNow,
          multiplier: 2
        });
        currentState = applyAction(currentState, toggleBoost);
        toggleBoost.endState = computeSnapshot(currentState, context, { skipGrowth: true });
        actions.push(toggleBoost);
      }

      const isSaleNow = isResearchSaleActive(newAbsTime);
      if (currentState.activeSales?.research !== isSaleNow) {
        const toggleSale = createSimAction('toggle_sale', {
          saleType: 'research',
          active: isSaleNow,
          multiplier: 0.35
        });
        currentState = applyAction(currentState, toggleSale);
        toggleSale.endState = computeSnapshot(currentState, context, { skipGrowth: true });
        actions.push(toggleSale);
      }
    }
  };

  const buyResearch = (researchId: string, customPrice?: number): boolean => {
    const research = getResearchById(researchId);
    if (!research) return false;
    const currentLevel = currentState.researchLevels[researchId] || 0;
    if (currentLevel >= research.levels) return false;

    const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
    const price = customPrice !== undefined ? customPrice : getDiscountedVirtuePrice(
      research,
      currentLevel,
      getModifiers(snapshot),
      isResearchSaleActive(getAbsTime())
    );

    if (snapshot.offlineEarnings <= 0) return false;

    const timeToSave = Math.max(0, (price - snapshot.bankValue) / snapshot.offlineEarnings);
    advanceTime(timeToSave);

    const action = createSimAction('buy_research', {
      researchId,
      fromLevel: currentLevel,
      toLevel: currentLevel + 1,
    }, price);

    currentState = applyAction(currentState, action);
    
    // Decoration
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    action.endState = finalSnap;
    action.totalTimeSeconds = 0;
    action.bankDelta = -price;

    actions.push(action);
    return true;
  };

  // 1. Shift to Curiosity
  const sCost = shiftCost(currentState.soulEggs, currentState.shiftCount);
  const shiftAction = createSimAction('shift', {
    fromEgg: currentState.currentEgg,
    toEgg: 'curiosity',
    newShiftCount: currentState.shiftCount + 1,
  }, sCost);
  
  currentState = applyAction(currentState, shiftAction);
  
  // Decoration
  const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
  shiftAction.endState = finalSnap;
  shiftAction.totalTimeSeconds = 0;

  actions.push(shiftAction);

  const finalSaleStart = buildPhaseEnd - 86400;

  // Step 1: Earnings ROI matrix
  let step1Active = true;
  while (step1Active && getAbsTime() < buildPhaseEnd) {
    const absTime = getAbsTime();
    const nextSaleStart = getNextSaleStart(absTime);
    const nextBoostStart = getNextEarningsBoostStart(absTime);
    const nextBoostEnd = getNextEarningsBoostEnd(absTime);
    
    const boundaries = [
      nextSaleStart,
      getNextSaleEnd(absTime),
      nextBoostStart,
      nextBoostEnd,
      finalSaleStart,
      buildPhaseEnd
    ].filter(b => b > absTime).sort((a, b) => a - b);
    
    const nextBoundary = boundaries[0];

    const eventTiming = {
      absoluteSimTime: absTime,
      nextSaleStart,
      eventExpirationSeconds: isEarningsBoostActive(absTime)
        ? nextBoostEnd - absTime
        : nextBoostStart - absTime,
      researchSaleDeadline: getNextSaleStart(absTime),
      isSaleActive: isResearchSaleActive(absTime),
    };

    const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });

    const recommendation = getBestEarningsRecommendation(
      currentState,
      context,
      eventTiming,
      getModifiers(currentSnap),
      buildPhaseEnd - absTime,
      undefined,
      buildPhaseEnd
    );

    if (recommendation) {
      const purchaseTime = absTime + (recommendation.timeToBuySeconds || 0);
      if (purchaseTime <= nextBoundary) {
        buyResearch(recommendation.researchId, recommendation.price);
      } else {
        advanceTime(nextBoundary - absTime);
      }
    } else {
      if (absTime >= finalSaleStart) {
        step1Active = false;
      } else {
        advanceTime(nextBoundary - absTime);
      }
    }
  }

  // Step 2: Buy ELR Impact research (Realistic, Time Efficiency)

  // Build the artifact candidate pool and lock the best structure — both done once.
  // The 500-combo structure search runs exactly once; every subsequent ELR evaluation
  // only runs the cheap stone allocation on that fixed structure (~500× less work).
  const elrPool: ELRCandidatePool | null = context.rawBackup
    ? buildELRCandidatePool(context.rawBackup, false)
    : null;

  // Run the full combo search once to find the best artifact structure.
  let bestELRStructure: EquippedArtifact[] | null = null;
  if (elrPool) {
    const initialSet = evaluateELRWithPool(elrPool, {
      commonResearch: currentState.researchLevels,
      epicResearchLevels: context.epicResearchLevels,
      colleggtibleModifiers: context.colleggtibleModifiers,
    });
    // Store artifact IDs + slot counts only; stones are re-allocated per research state.
    bestELRStructure = initialSet.map(slot => ({
      artifactId: slot.artifactId,
      stones: new Array(slot.stones.length).fill(null),
    }));
  }

  // Memoize ELR stats by research state. Each miss only re-runs stone allocation
  // on the fixed structure (~12 evaluations) rather than the full 500-combo search.
  // Reuse a shared memo from context (populated by a prior C3 run, e.g. the 1-sale run)
  // so the 2-sale run benefits from already-computed states.
  const elrMemo: Map<string, { layRate: number; shippingRate: number; effectiveRate: number }> =
    context.elrMemo ?? new Map();
  context.elrMemo = elrMemo; // write back so subsequent C3 calls can inherit it
  const memoGetELR = (researchLevels: Record<string, number>) => {
    const key = JSON.stringify(
      Object.entries(researchLevels)
        .filter(([id]) => ELR_RELEVANT_RESEARCH_IDS.has(id))
        .sort(([a], [b]) => a.localeCompare(b))
    );
    let result = elrMemo.get(key);
    if (!result) {
      result = evaluateELRForStructure(bestELRStructure!, elrPool!, {
        commonResearch: researchLevels,
        epicResearchLevels: context.epicResearchLevels,
        colleggtibleModifiers: context.colleggtibleModifiers,
      });
      elrMemo.set(key, result);
    }
    return result;
  };

  // Unified helper: uses the locked structure + pool when available, falls back
  // to the current artifact loadout for the no-backup case.
  const computeELRStats = (researchLevels: Record<string, number>) => {
    if (bestELRStructure && elrPool) return memoGetELR(researchLevels);
    const mods = calculateArtifactModifiers(currentState.artifactLoadout);
    const raw = computeRealisticELR(researchLevels, mods, context.epicResearchLevels, context.colleggtibleModifiers);
    return { layRate: raw.layRate, shippingRate: raw.shippingRate, effectiveRate: raw.effectiveRate };
  };

  let elrActive = true;
  while (elrActive && getAbsTime() < buildPhaseEnd) {
    const absTime = getAbsTime();

    const nextBoostStart = getNextEarningsBoostStart(absTime);
    const nextBoostEnd = getNextEarningsBoostEnd(absTime);
    
    const boundaries = [
      getNextSaleStart(absTime),
      getNextSaleEnd(absTime),
      nextBoostStart,
      nextBoostEnd,
      buildPhaseEnd
    ].filter(b => b > absTime).sort((a, b) => a - b);
    
    const nextBoundary = boundaries[0];

    const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    const isSale = isResearchSaleActive(absTime);
    const mods = getModifiers(currentSnap);

    const baselineELR = computeELRStats(currentState.researchLevels).effectiveRate;

    if (baselineELR <= 0) {
      advanceTime(nextBoundary - absTime);
      continue;
    }

    const elrCandidatesAll = getCommonResearches()
      .filter(r => (currentState.researchLevels[r.id] || 0) < r.levels)
      .filter(r => isTierUnlocked(currentState.researchLevels, r.tier))
      .map(r => {
        const level = currentState.researchLevels[r.id] || 0;
        const price = getDiscountedVirtuePrice(r, level, mods, isSale);

        const tempLevels = { ...currentState.researchLevels, [r.id]: level + 1 };
        const stats = computeELRStats(tempLevels);
        const impact = (stats.effectiveRate - baselineELR) / baselineELR;

        const secondsToBuyNoBank = currentSnap.offlineEarnings > 0 ? price / currentSnap.offlineEarnings : Infinity;
        const hoursToBuy = secondsToBuyNoBank / 3600;
        const hpp = impact > 0 ? hoursToBuy / (impact * 100) : Infinity;

        // Lookahead: if +1 level has no impact, find the minimum N levels that unlock positive impact.
        // C3 will then buy one level at a time — re-evaluation each loop keeps the research in
        // the candidate list until all N levels are bought or time runs out.
        let lookahead: { minLevels: number; impact: number; hpp: number } | undefined;
        if (impact <= 0 && level + 1 < r.levels) {
          for (let n = 2; n <= r.levels - level; n++) {
            const laLevels = { ...currentState.researchLevels, [r.id]: level + n };
            const laStats = computeELRStats(laLevels);
            const laImpact = (laStats.effectiveRate - baselineELR) / baselineELR;
            if (laImpact > 0) {
              let totalPriceForN = 0;
              for (let l = level; l < level + n; l++) {
                totalPriceForN += getDiscountedVirtuePrice(r, l, mods, isSale);
              }
              const totalHoursForN = currentSnap.offlineEarnings > 0 ? totalPriceForN / currentSnap.offlineEarnings / 3600 : Infinity;
              lookahead = {
                minLevels: n,
                impact: laImpact,
                hpp: totalHoursForN / (laImpact * 100),
              };
              break;
            }
          }
        }

        return {
          research: r,
          price,
          impact,
          // Use lookahead HPP for sorting so zero-impact-but-worthwhile items rank correctly.
          hpp: lookahead ? lookahead.hpp : hpp,
          lookahead,
          layRate: stats.layRate,
          shippingRate: stats.shippingRate,
          timeToBuySeconds: Math.max(0, (price - currentSnap.bankValue) / currentSnap.offlineEarnings)
        };
      });

    const elrCandidates = elrCandidatesAll
      .filter(c => (c.impact > 0 || c.lookahead !== undefined) && c.timeToBuySeconds !== Infinity && (absTime + c.timeToBuySeconds <= buildPhaseEnd))
      .sort((a, b) => a.hpp - b.hpp);

    if (elrCandidates.length > 0) {
      const best = elrCandidates[0];
      const purchaseTime = absTime + best.timeToBuySeconds;

      if (purchaseTime <= nextBoundary) {
        buyResearch(best.research.id, best.price);
      } else {
        advanceTime(nextBoundary - absTime);
      }
    } else {
      if (nextBoundary === buildPhaseEnd) {
        // Nothing left to buy before the sale ends, so we can exit C3 early!
        elrActive = false;
      } else {
        advanceTime(nextBoundary - absTime);
      }
    }
  }

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}

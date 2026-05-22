import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { calculateResearchROI } from '../../calculations/researchROI';
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
import { applyAction } from '../../engine/apply';
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
import { formatNumber } from '@/lib/format';
import { computeRealisticELR } from '../../calculations/realisticELR';
import { getOptimalELRSet } from '../../lib/artifacts/virtue';
import { calculateArtifactModifiers } from '../../lib/artifacts';

const EARNINGS_CATEGORIES = ['egg_value', 'egg_laying_rate', 'shipping_capacity', 'hab_capacity'];

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
  // console.log('--- Starting C3 Shift Simulation ---');
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
        
        currentState = applyAction(currentState, waitAction);
        currentState = { ...currentState, lastStepTime: (currentState.lastStepTime || 0) + stepSeconds, bankValue: (currentState.bankValue || 0) + snap.offlineEarnings * stepSeconds };

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
  // console.log(`  Shifted to Curiosity. Cost: ${formatNumber(sCost, 3)} SE`);

  const finalSaleStart = buildPhaseEnd - 86400;

  // console.log(`[C3 DEBUG] Ascension Start: ${context.ascensionStartTime}`);
  // console.log(`[C3 DEBUG] Plan Start Offset: ${context.planStartOffset}`);
  // console.log(`[C3 DEBUG] startState.lastStepTime: ${startState.lastStepTime}`);
  // console.log(`[C3 DEBUG] Initial absTime: ${getAbsTime()}`);
  // console.log(`[C3 DEBUG] finalSaleStart: ${finalSaleStart}`);
  // console.log(`[C3 DEBUG] buildPhaseEnd: ${buildPhaseEnd}`);

  // Step 1: Earnings ROI matrix
  // console.log('Phase 1: Buying Earnings ROI research...');

  let step1Active = true;
  while (step1Active && getAbsTime() < buildPhaseEnd) {
    const absTime = getAbsTime();
    // console.log(`[C3 DEBUG Phase 1] absTime: ${absTime}, elapsedSeconds: ${elapsedSeconds}`);

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
      if (recommendation.isFiller) {
        // console.log(`[C3 Phase 1] Choosing Unlock Path (Filler: ${recommendation.name})`);
      }
      
      const purchaseTime = absTime + (recommendation.timeToBuySeconds || 0); 
      if (purchaseTime <= nextBoundary) {
        if (buyResearch(recommendation.researchId, recommendation.price)) {
          // console.log(`  Bought ${recommendation.isFiller ? 'filler' : 'earnings'}: ${recommendation.name} (ROI: ${formatNumber(recommendation.roiSeconds, 0)}s)`);
        }
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
  // console.log('Phase 2: Buying ELR Impact research (Realistic, Time Efficiency)...');

  let elrActive = true;
  while (elrActive && getAbsTime() < buildPhaseEnd) {
    const absTime = getAbsTime();
    // console.log(`[C3 DEBUG Phase 2] absTime: ${absTime}, elapsedSeconds: ${elapsedSeconds}`);

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

    let baselineELR = 0;
    let baselineLayRate = 0;
    let baselineShipRate = 0;
    if (context.rawBackup) {
      const optimal = getOptimalELRSet(context.rawBackup, {
        assumeMaxHabsVehicles: true,
        excludeGusset: false,
        commonResearch: currentState.researchLevels,
        epicResearchLevels: context.epicResearchLevels,
        colleggtibleModifiers: context.colleggtibleModifiers,
      });
      const artifactMods = calculateArtifactModifiers(optimal);
      const stats = computeRealisticELR(currentState.researchLevels, artifactMods, context.epicResearchLevels, context.colleggtibleModifiers);
      baselineELR = stats.effectiveRate;
      baselineLayRate = stats.layRate;
      baselineShipRate = stats.shippingRate;
    } else {
      const artifactMods = calculateArtifactModifiers(currentState.artifactLoadout);
      const stats = computeRealisticELR(currentState.researchLevels, artifactMods, context.epicResearchLevels, context.colleggtibleModifiers);
      baselineELR = stats.effectiveRate;
      baselineLayRate = stats.layRate;
      baselineShipRate = stats.shippingRate;
    }

    if (baselineELR <= 0) {
      console.log('  Cannot compute baseline ELR, skipping Phase 2');
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
        let tempArtifactMods;

        if (context.rawBackup) {
          const tempOptimal = getOptimalELRSet(context.rawBackup, {
            assumeMaxHabsVehicles: true,
            excludeGusset: false,
            commonResearch: tempLevels,
            epicResearchLevels: context.epicResearchLevels,
            colleggtibleModifiers: context.colleggtibleModifiers,
          });
          tempArtifactMods = calculateArtifactModifiers(tempOptimal);
        } else {
          tempArtifactMods = calculateArtifactModifiers(currentState.artifactLoadout);
        }

        const stats = computeRealisticELR(tempLevels, tempArtifactMods, context.epicResearchLevels, context.colleggtibleModifiers);
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
            let laArtifactMods;
            if (context.rawBackup) {
              const laOptimal = getOptimalELRSet(context.rawBackup, {
                assumeMaxHabsVehicles: true,
                excludeGusset: false,
                commonResearch: laLevels,
                epicResearchLevels: context.epicResearchLevels,
                colleggtibleModifiers: context.colleggtibleModifiers,
              });
              laArtifactMods = calculateArtifactModifiers(laOptimal);
            } else {
              laArtifactMods = calculateArtifactModifiers(currentState.artifactLoadout);
            }
            const laStats = computeRealisticELR(laLevels, laArtifactMods, context.epicResearchLevels, context.colleggtibleModifiers);
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

    const fmt = (n: number) => (n * 3600).toExponential(3);
    console.log(`[C3 Phase 2] Baseline (max Hyperloops assumed): lay=${fmt(baselineLayRate)}/hr, ship=${fmt(baselineShipRate)}/hr, ELR=${fmt(baselineELR)}/hr — bottleneck: ${baselineLayRate < baselineShipRate ? 'LAY RATE' : 'SHIPPING'}`);
    const DEBUG_IDS = ['neural_net_refine', 'hyper_portalling'];
    for (const id of DEBUG_IDS) {
      const c = elrCandidatesAll.find(c => c.research.id === id);
      if (c) {
        console.log(`  [C3 Phase 2] ${c.research.name}: impact=${(c.impact * 100).toFixed(4)}% (all remaining levels), lay=${fmt(c.layRate)}/hr, ship=${fmt(c.shippingRate)}/hr, timeToBuy=${c.timeToBuySeconds === Infinity ? '∞' : c.timeToBuySeconds.toFixed(0)}s`);
      } else {
        console.log(`  [C3 Phase 2] ${id}: not in candidate list (maxed or tier locked)`);
      }
    }

    const elrCandidates = elrCandidatesAll
      .filter(c => (c.impact > 0 || c.lookahead !== undefined) && c.timeToBuySeconds !== Infinity && (absTime + c.timeToBuySeconds <= buildPhaseEnd))
      .sort((a, b) => a.hpp - b.hpp);

    console.log(`[C3 Phase 2] Top 3 ELR candidates after filter:`, elrCandidates.slice(0, 3).map(c => {
      const la = c.lookahead;
      return la
        ? `${c.research.name} (lookahead ${la.minLevels} levels, hpp: ${la.hpp.toFixed(2)}, impact: ${(la.impact * 100).toFixed(2)}%)`
        : `${c.research.name} (hpp: ${c.hpp.toFixed(2)}, impact: ${(c.impact * 100).toFixed(2)}%)`;
    }));

    if (elrCandidates.length > 0) {
      const best = elrCandidates[0];
      const purchaseTime = absTime + best.timeToBuySeconds;

      if (purchaseTime <= nextBoundary) {
        if (buyResearch(best.research.id, best.price)) {
          // console.log(`  Bought ELR Impact research: ${best.research.name} (hpp: ${best.hpp.toFixed(2)})`);
        }
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

  const researchActions = actions.filter(a => a.type === 'buy_research');
  // console.log(`C3 Finished: ${researchActions.length} research actions, total time ${Math.floor(elapsedSeconds)}s`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}

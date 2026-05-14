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
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
import { shiftCost } from 'lib';
import {
  isResearchSaleActive,
  getNextSaleStart,
  isEarningsBoostActive,
  getNextEarningsBoostEnd,
  getNextEarningsBoostStart,
} from '../calendar';
import { formatNumber } from '@/lib/format';
import { computeRealisticELR } from '../../calculations/realisticELR';
import { getOptimalELRSet } from '../../lib/artifacts/virtue';
import { calculateArtifactModifiers } from '../../lib/artifacts';

const EARNINGS_CATEGORIES = ['egg_value', 'egg_laying_rate', 'shipping_capacity'];

export function runC3(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number
): ShiftResult {
  console.log('--- Starting C3 Shift Simulation ---');
  let currentState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const getAbsTime = () => context.ascensionStartTime + context.planStartOffset + elapsedSeconds;

  const getModifiers = (snapshot: any): ResearchCostModifiers => ({
    labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
    waterballoonMultiplier: context.colleggtibleModifiers.researchCost || 1,
    puzzleCubeMultiplier: snapshot.artifactModifiers?.researchPriceMultiplier ?? 1,
  });

  const advanceTime = (seconds: number) => {
    if (seconds <= 0) return;
    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    const waitAction = createSimAction('wait_for_time', { totalTimeSeconds: seconds });
    currentState = applyAction(currentState, waitAction);
    currentState = { ...currentState, bankValue: (currentState.bankValue || 0) + snap.offlineEarnings * seconds };
    actions.push(waitAction as unknown as any);
    elapsedSeconds += seconds;
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
    actions.push(action as unknown as any);
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
  actions.push(shiftAction as unknown as any);
  console.log(`  Shifted to Curiosity. Cost: ${formatNumber(sCost, 3)} SE`);

  // Step 1: Earnings ROI matrix
  console.log('Phase 1: Buying Earnings ROI research...');

  let changed = true;
  while (changed && getAbsTime() < buildPhaseEnd) {
    changed = false;
    const absTime = getAbsTime();
    const eventTiming = {
      absoluteSimTime: absTime,
      nextSaleStart: getNextSaleStart(absTime),
      eventExpirationSeconds: isEarningsBoostActive(absTime)
        ? getNextEarningsBoostEnd(absTime) - absTime
        : getNextEarningsBoostStart(absTime) - absTime,
      researchSaleDeadline: getNextSaleStart(absTime),
      isSaleActive: isResearchSaleActive(absTime),
    };

    const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });

    const candidates = getCommonResearches()
      .filter(r => EARNINGS_CATEGORIES.some(cat => r.categories.includes(cat)))
      .filter(r => (currentState.researchLevels[r.id] || 0) < r.levels)
      .filter(r => isTierUnlocked(currentState.researchLevels, r.tier))
      .map(r => {
        const level = currentState.researchLevels[r.id] || 0;
        const price = getDiscountedVirtuePrice(r, level, getModifiers(currentSnap), eventTiming.isSaleActive);
        return {
          research: r,
          price,
          roi: calculateResearchROI({ research: r, level, price, snapshot: currentSnap, context, eventTiming }),
        };
      })
      .filter(c => c.roi.roiSeconds !== Infinity)
      .sort((a, b) => a.roi.roiSeconds - b.roi.roiSeconds);

    if (candidates.length === 0) break;

    for (const c of candidates) {
      const price = c.price;
      const earningsDelta = c.roi.earningsDelta;
      const timeToBuySeconds = c.roi.timeToBuySeconds;
      const purchaseTime = absTime + timeToBuySeconds;

      if (purchaseTime > buildPhaseEnd) continue;

      const timeToNextSale = eventTiming.nextSaleStart - purchaseTime;
      const timeToBuildEnd = buildPhaseEnd - purchaseTime;

      const meetsA = !eventTiming.isSaleActive && (earningsDelta * timeToNextSale >= 0.7 * price);
      const meetsB = earningsDelta * timeToBuildEnd >= price;

      if (meetsB && (meetsA || eventTiming.isSaleActive)) {
        if (buyResearch(c.research.id, price)) {
          console.log(`  Bought A+B / Sale+B candidate: ${c.research.name}`);
          changed = true;
          break; // restart eval
        }
      }
    }
  }

  // Phase 1b: Queue !A+B candidates for sale start
  const preSaleTime = getAbsTime();
  if (preSaleTime < buildPhaseEnd && !isResearchSaleActive(preSaleTime)) {
    const nextSale = getNextSaleStart(preSaleTime);
    if (nextSale < buildPhaseEnd) {
      const timeToWait = nextSale - preSaleTime;
      console.log(`Phase 1b: Advancing to next sale start (${formatNumber(timeToWait, 0)}s)`);
      advanceTime(timeToWait);

      let saleChanged = true;
      while (saleChanged && getAbsTime() < buildPhaseEnd) {
        saleChanged = false;
        const absTime = getAbsTime();

        const eventTiming = {
          absoluteSimTime: absTime,
          nextSaleStart: getNextSaleStart(absTime),
          eventExpirationSeconds: isEarningsBoostActive(absTime)
            ? getNextEarningsBoostEnd(absTime) - absTime
            : getNextEarningsBoostStart(absTime) - absTime,
          researchSaleDeadline: getNextSaleStart(absTime),
          isSaleActive: isResearchSaleActive(absTime), // should be true
        };

        const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });

        const candidates = getCommonResearches()
          .filter(r => EARNINGS_CATEGORIES.some(cat => r.categories.includes(cat)))
          .filter(r => (currentState.researchLevels[r.id] || 0) < r.levels)
          .filter(r => isTierUnlocked(currentState.researchLevels, r.tier))
          .map(r => {
            const level = currentState.researchLevels[r.id] || 0;
            const price = getDiscountedVirtuePrice(r, level, getModifiers(currentSnap), true);
            return {
              research: r,
              price,
              roi: calculateResearchROI({ research: r, level, price, snapshot: currentSnap, context, eventTiming }),
            };
          })
          .filter(c => c.roi.roiSeconds !== Infinity)
          .sort((a, b) => a.roi.roiSeconds - b.roi.roiSeconds);

        for (const c of candidates) {
          const price = c.price;
          const earningsDelta = c.roi.earningsDelta;
          const timeToBuySeconds = c.roi.timeToBuySeconds;
          const purchaseTime = absTime + timeToBuySeconds;
          
          if (purchaseTime > buildPhaseEnd) continue;

          const timeToBuildEnd = buildPhaseEnd - purchaseTime;
          const meetsB = earningsDelta * timeToBuildEnd >= price;

          if (meetsB) {
            if (buyResearch(c.research.id, price)) {
              console.log(`  Bought B candidate during sale: ${c.research.name}`);
              saleChanged = true;
              break;
            }
          }
        }
      }
    }
  }

  // Step 2: Buy ELR Impact research (Realistic, Time Efficiency)
  console.log('Phase 2: Buying ELR Impact research (Realistic, Time Efficiency)...');

  let elrChanged = true;
  while (elrChanged && getAbsTime() < buildPhaseEnd) {
    elrChanged = false;
    const absTime = getAbsTime();

    const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    const isSale = isResearchSaleActive(absTime);
    const mods = getModifiers(currentSnap);

    let baselineELR = 0;
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
    }

    if (baselineELR <= 0) {
      console.log('  Cannot compute baseline ELR, skipping Phase 2');
      break; 
    }

    const elrCandidates = getCommonResearches()
      .filter(r => (currentState.researchLevels[r.id] || 0) < r.levels)
      .filter(r => isTierUnlocked(currentState.researchLevels, r.tier))
      .map(r => {
        const level = currentState.researchLevels[r.id] || 0;
        const price = getDiscountedVirtuePrice(r, level, mods, isSale);

        const tempLevels = { ...currentState.researchLevels, [r.id]: level + 1 };
        const tempOptimal = getOptimalELRSet(context.rawBackup, {
          assumeMaxHabsVehicles: true,
          excludeGusset: false,
          commonResearch: tempLevels,
          epicResearchLevels: context.epicResearchLevels,
          colleggtibleModifiers: context.colleggtibleModifiers,
        });
        const tempArtifactMods = calculateArtifactModifiers(tempOptimal);
        const stats = computeRealisticELR(tempLevels, tempArtifactMods, context.epicResearchLevels, context.colleggtibleModifiers);
        const impact = (stats.effectiveRate - baselineELR) / baselineELR;

        const secondsToBuyNoBank = currentSnap.offlineEarnings > 0 ? price / currentSnap.offlineEarnings : Infinity;
        const hoursToBuy = secondsToBuyNoBank / 3600;
        const hpp = impact > 0 ? hoursToBuy / (impact * 100) : Infinity;

        return {
          research: r,
          price,
          impact,
          hpp,
          timeToBuySeconds: Math.max(0, (price - currentSnap.bankValue) / currentSnap.offlineEarnings)
        };
      })
      .filter(c => c.impact > 0 && c.timeToBuySeconds !== Infinity && (absTime + c.timeToBuySeconds <= buildPhaseEnd))
      .sort((a, b) => a.hpp - b.hpp);

    if (elrCandidates.length > 0) {
      const best = elrCandidates[0];
      if (buyResearch(best.research.id, best.price)) {
        console.log(`  Bought ELR Impact research: ${best.research.name} (hpp: ${best.hpp.toFixed(2)})`);
        elrChanged = true;
      }
    }
  }

  // Phase 3: Wait to build phase end
  const finalAbsTime = getAbsTime();
  if (finalAbsTime < buildPhaseEnd) {
    const timeToWait = buildPhaseEnd - finalAbsTime;
    console.log(`Phase 3: Waiting to build phase end (${formatNumber(timeToWait, 0)}s)`);
    advanceTime(timeToWait);
  }

  const researchActions = actions.filter(a => a.type === 'buy_research');
  console.log(`C3 Finished: ${researchActions.length} research actions, total time ${Math.floor(elapsedSeconds)}s`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}

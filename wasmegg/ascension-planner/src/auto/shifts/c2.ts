import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { calculateResearchROI } from '../../calculations/researchROI';
import {
  getCommonResearches,
  getDiscountedVirtuePrice,
  type ResearchCostModifiers,
  getResearchById,
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

const FLEET_RESEARCH_IDS = [
  'vehicle_reliablity',
  'excoskeletons',
  'traffic_management',
  'egg_loading_bots',
  'autonomous_vehicles',
];
const GRAVITON_COUPLING_ID = 'micro_coupling';

/**
 * C2 Shift Strategy:
 * 1. Shift to Curiosity.
 * 2. Buy all fleet_size research until maxed.
 * 3. Buy graviton_coupling, trying to keep wait time < 4 hours. 
 *    If wait time > 4h, check if buying ROI earnings research reduces it < 4h.
 *    If so, buy earnings research and then graviton_coupling. 
 *    If not, just let the shift end.
 */
export function runC2(
  startState: EngineState,
  context: SimulationContext
): ShiftResult {
  console.log('--- Starting C2 Shift Simulation ---');
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
    // applyAction doesn't update bankValue for wait actions, so we credit earnings manually
    currentState = { ...currentState, bankValue: (currentState.bankValue || 0) + snap.offlineEarnings * seconds };
    actions.push(waitAction as unknown as any);
    elapsedSeconds += seconds;
  };

  const buyResearch = (researchId: string): boolean => {
    const research = getResearchById(researchId);
    if (!research) return false;
    const currentLevel = currentState.researchLevels[researchId] || 0;
    if (currentLevel >= research.levels) return false;

    const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
    const price = getDiscountedVirtuePrice(
      research,
      currentLevel,
      getModifiers(snapshot),
      isResearchSaleActive(getAbsTime())
    );

    if (snapshot.offlineEarnings <= 0) return false;

    const timeToSave = Math.max(0, (price - snapshot.bankValue) / snapshot.offlineEarnings);
    if (!Number.isFinite(timeToSave)) {
      console.log(`    Stalling: Cannot afford ${researchId} (time to save is infinite)`);
      return false;
    }
    
    if (elapsedSeconds + timeToSave > 14400) {
      console.log(`    Stalling: Buying ${researchId} would exceed the 4-hour shift limit`);
      return false;
    }
    
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

  // --- Helper: build event timing for ROI calculations ---
  const getEventTiming = () => {
    const absTime = getAbsTime();
    return {
      absoluteSimTime: absTime,
      nextSaleStart: getNextSaleStart(absTime),
      eventExpirationSeconds: isEarningsBoostActive(absTime)
        ? getNextEarningsBoostEnd(absTime) - absTime
        : getNextEarningsBoostStart(absTime) - absTime,
      researchSaleDeadline: getNextSaleStart(absTime),
      isSaleActive: isResearchSaleActive(absTime),
    };
  };

  // --- Helper: estimate remaining shift time ---
  const getEstimatedRemainingShiftTime = (): number => {
    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    if (snap.offlineEarnings <= 0) return Infinity;

    let totalTargetCost = 0;
    const mods = getModifiers(snap);
    const isSale = isResearchSaleActive(getAbsTime());

    // fleet researches remaining
    for (const id of FLEET_RESEARCH_IDS) {
      const research = getResearchById(id);
      if (research) {
        let level = currentState.researchLevels[id] || 0;
        while (level < research.levels) {
          totalTargetCost += getDiscountedVirtuePrice(research, level, mods, isSale);
          level++;
        }
      }
    }
    
    // Add ALL remaining levels of graviton coupling
    const gcResearch = getResearchById(GRAVITON_COUPLING_ID);
    if (gcResearch) {
      let gcLevel = currentState.researchLevels[GRAVITON_COUPLING_ID] || 0;
      while (gcLevel < gcResearch.levels) {
        totalTargetCost += getDiscountedVirtuePrice(gcResearch, gcLevel, mods, isSale);
        gcLevel++;
      }
    }

    const costLeft = Math.max(0, totalTargetCost - snap.bankValue);
    const timeToBuyAll = costLeft / snap.offlineEarnings;
    
    // The entire C2 shift should not take more than 4 hours (14400 seconds)
    const timeToHardLimit = Math.max(0, 14400 - elapsedSeconds);
    
    return Math.min(timeToBuyAll, timeToHardLimit);
  };

  // --- Helper: buy best ROI-positive earnings research (single purchase) ---
  const buyBestEarningsResearch = (): boolean => {
    const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    const eventTiming = getEventTiming();
    const timeLeft = getEstimatedRemainingShiftTime();

    if (timeLeft <= 0 || timeLeft === Infinity) return false;

    const candidates = getCommonResearches()
      .filter(r => r.categories.includes('egg_value') || r.categories.includes('egg_laying_rate') || r.categories.includes('shipping_capacity'))
      .filter(r => (currentState.researchLevels[r.id] || 0) < r.levels)
      .map(r => {
        const level = currentState.researchLevels[r.id] || 0;
        const price = getDiscountedVirtuePrice(r, level, getModifiers(currentSnap), eventTiming.isSaleActive);
        return {
          research: r,
          price,
          roi: calculateResearchROI({ research: r, level, price, snapshot: currentSnap, context, eventTiming }),
        };
      })
      .filter(item => item.roi.roiSeconds < timeLeft)
      .sort((a, b) => a.roi.roiSeconds - b.roi.roiSeconds);

    if (candidates.length > 0) {
      return buyResearch(candidates[0].research.id);
    }
    return false;
  };

  // 2. Buy all fleet_size research until maxed
  console.log('Phase 1: Buying all fleet_size research...');
  for (const id of FLEET_RESEARCH_IDS) {
    const research = getResearchById(id);
    while (research && (currentState.researchLevels[id] || 0) < research.levels) {
      while (buyBestEarningsResearch()) {
        // Continue buying ROI-positive earnings research
      }
      if (!buyResearch(id)) break;
    }
  }

  // 3. Buy graviton_coupling until we hit the 4h limit or max it out
  console.log('Phase 2: Checking graviton_coupling...');
  const gcResearch = getResearchById(GRAVITON_COUPLING_ID);
  
  while (gcResearch && (currentState.researchLevels[GRAVITON_COUPLING_ID] || 0) < gcResearch.levels) {
    while (buyBestEarningsResearch()) {
      // Continue buying ROI-positive earnings research
    }

    if (!buyResearch(GRAVITON_COUPLING_ID)) {
      break;
    }
  }

  console.log(`C2 Finished: ${actions.filter(a => a.type === 'buy_research').length} research actions, total time ${elapsedSeconds}s`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}


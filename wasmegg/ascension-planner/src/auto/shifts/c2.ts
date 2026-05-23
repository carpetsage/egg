import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import {
  getDiscountedVirtuePrice,
  type ResearchCostModifiers,
  getResearchById,
  isTierUnlocked,
  purchasesNeededForTier,
  getCommonResearches,
} from '../../calculations/commonResearch';
import {
  getBestEarningsRecommendation,
  DEFAULT_EARNINGS_CATEGORIES,
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
import { calculateArtifactModifiers } from '../../lib/artifacts';

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
  const c2Start = performance.now();
  console.log('[C2] Starting...');
  let currentState: EngineState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];
  let memoHits = 0;
  let memoMisses = 0;

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
      const nextSaleEnd = getNextSaleStart(absTime) + 24 * 3600;
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

  const buyResearch = (researchId: string): boolean => {
    const research = getResearchById(researchId);
    if (!research) return false;
    const currentLevel = currentState.researchLevels[researchId] || 0;
    if (currentLevel >= research.levels) return false;
    if (!isTierUnlocked(currentState.researchLevels, research.tier)) return false;

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
      // console.log(`    Stalling: Cannot afford ${researchId} (time to save is infinite)`);
      return false;
    }
    
    if (elapsedSeconds + timeToSave > 14400) {
      // console.log(`    Stalling: Buying ${researchId} would exceed the 4-hour shift limit`);
      return false;
    }
    
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

  // Memoize getBestEarningsRecommendation — same principle as C3's ELR memo.
  // Key on earnings-relevant research + tier state so fleet/graviton purchases
  // (which dominate C2) don't cause expensive re-evaluations.
  const earningsResearchIds = new Set(
    getCommonResearches()
      .filter(r => DEFAULT_EARNINGS_CATEGORIES.some(cat => r.categories.includes(cat)))
      .map(r => r.id)
  );
  const earningsMemo = new Map<string, ReturnType<typeof getBestEarningsRecommendation>>();
  const getEarningsKey = (timeLeft: number): string => {
    const isSale = isResearchSaleActive(getAbsTime());
    let maxTier = 0;
    for (let t = 1; t <= 13; t++) {
      if (isTierUnlocked(currentState.researchLevels, t)) maxTier = t; else break;
    }
    return JSON.stringify([
      Object.entries(currentState.researchLevels)
        .filter(([id]) => earningsResearchIds.has(id))
        .sort(([a], [b]) => a.localeCompare(b)),
      maxTier,
      isSale,
      Math.floor(timeLeft / 300),
    ]);
  };

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
    const timeLeft = getEstimatedRemainingShiftTime();
    const key = getEarningsKey(timeLeft);
    let recommendation = earningsMemo.get(key);
    if (recommendation === undefined) {
      const snap = computeSnapshot(currentState, context, { skipGrowth: true });
      recommendation = getBestEarningsRecommendation(
        currentState, context, getEventTiming(), getModifiers(snap), timeLeft
      );
      earningsMemo.set(key, recommendation);
      memoMisses++;
    } else {
      memoHits++;
    }
    if (recommendation) {
      return buyResearch(recommendation.researchId);
    }
    return false;
  };

  // --- Helper: try to unlock a tier by buying the cheapest available research ---
  const tryUnlockTier = (targetTier: number, targetResearchId: string): boolean => {
    if (isTierUnlocked(currentState.researchLevels, targetTier)) return true;

    const needed = purchasesNeededForTier(currentState.researchLevels, targetTier);
    if (needed === Infinity) return false;

    const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
    const mods = getModifiers(snapshot);
    const isSale = isResearchSaleActive(getAbsTime());

    // Estimate total cost to unlock by finding the cheapest 'needed' purchases
    let estimatedUnlockCost = 0;
    const tempLevels = { ...currentState.researchLevels };
    for (let i = 0; i < needed; i++) {
      let cheapestPrice = Infinity;
      let cheapestId = '';
      for (const r of getCommonResearches()) {
        if (
          r.tier < targetTier &&
          (tempLevels[r.id] || 0) < r.levels &&
          isTierUnlocked(tempLevels, r.tier)
        ) {
          const p = getDiscountedVirtuePrice(r, tempLevels[r.id] || 0, mods, isSale);
          if (p < cheapestPrice) {
            cheapestPrice = p;
            cheapestId = r.id;
          }
        }
      }
      if (!cheapestId) break;
      estimatedUnlockCost += cheapestPrice;
      tempLevels[cheapestId] = (tempLevels[cheapestId] || 0) + 1;
    }

    // Add cost of the next level of target research
    const targetResearch = getResearchById(targetResearchId);
    if (targetResearch) {
      estimatedUnlockCost += getDiscountedVirtuePrice(
        targetResearch,
        currentState.researchLevels[targetResearchId] || 0,
        mods,
        isSale
      );
    }

    const timeToSave = Math.max(0, (estimatedUnlockCost - snapshot.bankValue) / snapshot.offlineEarnings);
    if (elapsedSeconds + timeToSave > 14400) {
      // console.log(`  Not worth unlocking Tier ${targetTier}: would take too long (${timeToSave.toFixed(0)}s)`);
      return false;
    }

    // console.log(`  Unlocking Tier ${targetTier} for ${targetResearchId}...`);
    while (!isTierUnlocked(currentState.researchLevels, targetTier)) {
      let cheapestPrice = Infinity;
      let cheapestId = '';
      for (const r of getCommonResearches()) {
        if (
          r.tier < targetTier &&
          (currentState.researchLevels[r.id] || 0) < r.levels &&
          isTierUnlocked(currentState.researchLevels, r.tier)
        ) {
          const p = getDiscountedVirtuePrice(r, currentState.researchLevels[r.id] || 0, mods, isSale);
          if (p < cheapestPrice) {
            cheapestPrice = p;
            cheapestId = r.id;
          }
        }
      }
      if (!cheapestId) break;
      if (!buyResearch(cheapestId)) break;
    }

    return isTierUnlocked(currentState.researchLevels, targetTier);
  };

  // 2. Buy all fleet_size research until maxed
  const p1Start = performance.now();
  let p1Fleet = 0;
  let p1Earnings = 0;
  for (const id of FLEET_RESEARCH_IDS) {
    const research = getResearchById(id);
    while (research && (currentState.researchLevels[id] || 0) < research.levels) {
      while (buyBestEarningsResearch()) { p1Earnings++; }
      if (!buyResearch(id)) break;
      p1Fleet++;
    }
  }
  console.log(`[C2 P1] ${(performance.now() - p1Start).toFixed(0)}ms | fleet: ${p1Fleet}, earnings: ${p1Earnings}`);

  // 3. Buy graviton_coupling until we hit the 4h limit or max it out
  const p2Start = performance.now();
  let p2GC = 0;
  let p2Earnings = 0;
  const gcResearch = getResearchById(GRAVITON_COUPLING_ID);

  while (gcResearch && (currentState.researchLevels[GRAVITON_COUPLING_ID] || 0) < gcResearch.levels) {
    while (buyBestEarningsResearch()) { p2Earnings++; }

    if (!isTierUnlocked(currentState.researchLevels, gcResearch.tier)) {
      if (!tryUnlockTier(gcResearch.tier, GRAVITON_COUPLING_ID)) {
        break;
      }
    }

    if (!buyResearch(GRAVITON_COUPLING_ID)) {
      break;
    }
    p2GC++;
  }
  console.log(`[C2 P2] ${(performance.now() - p2Start).toFixed(0)}ms | graviton: ${p2GC}, earnings: ${p2Earnings}`);

  const researchActions = actions.filter(a => a.type === 'buy_research');
  console.log(`[C2] Total: ${(performance.now() - c2Start).toFixed(0)}ms | ${researchActions.length} purchases | memo ${memoHits} hits / ${memoMisses} misses`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}


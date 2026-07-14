import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import {
  getCommonResearches,
  isTierUnlocked,
  getDiscountedVirtuePrice,
  type ResearchCostModifiers,
  getResearchById,
} from '../../calculations/commonResearch';
import { runQuickWins } from './quickWins';
import {
  getBestEarningsRecommendation,
  DEFAULT_EARNINGS_CATEGORIES,
} from '../engine/strategist';
import { getArtifact, getStone, calculateArtifactModifiers } from '../../lib/artifacts';
import { computeSnapshot } from '../../engine/compute';
import { applyAction, calculateEggsDeliveredForTime } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
import {
  isResearchSaleActive,
  getNextSaleStart,
  getNextSaleEnd,
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

/** Categories that increase earnings (directly or via shipping bottleneck). */
const EARNINGS_CATEGORIES = ['egg_value', 'egg_laying_rate', 'shipping_capacity'];

/**
 * C1 Shift Strategy (Interleaved):
 *
 * PHASE 1: Interleaved tier-unlock + fleet + earnings (tiers 2→10)
 *   For each tier: unlock it (prefer earnings research within 2× cheapest),
 *   buy fleet_size research in that tier immediately, then buy quick-win
 *   earnings/shipping research before moving on.
 *   NOTE: autonomous_vehicles (tier 10) is deferred to Phase 4.
 *
 * PHASE 2: Checkpoint at tier 10 + graviton coupling attempt
 *   Save state. Try to unlock tiers 11→12 and buy graviton_coupling.
 *   If no graviton bought, roll back to checkpoint.
 *
 * PHASE 3: Earnings research to maximize rate
 *   Buy all ROI-positive earnings research (including shipping_capacity
 *   when shipping-bottlenecked) to maximize earnings for the rest of C1.
 *
 * PHASE 4: Buy autonomous_vehicles + graviton with remaining time/bank
 *   Now that earnings rate is maximized, buy as many autonomous_vehicles
 *   levels as affordable. Also buy more graviton if time permits.
 */
export function runC1(
  startState: EngineState,
  context: SimulationContext,
  timeLimit: number = 1800,
  peakELR: number = 0
): ShiftResult {
  const c1Start = performance.now();
  // console.log('[C1] Starting...');
  let currentState: EngineState = { ...startState, maxELR: peakELR };
  let elapsedSeconds = 0;
  let actions: Action[] = [];
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
    if (elapsedSeconds + timeToSave > timeLimit) return false;

    advanceTime(timeToSave);

    const action = createSimAction('buy_research', {
      researchId,
      fromLevel: currentLevel,
      toLevel: currentLevel + 1,
    }, price);

    currentState = applyAction(currentState, action);
    
    // Decoration for the action store
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    action.endState = finalSnap;
    action.totalTimeSeconds = 0;
    action.bankDelta = -price;

    actions.push(action);
    return true;
  };

  // --- Metrics logging ---
  const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
  const allStones = currentState.artifactLoadout.flatMap(slot => slot.stones).filter(Boolean);
  const stoneCounts: Record<string, number> = {};
  for (const stoneId of allStones) {
    const label = String(getStone(stoneId as string)?.label || stoneId);
    stoneCounts[label] = (stoneCounts[label] || 0) + 1;
  }
  const stonesSummary = Object.entries(stoneCounts)
    .map(([label, count]) => `${count}x ${label}`)
    .join(', ');

  // --- Helper: find best tier-unlock candidate, preferring earnings within 2× cheapest ---
  const findTierUnlockCandidate = (targetTier: number): string | null => {
    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    const isSale = isResearchSaleActive(getAbsTime());
    const mods = getModifiers(snap);

    const candidates = getCommonResearches()
      .filter(r => r.tier < targetTier && (currentState.researchLevels[r.id] || 0) < r.levels)
      .filter(r => isTierUnlocked(currentState.researchLevels, r.tier))
      .map(r => ({
        id: r.id,
        price: getDiscountedVirtuePrice(r, currentState.researchLevels[r.id] || 0, mods, isSale),
        isEarnings: EARNINGS_CATEGORIES.some(cat => r.categories.includes(cat)),
      }))
      .sort((a, b) => a.price - b.price);

    if (candidates.length === 0) return null;

    const cheapest = candidates[0];
    // Prefer earnings/shipping research if within 2× the cheapest option
    const earningsCandidate = candidates.find(c => c.isEarnings && c.price <= cheapest.price * 2);
    return earningsCandidate ? earningsCandidate.id : cheapest.id;
  };

  // Memoize getBestEarningsRecommendation keyed on earnings-relevant research + tier state.
  // Fleet, filler, and graviton purchases don't invalidate the cache, so repeated calls
  // between non-earnings purchases (common in Phase 1's tier-unlock loops) are free.
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
      Math.floor(timeLeft / 300), // 5-minute bucket
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

  // --- Helper: buy all research purchasable within QUICK_BUY_THRESHOLD_SECONDS of waiting ---
  // See quickWins.ts for the rationale and full implementation.
  const buyQuickWins = (): number => {
    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    const result = runQuickWins(
      currentState, actions, elapsedSeconds,
      snap.offlineEarnings, getModifiers(snap),
      context, getAbsTime, snap,
      timeLimit, EARNINGS_CATEGORIES,
    );
    currentState = result.currentState;
    elapsedSeconds = result.elapsedSeconds;
    return result.count;
  };

  // --- Helper: buy best ROI-positive earnings research (single purchase) ---
  const buyBestEarningsResearch = (): boolean => {
    const timeLeft = timeLimit - elapsedSeconds;
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


  // ========================================================================
  // PHASE 1: Interleaved tier-unlock + fleet + earnings (tiers 2→10)
  // ========================================================================
  const p1Start = performance.now();
  let p1Earnings = 0;
  let p1Fleet = 0;
  let p1QuickWins = 0;

  for (let targetTier = 2; targetTier <= 10 && elapsedSeconds <= timeLimit; targetTier++) {
    // Quick-win sweep: buy anything in any currently-unlocked tier that costs ≤3s of wait.
    // Buying cheap items accumulates purchases toward tier-unlock thresholds and may
    // unlock targetTier immediately, short-circuiting the tier-unlock loop below.
    p1QuickWins += buyQuickWins();

    // a) Unlock the tier
    while (!isTierUnlocked(currentState.researchLevels, targetTier) && elapsedSeconds <= timeLimit) {
      const candidate = findTierUnlockCandidate(targetTier);
      if (!candidate || !buyResearch(candidate)) break;
    }

    if (!isTierUnlocked(currentState.researchLevels, targetTier)) {
      break;
    }

    // b) Buy quick-win earnings research before moving to next tier
    while (elapsedSeconds <= timeLimit && buyBestEarningsResearch()) {
      p1Earnings++;
    }

    // c) Buy fleet_size research in this tier (except autonomous_vehicles, deferred to Phase 4)
    for (const id of FLEET_RESEARCH_IDS) {
      const research = getResearchById(id);
      if (research && research.tier === targetTier && id !== 'autonomous_vehicles') {
        while (buyResearch(id)) { p1Fleet++; }
      }
    }
  }

  const tier10Unlocked = isTierUnlocked(currentState.researchLevels, 10);
  // console.log(`[C1 P1] ${(performance.now() - p1Start).toFixed(0)}ms | quickWins: ${p1QuickWins}, earnings: ${p1Earnings}, fleet: ${p1Fleet}, tier10: ${tier10Unlocked}`);

  // ========================================================================
  // PHASE 2: Checkpoint + graviton coupling attempt
  // ========================================================================
  const p2Start = performance.now();
  let p2Graviton = 0;
  let p2Rolled = false;
  let p2QuickWins = 0;

  if (tier10Unlocked && elapsedSeconds <= timeLimit) {
    // Quick-win sweep before taking the checkpoint: anything cheap in tiers 1–10 is
    // unconditionally beneficial and must not be lost if the graviton attempt rolls back.
    p2QuickWins += buyQuickWins();

    const checkpointState = JSON.parse(JSON.stringify(currentState));
    const checkpointElapsed = elapsedSeconds;
    const checkpointActions = [...actions];

    let rollback = false;

    for (let tier = 11; tier <= 12 && elapsedSeconds <= timeLimit; tier++) {
      while (!isTierUnlocked(currentState.researchLevels, tier) && elapsedSeconds <= timeLimit) {
        const candidate = findTierUnlockCandidate(tier);
        if (!candidate || !buyResearch(candidate)) break;
      }

      if (!isTierUnlocked(currentState.researchLevels, tier)) {
        rollback = true;
        break;
      }
    }

    if (!rollback && isTierUnlocked(currentState.researchLevels, 12)) {
      while (elapsedSeconds <= timeLimit && buyResearch(GRAVITON_COUPLING_ID)) {
        p2Graviton++;
      }
      if (p2Graviton === 0) rollback = true;
    }

    if (rollback) {
      currentState = JSON.parse(JSON.stringify(checkpointState));
      elapsedSeconds = checkpointElapsed;
      actions = [...checkpointActions];
      p2Rolled = true;
    }
  }

  // console.log(`[C1 P2] ${(performance.now() - p2Start).toFixed(0)}ms | quickWins: ${p2QuickWins}, graviton: ${p2Graviton}, rolled back: ${p2Rolled}`);

  // ========================================================================
  // PHASE 3: Maximize earnings rate with remaining time
  // ========================================================================
  const p3Start = performance.now();
  let p3Earnings = 0;
  while (elapsedSeconds <= timeLimit && buyBestEarningsResearch()) {
    p3Earnings++;
  }
  // console.log(`[C1 P3] ${(performance.now() - p3Start).toFixed(0)}ms | earnings: ${p3Earnings}`);

  // ========================================================================
  // PHASE 4: Buy autonomous_vehicles (and more graviton if time permits)
  // ========================================================================
  const p4Start = performance.now();
  let p4AV = 0;
  let p4GC = 0;

  if (tier10Unlocked) {
    while (elapsedSeconds <= timeLimit && buyResearch('autonomous_vehicles')) { p4AV++; }

    if (isTierUnlocked(currentState.researchLevels, 12)) {
      while (elapsedSeconds <= timeLimit && buyResearch(GRAVITON_COUPLING_ID)) { p4GC++; }
    }
  }

  // console.log(`[C1 P4] ${(performance.now() - p4Start).toFixed(0)}ms | AV: ${p4AV}, graviton: ${p4GC}`);

  const researchActions = actions.filter(a => a.type === 'buy_research');
  // console.log(`[C1] Total: ${(performance.now() - c1Start).toFixed(0)}ms | ${researchActions.length} purchases | memo ${memoHits} hits / ${memoMisses} misses`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}

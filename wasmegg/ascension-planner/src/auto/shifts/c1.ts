import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { calculateResearchROI, type ROICalculationInput } from '../../calculations/researchROI';
import {
  getCommonResearches,
  isTierUnlocked,
  getDiscountedVirtuePrice,
  type ResearchCostModifiers,
  getResearchById,
} from '../../calculations/commonResearch';
import { getArtifact, getStone } from '../../lib/artifacts';
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
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
  timeLimit: number = 1800
): ShiftResult {
  console.log('--- Starting C1 Shift Simulation ---');
  let currentState = { ...startState };
  let elapsedSeconds = 0;
  let actions: Action[] = [];

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
    actions.push(action as unknown as any);
    return true;
  };

  // --- Metrics logging ---
  const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
  const allStones = currentState.artifactLoadout.flatMap(slot => slot.stones).filter(Boolean);
  const stoneCounts: Record<string, number> = {};
  for (const stoneId of allStones) {
    const label = String(getStone(stoneId as any)?.label || stoneId);
    stoneCounts[label] = (stoneCounts[label] || 0) + 1;
  }
  const stonesSummary = Object.entries(stoneCounts)
    .map(([label, count]) => `${count}x ${label}`)
    .join(', ');

  console.log('--- Simulation Metrics ---');
  console.log(`  TE: ${currentState.te}`);
  console.log(`  Artifacts: ${currentState.artifactLoadout
    .map(slot => (slot.artifactId ? getArtifact(slot.artifactId)?.label : 'Empty'))
    .join(', ')}`);
  if (stonesSummary) {
    console.log(`  Stones: ${stonesSummary}`);
  }
  console.log(`  Chickens: ${formatNumber(snapshot.population, 3)}`);
  console.log(`  Hab Capacity: ${formatNumber(snapshot.habCapacity, 3)}`);
  console.log(`  Laying Rate: ${formatNumber(snapshot.layRate * 3600, 3)}/hr`);
  console.log(`  Shipping Cap: ${formatNumber(snapshot.shippingCapacity * 3600, 3)}/hr`);
  console.log(`  ELR: ${formatNumber(snapshot.elr * 3600, 3)}/hr`);
  console.log(`  Earnings: ${formatNumber(snapshot.offlineEarnings * 3600, 3)} Virtue/hr`);
  console.log('---------------------------');

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

  // --- Helper: buy best ROI-positive earnings research (single purchase) ---
  const buyBestEarningsResearch = (): boolean => {
    const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    const eventTiming = getEventTiming();

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
      .filter(item => item.roi.roiSeconds < (timeLimit - elapsedSeconds))
      .sort((a, b) => a.roi.roiSeconds - b.roi.roiSeconds);

    if (candidates.length > 0) {
      // console.log(`  Quick win: ${candidates[0].research.name} (ROI: ${Math.floor(candidates[0].roi.roiSeconds)}s)`);
      return buyResearch(candidates[0].research.id);
    }
    return false;
  };

  // --- Helper: estimate how many levels of a research can be bought in remaining time ---
  const estimateBuyableLevels = (researchId: string): number => {
    const research = getResearchById(researchId);
    if (!research) return 0;

    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    if (snap.offlineEarnings <= 0) return 0;

    let level = currentState.researchLevels[researchId] || 0;
    let bank = snap.bankValue;
    let time = elapsedSeconds;
    const rate = snap.offlineEarnings;
    const mods = getModifiers(snap);
    let count = 0;

    while (level < research.levels && time < timeLimit) {
      const price = getDiscountedVirtuePrice(research, level, mods, isResearchSaleActive(
        context.ascensionStartTime + context.planStartOffset + time
      ));
      const saveTime = Math.max(0, (price - bank) / rate);
      if (time + saveTime > timeLimit) break;
      bank = bank + rate * saveTime - price;
      time += saveTime;
      level++;
      count++;
    }
    return count;
  };

  // ========================================================================
  // PHASE 1: Interleaved tier-unlock + fleet + earnings (tiers 2→10)
  // ========================================================================
  // console.log('Phase 1: Interleaved tier-unlock + fleet + earnings...');

  for (let targetTier = 2; targetTier <= 10 && elapsedSeconds <= timeLimit; targetTier++) {
    // a) Unlock the tier
    while (!isTierUnlocked(currentState.researchLevels, targetTier) && elapsedSeconds <= timeLimit) {
      const candidate = findTierUnlockCandidate(targetTier);
      if (!candidate || !buyResearch(candidate)) break;
    }

    if (!isTierUnlocked(currentState.researchLevels, targetTier)) {
      // console.log(`  Could not unlock Tier ${targetTier}, stopping Phase 1`);
      break;
    }

    // b) Buy quick-win earnings research before moving to next tier
    let earningsBought = 0;
    while (elapsedSeconds <= timeLimit && buyBestEarningsResearch()) {
      earningsBought++;
    }
    if (earningsBought > 0) {
      // console.log(`  Bought ${earningsBought} earnings research after unlocking Tier ${targetTier}`);
    }

    // c) Buy fleet_size research in this tier (except autonomous_vehicles, deferred to Phase 4)
    for (const id of FLEET_RESEARCH_IDS) {
      const research = getResearchById(id);
      if (research && research.tier === targetTier && id !== 'autonomous_vehicles') {
        while (buyResearch(id)) {
          // console.log(`  Bought fleet research: ${research.name}`);
        }
      }
    }
  }

  const tier10Unlocked = isTierUnlocked(currentState.researchLevels, 10);
  // console.log(`Phase 1 complete. Tier 10 ${tier10Unlocked ? 'unlocked' : 'NOT unlocked'}. Elapsed: ${Math.floor(elapsedSeconds)}s`);

  // ========================================================================
  // PHASE 2: Checkpoint + graviton coupling attempt
  // ========================================================================
  if (tier10Unlocked && elapsedSeconds <= timeLimit) {
    // console.log('Phase 2: Saving checkpoint at Tier 10, attempting graviton coupling...');

    // Save checkpoint (deep copy)
    const checkpointState = JSON.parse(JSON.stringify(currentState));
    const checkpointElapsed = elapsedSeconds;
    const checkpointActions = [...actions];

    let gravitonBought = 0;
    let rollback = false;

    // Try to unlock tiers 11 and 12
    for (let tier = 11; tier <= 12 && elapsedSeconds <= timeLimit; tier++) {
      while (!isTierUnlocked(currentState.researchLevels, tier) && elapsedSeconds <= timeLimit) {
        const candidate = findTierUnlockCandidate(tier);
        if (!candidate || !buyResearch(candidate)) break;
      }

      if (!isTierUnlocked(currentState.researchLevels, tier)) {
        // console.log(`  Could not unlock Tier ${tier}, rolling back to checkpoint`);
        rollback = true;
        break;
      }
    }

    // Try to buy graviton coupling if tier 12 unlocked
    if (!rollback && isTierUnlocked(currentState.researchLevels, 12)) {
      while (elapsedSeconds <= timeLimit && buyResearch(GRAVITON_COUPLING_ID)) {
        gravitonBought++;
      }
      // console.log(`  Bought ${gravitonBought} graviton coupling levels`);

      if (gravitonBought === 0) {
        // console.log(`  No graviton coupling affordable, rolling back to checkpoint`);
        rollback = true;
      }
    }

    if (rollback) {
      currentState = JSON.parse(JSON.stringify(checkpointState));
      elapsedSeconds = checkpointElapsed;
      actions = [...checkpointActions];
      // console.log(`  Rolled back to checkpoint at ${Math.floor(elapsedSeconds)}s`);
    } else {
      // console.log(`  Graviton attempt successful: ${gravitonBought} levels. Elapsed: ${Math.floor(elapsedSeconds)}s`);
    }
  }

  // ========================================================================
  // PHASE 3: Maximize earnings rate with remaining time
  // ========================================================================
  // console.log('Phase 3: Maximizing earnings rate...');
  {
    // Buy earnings research while ROI-positive, to maximize rate before buying AV
    let earningsBought = 0;
    while (elapsedSeconds <= timeLimit && buyBestEarningsResearch()) {
      earningsBought++;
    }
    if (earningsBought > 0) {
      // console.log(`  Bought ${earningsBought} earnings research in Phase 3`);
    }
  }

  // ========================================================================
  // PHASE 4: Buy autonomous_vehicles (and more graviton if time permits)
  // ========================================================================
  if (tier10Unlocked) {
    const avEstimate = estimateBuyableLevels('autonomous_vehicles');
    // console.log(`Phase 4: Buying autonomous_vehicles (estimated ${avEstimate} levels affordable)...`);
    let avBought = 0;
    while (elapsedSeconds <= timeLimit && buyResearch('autonomous_vehicles')) {
      avBought++;
    }
    // console.log(`  Bought ${avBought} autonomous_vehicles levels`);

    // Also try more graviton coupling if we got some earlier
    if (isTierUnlocked(currentState.researchLevels, 12)) {
      let gcBought = 0;
      while (elapsedSeconds <= timeLimit && buyResearch(GRAVITON_COUPLING_ID)) {
        gcBought++;
      }
      if (gcBought > 0) {
        // console.log(`  Bought ${gcBought} additional graviton coupling levels`);
      }
    }
  }

  const researchActions = actions.filter(a => a.type === 'buy_research');
  console.log(`C1 Finished: ${researchActions.length} research actions, total time ${Math.floor(elapsedSeconds)}s`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}

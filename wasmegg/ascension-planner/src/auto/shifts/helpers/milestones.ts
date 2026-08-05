import type { Action } from '@/types/actions/meta';
import { createSimAction } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../../types';
import { getResearchById, isTierUnlocked, type ResearchCostModifiers } from '../../../calculations/commonResearch';
import { findSmartBuyCandidate } from '../../../calculations/smartBuyCandidate';
import {
  computeTierMilestoneChain,
  computeResearchMilestoneChain,
  computeMilestoneBaseline,
  computeMilestoneSummaryCore,
  type MilestoneChainItem,
} from '../../../calculations/milestoneChain';
import { getSaleAwareTimeToSave } from '../../../calculations/researchROI';
import { calculateArtifactModifiers } from '../../../lib/artifacts';
import { computeSnapshot } from '../../../engine/compute';
import { applyAction, boostTransitionsFrom } from '../../../engine/apply';
import { advanceTimeWithBoundaries } from './advanceTime';
import { isResearchSaleActive, getNextSaleEnd } from '@/lib/events';

/**
 * Shared mutable-simulation plumbing for the milestone/smart-buy helpers below.
 *
 * `advanceTime` uses the same boundary-aware stepping as `c1.ts`/`c3.ts` (see AGENT.md's
 * "advanceTime must manually credit bankValue" gotcha) rather than the simplified flat wait
 * every other shift file uses: milestone chains (especially tier-unlock chains early in an
 * ascension, when earnings are low) can plausibly take long enough to cross a weekly sale or
 * earnings-boost boundary, so skipping boundary detection here would silently mis-price
 * purchases made after a boundary is crossed mid-wait.
 */
export function createMilestoneShiftHelpers(startState: EngineState, context: SimulationContext) {
  let currentState: EngineState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const baseAbsTime = context.ascensionStartTime + context.planStartOffset + (startState.lastStepTime || 0);
  const getAbsTime = () => baseAbsTime + elapsedSeconds;

  const getModifiers = (): ResearchCostModifiers => {
    const artifactMods = calculateArtifactModifiers(currentState.artifactLoadout);
    return {
      labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
      researchCostMultiplier: context.colleggtibleModifiers.researchCost || 1,
      puzzleCubeMultiplier: artifactMods.researchCost.totalMultiplier,
    };
  };

  const advanceTime = (totalSeconds: number) => {
    const result = advanceTimeWithBoundaries(currentState, actions, elapsedSeconds, context, baseAbsTime, totalSeconds);
    currentState = result.currentState;
    elapsedSeconds = result.elapsedSeconds;
  };

  /** Buy a single research level, deciding its own price/wait from the current state. */
  const buyResearch = (researchId: string, timeLimit: number): boolean => {
    const research = getResearchById(researchId);
    if (!research) return false;
    const currentLevel = currentState.researchLevels[researchId] || 0;
    if (currentLevel >= research.levels) return false;
    if (!isTierUnlocked(currentState.researchLevels, research.tier)) return false;

    const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
    const absTime = getAbsTime();
    const purchase = getSaleAwareTimeToSave(
      research,
      currentLevel,
      getModifiers(),
      isResearchSaleActive(absTime),
      absTime,
      snapshot,
      boostTransitionsFrom(snapshot, absTime)
    );

    if (snapshot.offlineEarnings <= 0) return false;

    const timeToSave = purchase.waitSeconds;
    if (elapsedSeconds + timeToSave > timeLimit) return false;

    advanceTime(timeToSave);

    const action = createSimAction(
      'buy_research',
      {
        researchId,
        fromLevel: currentLevel,
        toLevel: currentLevel + 1,
      },
      purchase.price
    );

    currentState = applyAction(currentState, action);

    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    action.endState = finalSnap;
    action.totalTimeSeconds = 0;
    action.bankDelta = -purchase.price;

    actions.push(action);
    return true;
  };

  /** Execute one already-planned milestone-chain item, using its precomputed price/wait. */
  const executeChainItem = (item: MilestoneChainItem, timeLimit: number): boolean => {
    if (elapsedSeconds + item.timeToBuySeconds > timeLimit) return false;

    advanceTime(item.timeToBuySeconds);

    const action = createSimAction(
      'buy_research',
      {
        researchId: item.research.id,
        fromLevel: item.currentLevel,
        toLevel: item.targetLevel,
      },
      item.price
    );

    currentState = applyAction(currentState, action);

    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    action.endState = finalSnap;
    action.totalTimeSeconds = 0;
    action.bankDelta = -item.price;

    actions.push(action);
    return true;
  };

  return {
    getAbsTime,
    getModifiers,
    buyResearch,
    executeChainItem,
    getState: () => currentState,
    getElapsedSeconds: () => elapsedSeconds,
    getActions: () => actions,
  };
}

/**
 * C1 bullet 1: "buy everything you can in a specific number of seconds" — repeatedly buys the
 * cheapest unlocked research level that can be saved up for in `<= thresholdSeconds`, ignoring
 * existing bank/gems (same semantics as the manual planner's Smart Buy button), until nothing
 * qualifies or `timeLimit` is reached.
 */
export function runSmartBuyForSeconds(
  startState: EngineState,
  context: SimulationContext,
  thresholdSeconds: number,
  timeLimit: number
): ShiftResult {
  const helpers = createMilestoneShiftHelpers(startState, context);

  while (helpers.getElapsedSeconds() <= timeLimit) {
    const snapshot = computeSnapshot(helpers.getState(), context, { skipGrowth: true });
    const isSale = isResearchSaleActive(helpers.getAbsTime());
    const candidate = findSmartBuyCandidate(
      helpers.getState().researchLevels,
      helpers.getModifiers(),
      isSale,
      snapshot,
      thresholdSeconds,
      helpers.getAbsTime()
    );
    if (!candidate) break;
    if (!helpers.buyResearch(candidate.research.id, timeLimit)) break;
  }

  return {
    actions: helpers.getActions(),
    elapsedSeconds: helpers.getElapsedSeconds(),
    endState: helpers.getState(),
  };
}

/**
 * C1 bullet 2: unlock a tier via the ROI-optimal milestone chain (rather than C1's own simpler
 * `findTierUnlockCandidate` heuristic). Plans the whole chain once up front against `startState`,
 * then executes it item-by-item, stopping early if `timeLimit` would be exceeded — the remaining
 * (unexecuted) plan is simply dropped, since each item's cost only depends on state up to that
 * point, not on later items.
 */
export function runTierUnlockMilestone(
  startState: EngineState,
  context: SimulationContext,
  targetTier: number,
  timeLimit: number
): ShiftResult {
  const helpers = createMilestoneShiftHelpers(startState, context);

  const startSnapshot = computeSnapshot(startState, context, { skipGrowth: true });
  const absoluteSimTimeAtStart = helpers.getAbsTime();
  const mods = helpers.getModifiers();
  // Deadline for "would this purchase still finish before the current/next sale ends" — must match
  // the manual planner's own `researchSaleDeadline` (`useResearchViews.ts`), which is `getNextSaleEnd`,
  // not `getNextSaleStart`. The two had drifted apart (this used to pass `getNextSaleStart`, a much
  // later timestamp) since this function was first extracted; manual is the better-tested source of
  // truth here, so auto now matches it exactly.
  const researchSaleDeadline = getNextSaleEnd(absoluteSimTimeAtStart);

  const chain = computeTierMilestoneChain(
    { tier: targetTier },
    startSnapshot,
    context,
    mods,
    absoluteSimTimeAtStart,
    researchSaleDeadline
  );

  for (const item of chain.items) {
    if (!helpers.executeChainItem(item, timeLimit)) break;
  }

  return {
    actions: helpers.getActions(),
    elapsedSeconds: helpers.getElapsedSeconds(),
    endState: helpers.getState(),
  };
}

/**
 * C1 bullet 3: buy a specific research's milestone chain only if its `optimizedSeconds` is below
 * `maxOptimizedSeconds`. Caller-side filtering by research type/ID (picking which `researchId` to
 * check) is the responsibility of whatever shift eventually calls this in a loop — this function
 * only handles "one target, buy-if-worthwhile."
 */
export function runResearchMilestoneIfWorthwhile(
  startState: EngineState,
  context: SimulationContext,
  researchId: string,
  targetLevel: number,
  maxOptimizedSeconds: number,
  timeLimit: number
): ShiftResult {
  const noop: ShiftResult = { actions: [], elapsedSeconds: 0, endState: startState };

  const helpers = createMilestoneShiftHelpers(startState, context);
  const startSnapshot = computeSnapshot(startState, context, { skipGrowth: true });
  const absoluteSimTimeAtStart = helpers.getAbsTime();
  const mods = helpers.getModifiers();
  // See `runTierUnlockMilestone`'s comment above — same fix, same reasoning.
  const researchSaleDeadline = getNextSaleEnd(absoluteSimTimeAtStart);

  const target = { researchId, targetLevel };

  const chain = computeResearchMilestoneChain(
    target,
    startState,
    startSnapshot,
    context,
    mods,
    absoluteSimTimeAtStart,
    researchSaleDeadline
  );
  const baseline = computeMilestoneBaseline(
    { kind: 'research', researchId, targetLevel },
    startSnapshot,
    context,
    mods,
    absoluteSimTimeAtStart
  );
  const summary = computeMilestoneSummaryCore(chain, baseline);

  if (summary.truncated || summary.optimizedSeconds === undefined || summary.optimizedSeconds > maxOptimizedSeconds) {
    return noop;
  }

  for (const item of chain.items) {
    if (!helpers.executeChainItem(item, timeLimit)) break;
  }

  return {
    actions: helpers.getActions(),
    elapsedSeconds: helpers.getElapsedSeconds(),
    endState: helpers.getState(),
  };
}

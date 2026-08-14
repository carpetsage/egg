import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { getResearchById, isTierUnlocked } from '../../calculations/commonResearch';
import { applyShiftAction } from './helpers/actionHelpers';
import { runTierUnlockMilestone, runResearchMilestoneIfWorthwhile } from './helpers/milestones';

const FLEET_RESEARCH_IDS = [
  'vehicle_reliablity',
  'excoskeletons',
  'traffic_management',
  'egg_loading_bots',
  'autonomous_vehicles',
];
const GRAVITON_COUPLING_ID = 'micro_coupling';
const C2_TIME_LIMIT_SECONDS = 14400; // 4 hours

/**
 * C2 Shift Strategy:
 * 1. Shift to Curiosity.
 * 2. Buy every fleet_size research to its max level, one level at a time.
 * 3. Unlock graviton_coupling's tier if C1 didn't already (its Phase 2 can roll this back), then
 *    buy graviton_coupling levels, one at a time, each level only if its ENTIRE purchase chain
 *    (target level plus whatever earnings research speeds up reaching it) fits within the
 *    remaining time budget — never a partial down payment toward a level that won't finish before
 *    the shift ends (see `buyLevelByLevel`'s own comment). If the attempt buys zero levels, the
 *    whole attempt (unlock included) is rolled back — no point paying to unlock the tier if nothing
 *    gets bought once it's open (mirrors C1's own Graviton Coupling checkpoint/rollback).
 *
 * Steps 2-3 both go through `runResearchMilestoneIfWorthwhile`'s ROI-optimal milestone chain, one
 * level per call rather than one call aimed straight at max level — so each level gets its own
 * worthwhile/reachability check and its own time-budget check, instead of a single unreachable (or
 * not-worth-it) level near the top silently discarding progress on every level below it (see
 * `buyLevelByLevel`'s own comment). Each level's chain still buys whatever earnings research speeds
 * up reaching THAT level along the way — no separate earnings-buying pass needed. Every milestone
 * call, across both steps, shares one running 4-hour clock, matching this shift's overall time
 * budget.
 */
export function runC2(startState: EngineState, context: SimulationContext): ShiftResult {
  const shifted = applyShiftAction(startState, context, 'curiosity');

  let currentState = shifted.state;
  let elapsedSeconds = 0;
  const actions = shifted.saleToggleAction ? [shifted.action, shifted.saleToggleAction] : [shifted.action];

  const remainingBudget = () => C2_TIME_LIMIT_SECONDS - elapsedSeconds;

  const runMilestone = (result: ShiftResult) => {
    currentState = result.endState;
    elapsedSeconds += result.elapsedSeconds;
    actions.push(...result.actions);
  };

  // Buy a research one level at a time rather than one chain aimed straight at max level.
  // `runResearchMilestoneIfWorthwhile` noops its ENTIRE chain (buying nothing at all) if the chain
  // can't fully reach its target level — targeting one level up at a time means a level that turns
  // out unreachable (or not worthwhile) only stops the loop from there, instead of discarding
  // purchases on every earlier, perfectly buyable level too.
  //
  // `maxOptimizedSeconds` is capped at `remainingBudget()`, not `Infinity`: `optimizedSeconds` is
  // the chain's own full real-time cost to reach the target level (see `computeMilestoneSummaryCore`),
  // so this makes "worthwhile" also mean "finishes before this shift's clock runs out." Without it, a
  // level whose chain eventually completes but takes far longer than what's left (e.g. a graviton
  // coupling level needing weeks against a couple hours of remaining shift) still passed the
  // worthwhile gate, then `executeChain` bought as much of that chain — earnings-research detours
  // included — as fit in the time limit before giving up on the target itself, stranding real gems
  // spent on a level that was never going to land. Capping here means a level whose chain can't
  // finish in time buys NOTHING toward it at all, matching this shift's "finish the whole chain or
  // don't start it" contract.
  const buyLevelByLevel = (id: string) => {
    const research = getResearchById(id);
    if (!research) return;
    let level = currentState.researchLevels[id] || 0;
    while (level < research.levels && remainingBudget() > 0) {
      const budget = remainingBudget();
      runMilestone(runResearchMilestoneIfWorthwhile(currentState, context, id, level + 1, budget, budget));
      const newLevel = currentState.researchLevels[id] || 0;
      if (newLevel <= level) break; // no progress this round — out of budget or unreachable, stop here
      level = newLevel;
    }
  };

  // 2. Buy every fleet_size research to its max level, one level at a time
  for (const id of FLEET_RESEARCH_IDS) {
    buyLevelByLevel(id);
  }

  // 3. Graviton coupling. Checkpoint first so a failed attempt (whether the tier unlock itself
  // falls short, or it unlocks but no level ends up affordable) can be discarded in full, rather
  // than stranding a naked tier unlock with nothing bought against it. Mirrors C1's own Graviton
  // Coupling checkpoint/rollback (`runC1`).
  const gcResearch = getResearchById(GRAVITON_COUPLING_ID);
  if (gcResearch) {
    const checkpointState = currentState;
    const checkpointElapsedSeconds = elapsedSeconds;
    const checkpointActionsLength = actions.length;
    const gravitonLevelBefore = currentState.researchLevels[GRAVITON_COUPLING_ID] || 0;

    if (!isTierUnlocked(currentState.researchLevels, gcResearch.tier)) {
      runMilestone(runTierUnlockMilestone(currentState, context, gcResearch.tier, remainingBudget()));
    }
    if (isTierUnlocked(currentState.researchLevels, gcResearch.tier)) {
      buyLevelByLevel(GRAVITON_COUPLING_ID);
    }

    const gravitonLevelAfter = currentState.researchLevels[GRAVITON_COUPLING_ID] || 0;
    if (gravitonLevelAfter <= gravitonLevelBefore) {
      currentState = checkpointState;
      elapsedSeconds = checkpointElapsedSeconds;
      actions.length = checkpointActionsLength;
    }
  }

  return { actions, elapsedSeconds, endState: currentState };
}

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
 * 2. Buy every fleet_size research to its max level.
 * 3. Unlock graviton_coupling's tier if C1 didn't already (its Phase 2 can roll this back), then
 *    buy as many graviton_coupling levels as fit in the remaining time budget.
 *
 * Steps 2-3 both go through `runResearchMilestoneIfWorthwhile`'s ROI-optimal milestone chain,
 * which buys whatever earnings research speeds up reaching each target along the way — no
 * separate earnings-buying pass needed. All three milestone calls share one running 4-hour clock,
 * matching this shift's overall time budget.
 */
export function runC2(startState: EngineState, context: SimulationContext): ShiftResult {
  const shifted = applyShiftAction(startState, context, 'curiosity');

  let currentState = shifted.state;
  let elapsedSeconds = 0;
  const actions = [shifted.action];

  const remainingBudget = () => C2_TIME_LIMIT_SECONDS - elapsedSeconds;

  const runMilestone = (result: ShiftResult) => {
    currentState = result.endState;
    elapsedSeconds += result.elapsedSeconds;
    actions.push(...result.actions);
  };

  // 2. Buy every fleet_size research to its max level
  for (const id of FLEET_RESEARCH_IDS) {
    const research = getResearchById(id);
    if (!research) continue;
    runMilestone(
      runResearchMilestoneIfWorthwhile(currentState, context, id, research.levels, Infinity, remainingBudget())
    );
  }

  // 3. Graviton coupling
  const gcResearch = getResearchById(GRAVITON_COUPLING_ID);
  if (gcResearch) {
    if (!isTierUnlocked(currentState.researchLevels, gcResearch.tier)) {
      runMilestone(runTierUnlockMilestone(currentState, context, gcResearch.tier, remainingBudget()));
    }
    if (isTierUnlocked(currentState.researchLevels, gcResearch.tier)) {
      runMilestone(
        runResearchMilestoneIfWorthwhile(
          currentState,
          context,
          GRAVITON_COUPLING_ID,
          gcResearch.levels,
          Infinity,
          remainingBudget()
        )
      );
    }
  }

  return { actions, elapsedSeconds, endState: currentState };
}

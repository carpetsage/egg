import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { isTierUnlocked, type ResearchCostModifiers, getResearchById } from '../../calculations/commonResearch';
import { rankResearchByROI, buyWhilePassingCheck } from '../../calculations/researchRanking';
import { getSaleAwareTimeToSave } from '../../calculations/researchROI';
import { advanceTimeWithBoundaries } from './helpers/advanceTime';
import { runResearchMilestoneIfWorthwhile, runTierUnlockMilestone, runSmartBuyForSeconds } from './helpers/milestones';
import { calculateArtifactModifiers } from '../../lib/artifacts';
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
import { isResearchSaleActive, getNextSaleEnd } from '@/lib/events';

const FLEET_RESEARCH_IDS = [
  'vehicle_reliablity',
  'excoskeletons',
  'traffic_management',
  'egg_loading_bots',
  'autonomous_vehicles',
];
const GRAVITON_COUPLING_ID = 'micro_coupling';

/**
 * C1 Shift Strategy:
 * 1. Smart-buy everything affordable within 3 seconds.
 * 2. Work through fleet_size research in order: unlock its tier via the milestone chain if
 *    needed, buy it to max, smart-buy sweep, repeat — until all fleet research is maxed or the
 *    time budget runs out.
 * 3. If every fleet research got maxed, unlock tier 12 and buy graviton_coupling to max (or as
 *    far as the remaining time budget allows).
 * 4. Spend whatever time remains buying research in ROI order.
 */
export function runC1(
  startState: EngineState,
  context: SimulationContext,
  timeLimit: number = 1800,
  peakELR: number = 0
): ShiftResult {
  let currentState: EngineState = { ...startState, maxELR: peakELR };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const baseAbsTime = context.ascensionStartTime + context.planStartOffset + (startState.lastStepTime || 0);
  const getAbsTime = () => baseAbsTime + elapsedSeconds;
  const remainingBudget = () => timeLimit - elapsedSeconds;

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

  const buyResearch = (researchId: string): boolean => {
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
      []
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

  // --- Helper: merge a milestone-helper's ShiftResult into this shift's running state ---
  const mergeMilestone = (result: ShiftResult) => {
    currentState = result.endState;
    elapsedSeconds += result.elapsedSeconds;
    actions.push(...result.actions);
  };

  const unlockTierIfNeeded = (tier: number) => {
    if (isTierUnlocked(currentState.researchLevels, tier)) return;
    mergeMilestone(runTierUnlockMilestone(currentState, context, tier, remainingBudget()));
  };

  const buyResearchToMax = (researchId: string) => {
    const research = getResearchById(researchId);
    if (!research) return;
    mergeMilestone(
      runResearchMilestoneIfWorthwhile(currentState, context, researchId, research.levels, Infinity, remainingBudget())
    );
  };

  const smartBuySweep = () => {
    mergeMilestone(runSmartBuyForSeconds(currentState, context, 3, remainingBudget()));
  };

  // 1. Smart-buy everything affordable within 3 seconds — at typical research levels this alone
  // unlocks most or all of the tiers the rest of this shift cares about.
  smartBuySweep();

  // 2. Work through fleet_size research in order.
  for (const id of FLEET_RESEARCH_IDS) {
    if (remainingBudget() <= 0) break;

    const research = getResearchById(id);
    if (!research) continue;

    unlockTierIfNeeded(research.tier);
    buyResearchToMax(id);
    smartBuySweep();
  }

  // 3. Graviton coupling, only once every fleet research is maxed.
  const allFleetMaxed = FLEET_RESEARCH_IDS.every(id => {
    const research = getResearchById(id);
    return !research || (currentState.researchLevels[id] || 0) >= research.levels;
  });

  if (allFleetMaxed) {
    // Targeting tier 12 directly (rather than 11 then 12) is enough — tier 12's unlock threshold
    // is purely a cumulative purchase count across tiers below it, so the milestone chain already
    // picks up tier-11 research along the way if it's the fastest path there.
    unlockTierIfNeeded(12);
    if (isTierUnlocked(currentState.researchLevels, 12)) {
      buyResearchToMax(GRAVITON_COUPLING_ID);
    }
  }

  // 4. Spend whatever time remains buying research in ROI order, re-ranking after each purchase
  // since buying one thing changes the ROI math for everything else. Stops the moment a purchase
  // fails — whether from running out of time budget or nothing being worth buying.
  buyWhilePassingCheck(
    () => {
      const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
      const absTime = getAbsTime();
      const isSale = isResearchSaleActive(absTime);
      const ranked = rankResearchByROI(
        currentState.researchLevels,
        snapshot,
        context,
        getModifiers(),
        isSale,
        absTime,
        getNextSaleEnd(absTime),
        'immediate',
        false
      );
      const next = ranked.find(item => item.canBuy);
      return next ? { researchId: next.research.id } : undefined;
    },
    researchId => buyResearch(researchId)
  );

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}

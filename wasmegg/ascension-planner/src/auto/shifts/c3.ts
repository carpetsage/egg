import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { getTiers, isTierUnlocked, type ResearchCostModifiers } from '../../calculations/commonResearch';
import { createMilestoneShiftHelpers, runTierUnlockMilestone, runResearchMilestoneIfWorthwhile } from './helpers/milestones';
import { applyShiftAction } from './helpers/actionHelpers';
import { advanceTimeWithBoundaries } from './helpers/advanceTime';
import { computeSnapshot } from '../../engine/compute';
import { calculateArtifactModifiers } from '../../lib/artifacts';
import { simulateSaleAwareBuy, simulateSaleEndsBuy } from '../../calculations/smartBuyPreview';
import {
  isResearchSaleActive,
  getNextSaleStart,
  getNextSaleEnd,
  getBuildPhaseEndForSaleCount,
  getSaleStartForEnd,
} from '@/lib/events';

export interface C3Params {
  /** Attempt to unlock Tier 13 before anything else, if it isn't already unlocked. Default false. */
  attemptTier13Unlock?: boolean;
}

const MULTI_LAYERING_ID = 'multi_layering';
const MULTI_LAYERING_LEVEL_1 = 1;
const MULTI_LAYERING_TARGET_LEVEL = 2;

/**
 * C3: the "build phase" shift, spent riding out one or more weekly research sales in Curiosity.
 *
 * 1. Shift to Curiosity.
 * 2. If Tier 13 is wanted: first, if Multiversal Layering 2 isn't already unlocked, try to grab it
 *    via the milestone view's research-level-target chain — staged as level 1 (if not already
 *    bought) then level 2, as two separate chain attempts, so a level-1-only ML doesn't get skipped
 *    just because a level-2 attempt run straight from level 0 couldn't fully land in time — then try
 *    to unlock Tier 13. Grabbing ML2 first is a soft preference, not a hard requirement — tier
 *    unlocks are purely a total-purchase-count threshold (see `isTierUnlocked`), so ML2 is never
 *    actually required to reach Tier 13,
 *    just cheap and valuable enough to be worth grabbing first *when there's room*. So if ML2 +
 *    Tier 13 together don't fit before `buildPhaseEnd`, this rewinds to right after the Curiosity
 *    shift and retries spending the *entire* remaining budget on Tier 13 alone, skipping ML2 —
 *    since the two together running out of runway doesn't mean Tier 13 alone would too. Only if
 *    that second attempt also fails to unlock Tier 13 in time is the variant declared impossible.
 *    Each of `runResearchMilestoneIfWorthwhile`/`runTierUnlockMilestone` is capped at exactly the
 *    remaining `buildPhaseEnd - getAbsTime()` at the time it's called, so any single attempt can
 *    only ever end one of two ways: it finishes within its budget (leaving `getAbsTime()` at or
 *    before `buildPhaseEnd`, never after), or it doesn't finish at all — there's no third case
 *    where it "succeeds but finishes late," so a plain post-attempt tier check is the complete
 *    impossible/possible test for each attempt; no separate overrun handling is needed here.
 * 3. Repeat: buy earnings research toward 70% ROI, then wait for the next sale to start — until
 *    reaching the start of the final sale (the one ending at the build phase's end). This naturally
 *    does fewer cycles (or none) if step 2's Tier 13 unlock already consumed enough real time to
 *    cross earlier sales while buying — the loop just walks forward from wherever `getAbsTime()`
 *    currently is via `getNextSaleStart`/`getNextSaleEnd`, it doesn't count cycles. The 70% bar
 *    itself is judged against `roiDeadline` (`getSaleStartForEnd(buildPhaseEnd)`, computed once up
 *    front) rather than just each cycle's own immediately-upcoming sale: unlike the manual planner's
 *    "Buy Until Sale Warning" button — which only ever knows about the next sale, since a human
 *    clicking it hasn't committed to riding out any particular number of further ones — this shift
 *    already commits to `buildPhaseEnd` before step 3 even starts, so a purchase priced during one of
 *    the sales along the way doesn't need to pay for itself by THAT sale specifically; it only needs
 *    to clear 70% by the start of the LAST sale of the whole ride to be worth taking now rather than
 *    saving the gems for something else. This is purely additive runway, never a way to accept a
 *    worse deal than the manual default: every individual purchase still gets at least the calendar's
 *    own next-sale deadline (see `rankResearchByROI`'s `Math.max` merge of the two).
 * 4. Buy delivery research until nothing more is worth buying (not necessarily until the sale
 *    itself ends — once purchasing stalls out, C3 stops there rather than padding the clock the
 *    rest of the way to `buildPhaseEnd`; K3, the next shift, already waits out any remaining time
 *    against that same `buildPhaseEnd`, so a second wait here would be redundant).
 *
 * Steps 3-4 both reuse the exact same plan-computation functions the manual planner's "Buy Until
 * Sale Warning"/"Buy Until Sale Ends" buttons are built on — `simulateSaleAwareBuy`/
 * `simulateSaleEndsBuy` in `calculations/smartBuyPreview.ts` — rather than a separate
 * auto-planner-only implementation; see those functions' own doc comments for what each actually
 * does. This replaces the previous design's extra "buy earnings research toward the final sale's
 * 100% deadline" bridging step between sales: `simulateSaleAwareBuy`/`simulateSaleEndsBuy` already
 * handle their own edge cases (sale-bypass purchases, earnings-prelude-before-delivery trimming),
 * so a bespoke C3-only step is no longer needed.
 */
export function runC3(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number = 0,
  _reserved?: number,
  params: C3Params = {}
): ShiftResult {
  let currentState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const baseAbsTime = context.ascensionStartTime + context.planStartOffset + (startState.lastStepTime || 0);
  const getAbsTime = () => baseAbsTime + elapsedSeconds;

  // Unlike the manual planner (which only ever knows about "the next sale" — a human clicking a
  // button has no advance commitment to riding out further ones), this whole shift already commits
  // to `buildPhaseEnd` up front — riding out every sale between now and then. So a purchase's 70%
  // ROI bar doesn't need to clear by just the immediately upcoming sale: it only needs to clear by
  // the start of the LAST sale of this ride (`buildPhaseEnd` is always that sale's own END — see
  // `getBuildPhaseEndForSaleCount`), since that's the last point where "is this worth buying now, at
  // this discount" is still being decided under this shift's own multi-sale plan. Threaded through
  // every ROI-gated purchase below (`buyUntilSaleWarning`, and the ML/Tier-13 milestone chains) —
  // each individual function call still only ever judges against "no earlier than the calendar's
  // own next sale" (see `rankResearchByROI`'s `Math.max` merge), so this is purely additive runway,
  // never a way to force a WORSE deadline than the manual default.
  const roiDeadline = getSaleStartForEnd(buildPhaseEnd);

  const advanceTime = (totalSeconds: number) => {
    const result = advanceTimeWithBoundaries(currentState, actions, elapsedSeconds, context, baseAbsTime, totalSeconds);
    currentState = result.currentState;
    elapsedSeconds = result.elapsedSeconds;
  };

  // Folds a sub-shift's ShiftResult into this shift's own running state.
  const runStep = (result: ShiftResult) => {
    actions.push(...result.actions);
    currentState = result.endState;
    elapsedSeconds += result.elapsedSeconds;
  };

  const getModifiers = (): ResearchCostModifiers => {
    const artifactMods = calculateArtifactModifiers(currentState.artifactLoadout);
    return {
      labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
      researchCostMultiplier: context.colleggtibleModifiers.researchCost || 1,
      puzzleCubeMultiplier: artifactMods.researchCost.totalMultiplier,
    };
  };

  // Executes a precomputed purchase plan (from `simulateSaleAwareBuy`/`simulateSaleEndsBuy`) for
  // real: walks `researchIdsInOrder` — the plan's actual, already-interleaved purchase sequence —
  // one entry at a time, buying one level per entry. Skips an entry once its research is already at
  // or above its own final target level from `endLevels` (this is what accounts for anything the
  // plan itself decided to revert, e.g. `simulateSaleAwareBuy`'s sale-bypass cleanup — see its own
  // doc comment — since a reverted id's raw entries would otherwise still be sitting in
  // `researchIdsInOrder`). `timeLimit` bounds this call the same way every other purchase helper
  // here does — the plan was already computed against the same deadline, so this is a safety net
  // against drift between the plan and real execution, not the primary stopping condition.
  //
  // Bug (fixed 2026-08-12): this used to deduplicate `researchIdsInOrder` down to first-seen research
  // IDs and buy every level of one id consecutively before moving to the next, discarding the plan's
  // real interleaving entirely (e.g. turning "eggsistor, matter_reconfig, matter_reconfig,
  // wormhole_dampening, matter_reconfig, eggsistor, ..." into "5× eggsistor, then 19× matter_reconfig,
  // then wormhole_dampening"). Since every one of these purchases raises the earn rate, and the
  // interleaved order is what lets that rate ramp up fastest, batching by research id took
  // measurably longer in real elapsed time to execute the exact same final purchases — confirmed
  // against a live manual-planner replay of the same 28-purchase plan: same items, same end levels,
  // but ~2.5 real days slower to finish, which meant several fewer days of pure idle earnings
  // accumulation before the following sale. The manual planner's own real execution
  // (`runSaleAwareBuyFlow`/`handleBuyUntilSaleDeadline`) never had this bug — it already walks its
  // plan in real order, one entry at a time — so this was a defect specific to this replay helper.
  const executePlanToLevels = (researchIdsInOrder: string[], targetLevels: Record<string, number>, timeLimit: number) => {
    const helpers = createMilestoneShiftHelpers(currentState, context);
    for (const researchId of researchIdsInOrder) {
      const target = targetLevels[researchId] || 0;
      if ((helpers.getState().researchLevels[researchId] || 0) >= target) continue;
      if (!helpers.buyResearch(researchId, timeLimit)) break;
    }

    runStep({
      actions: helpers.getActions(),
      elapsedSeconds: helpers.getElapsedSeconds(),
      endState: helpers.getState(),
    });
  };

  // "Buy Until Sale Warning" (70% ROI before `targetDeadline`, the upcoming sale's start) — same
  // plan the manual planner's button executes. Deliberately 'immediate' mode, not 'maxed_vehicles':
  // this is the earnings-ROI pass and is meant to judge "does this pay for itself soon, given what's
  // actually on the farm right now" — 'maxed_vehicles' is the delivery-research mode's job
  // (`buyUntilSaleEnds` below already passes `'realistic'` to `rankResearchByELRImpact`, which itself
  // assumes maxed habs/vehicles via `getOptimalELRSet`). See git history around 2026-08-12 for a
  // reverted attempt to swap this to 'maxed_vehicles' — that conflated the two passes' jobs.
  const buyUntilSaleWarning = (targetDeadline: number) => {
    const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
    const absTime = getAbsTime();
    const plan = simulateSaleAwareBuy(
      currentState.researchLevels,
      snapshot,
      context,
      getModifiers(),
      absTime,
      getNextSaleEnd(absTime),
      targetDeadline,
      'immediate',
      false,
      70,
      roiDeadline
    );
    executePlanToLevels(
      plan.entries.map(e => e.researchId),
      plan.endLevels,
      Math.max(0, targetDeadline - absTime)
    );
  };

  // "Buy Until Sale Ends" (earnings prelude + delivery research through `deadline`) — same plan the
  // manual planner's button executes.
  const buyUntilSaleEnds = (deadline: number) => {
    const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
    const absTime = getAbsTime();
    const plan = simulateSaleEndsBuy(
      currentState.researchLevels,
      snapshot,
      context,
      getModifiers(),
      absTime,
      deadline,
      'realistic',
      'efficiency',
      context.rawBackup
    );
    executePlanToLevels(plan.researchIds, plan.endLevels, Math.max(0, deadline - absTime));
  };

  // 1. Shift to Curiosity
  const shifted = applyShiftAction(currentState, context, 'curiosity');
  currentState = shifted.state;
  actions.push(shifted.action);

  // 2 (only when requested): try to unlock Tier 13 before anything else. Must run right here, at
  // elapsedSeconds === 0 — runTierUnlockMilestone derives its absolute-time baseline from
  // currentState.lastStepTime, which trivially still matches startState.lastStepTime at this point
  // (the shift action above doesn't advance time).
  if (params.attemptTier13Unlock) {
    const maxTier = Math.max(...getTiers());

    // Attempts to unlock Tier 13 alone (no ML2 involvement), capped at whatever's left of
    // buildPhaseEnd. Returns whether Tier 13 ended up unlocked.
    const attemptTier13Only = (): boolean => {
      if (!isTierUnlocked(currentState.researchLevels, maxTier)) {
        const timeLimit = Math.max(0, buildPhaseEnd - getAbsTime());
        runStep(runTierUnlockMilestone(currentState, context, maxTier, timeLimit, roiDeadline));
      }
      return isTierUnlocked(currentState.researchLevels, maxTier);
    };

    if (!isTierUnlocked(currentState.researchLevels, maxTier)) {
      const neededML2 = (currentState.researchLevels[MULTI_LAYERING_ID] || 0) < MULTI_LAYERING_TARGET_LEVEL;

      // Snapshot right after the Curiosity shift, in case the ML2-first attempt below runs out of
      // runway and this needs to rewind and retry Tier 13 alone.
      const postShiftState = currentState;
      const postShiftElapsedSeconds = elapsedSeconds;
      const postShiftActionsLength = actions.length;

      // Multiversal Layering 2 (10x egg value, tier 11) is cheap relative to the rest of a Tier 13
      // push, so grab it first if it isn't already there — reusing the same milestone-view "research
      // level target" helper the manual planner's Milestones view buys through
      // (`runResearchMilestoneIfWorthwhile`, gated on `computeResearchMilestoneChain`), with an
      // unbounded worthwhileness threshold since this is an unconditional attempt, not a
      // worthwhile-or-skip decision. This is a soft preference, not a hard requirement — see this
      // function's doc comment — so a failure to reach level 2 within the remaining budget doesn't
      // return early here; it just means the Tier 13 attempt right after it is very unlikely to also
      // fit, which the fallback below handles.
      //
      // Staged in two separate milestone-chain calls, level 1 then level 2, rather than one call
      // straight to level 2: when ML1 hasn't been bought yet, targeting level 2 directly risks the
      // whole attempt landing as a single all-or-nothing chain, so a run that can't fully clear level
      // 2 within budget would leave ML at level 0 — not even level 1 grabbed — despite level 1 alone
      // likely being cheap enough to fit easily. Going for level 1 first guarantees that cheap win is
      // banked on its own before the (pricier) level-2 attempt gets a chance to run out of runway.
      if (neededML2) {
        if ((currentState.researchLevels[MULTI_LAYERING_ID] || 0) < MULTI_LAYERING_LEVEL_1) {
          const level1TimeLimit = Math.max(0, buildPhaseEnd - getAbsTime());
          runStep(
            runResearchMilestoneIfWorthwhile(
              currentState,
              context,
              MULTI_LAYERING_ID,
              MULTI_LAYERING_LEVEL_1,
              Infinity,
              level1TimeLimit,
              roiDeadline
            )
          );
        }

        const timeLimit = Math.max(0, buildPhaseEnd - getAbsTime());
        runStep(
          runResearchMilestoneIfWorthwhile(
            currentState,
            context,
            MULTI_LAYERING_ID,
            MULTI_LAYERING_TARGET_LEVEL,
            Infinity,
            timeLimit,
            roiDeadline
          )
        );
      }

      let gotTier13 = attemptTier13Only();

      if (!gotTier13 && neededML2) {
        // ML2 + Tier 13 together didn't fit before buildPhaseEnd. Rewind to right after the shift and
        // retry, spending the *entire* remaining budget on Tier 13 alone this time — going straight
        // for Tier 13 may still make the deadline even when detouring through ML2 first wouldn't.
        currentState = postShiftState;
        elapsedSeconds = postShiftElapsedSeconds;
        actions.length = postShiftActionsLength;
        gotTier13 = attemptTier13Only();
      }

      // Tier 13 was requested but neither approach finished in time — this variant is impossible.
      // Return now rather than continuing into the sale-riding steps against a state that doesn't
      // have what was asked for; runC3Variants recognizes this from the returned state.
      if (!gotTier13) {
        return { actions, elapsedSeconds, endState: currentState };
      }
    }
  }

  // 3-4. Ride out sales until the final one, then spend it on delivery research.
  while (getAbsTime() < buildPhaseEnd) {
    const absTime = getAbsTime();
    const isFinalSale = isResearchSaleActive(absTime) && getNextSaleEnd(absTime) >= buildPhaseEnd;

    if (isFinalSale) {
      // No trailing wait to buildPhaseEnd here: once nothing more is worth buying, there's nothing
      // productive left for C3 to do — the next shift (K3) already waits out any remaining time
      // against this same buildPhaseEnd itself, so padding the clock here would just be redundant.
      buyUntilSaleEnds(buildPhaseEnd);
      break;
    }

    const nextSaleStart = getNextSaleStart(absTime);
    if (nextSaleStart >= buildPhaseEnd) {
      // No more sales start before the deadline (shouldn't normally happen — `buildPhaseEnd` is
      // always an exact sale-end — but kept as a defensive fallback). Spend what's left as a final
      // delivery push; same no-trailing-wait reasoning as the `isFinalSale` branch above.
      buyUntilSaleEnds(buildPhaseEnd);
      break;
    }

    buyUntilSaleWarning(nextSaleStart);
    advanceTime(Math.max(0, nextSaleStart - getAbsTime()));
  }

  return { actions, elapsedSeconds, endState: currentState };
}

export interface C3Variant {
  saleCount: number;
  attemptTier13Unlock: boolean;
  buildPhaseEnd: number;
  result: ShiftResult;
  // True when attemptTier13Unlock was requested but the returned state still doesn't have it.
  impossible: boolean;
}

/**
 * Runs C3 against every combination of `saleCount` (1..maxSaleCount) and, when Tier 13 isn't
 * already unlocked, `attemptTier13Unlock` (false/true) — the candidate set a caller picks the best
 * of by completing each variant through the rest of the ascension and comparing total duration.
 *
 * Walks `saleCount` in descending order so Tier 13 feasibility can be pruned: more time can only
 * make an unlock easier, never harder, so once a larger `saleCount` proves Tier 13 impossible, no
 * smaller `saleCount`'s Tier 13 attempt is even run — those `N-sale-tier13` combos are simply
 * absent from the returned array (not present with `impossible: true`).
 *
 * For a given `saleCount`, the Tier 13 attempt (when one is made at all) always runs BEFORE the
 * non-Tier-13 one, and the non-Tier-13 variant is skipped entirely whenever that attempt succeeds:
 * a successful Tier 13 unlock strictly dominates not unlocking it (same total build-phase time
 * spent either way, strictly more research afterward), so the non-Tier-13 sibling can never win the
 * caller's comparison and isn't worth the cost of computing (here, and — more importantly — of the
 * caller's own full ascension completion downstream). The non-Tier-13 variant is still computed
 * whenever Tier 13 wasn't attempted at all for this `saleCount` (already unlocked before C3 started,
 * or pruned via `tier13KnownImpossible`) or was attempted and failed — that's the only case it can
 * legitimately win. Returned in ascending `saleCount` order regardless of the internal descending
 * walk, so callers see a stable, predictable order.
 */
export function runC3Variants(
  startState: EngineState,
  context: SimulationContext,
  maxSaleCount: number = 3
): C3Variant[] {
  const maxTier = Math.max(...getTiers());
  const tier13AlreadyUnlocked = isTierUnlocked(startState.researchLevels, maxTier);
  const variants: C3Variant[] = [];
  let tier13KnownImpossible = false;
  for (let saleCount = maxSaleCount; saleCount >= 1; saleCount--) {
    const buildPhaseEnd = getBuildPhaseEndForSaleCount(context.ascensionStartTime, saleCount);

    let tier13SucceededThisSaleCount = false;
    if (!tier13AlreadyUnlocked && !tier13KnownImpossible) {
      const result = runC3(startState, context, buildPhaseEnd, undefined, { attemptTier13Unlock: true });
      const impossible = !isTierUnlocked(result.endState.researchLevels, maxTier);
      if (impossible) {
        tier13KnownImpossible = true;
      } else {
        tier13SucceededThisSaleCount = true;
      }
      variants.push({ saleCount, attemptTier13Unlock: true, buildPhaseEnd, result, impossible });
    }

    if (!tier13SucceededThisSaleCount) {
      variants.push({
        saleCount,
        attemptTier13Unlock: false,
        buildPhaseEnd,
        result: runC3(startState, context, buildPhaseEnd, undefined, { attemptTier13Unlock: false }),
        impossible: false,
      });
    }
  }
  return variants.sort(
    (a, b) => a.saleCount - b.saleCount || Number(a.attemptTier13Unlock) - Number(b.attemptTier13Unlock)
  );
}

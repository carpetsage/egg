import {
  type CommonResearch,
  getCommonResearches,
  getResearchById,
  getDiscountedVirtuePrice,
  isTierUnlocked,
  type ResearchCostModifiers,
} from './commonResearch';
import {
  getSaleAwareTimeToSave,
  findEventCrossings,
  meetsROIByDeadline,
  type PurchaseEventCrossings,
} from './researchROI';
import {
  rankResearchByROI,
  buildRoiCandidateSequences,
  simulatePurchaseSequence,
  reorderPurchaseListByROI,
  type SequencedPurchase,
  type ResearchRankingItem,
} from './researchRanking';
import { simulateSaleAwareBuy } from './smartBuyPreview';
import type { EngineState, SimulationContext } from '@/engine/types';
import type { CalculationsSnapshot } from '@/types';
import { computeSnapshot } from '@/engine/compute';
import { createBaseEngineState } from '@/engine/adapter';
import { applyAction, applyTime, boostTransitionsFrom } from '@/engine/apply';
import { getNextSaleStart, isResearchSaleActive, isEarningsBoostActive } from '@/lib/events';

export type MilestoneTarget =
  | { kind: 'tier'; tier: number }
  | { kind: 'research'; researchId: string; targetLevel: number };

export function isMilestoneReached(target: MilestoneTarget, researchLevels: Record<string, number>): boolean {
  return target.kind === 'tier'
    ? isTierUnlocked(researchLevels, target.tier)
    : (researchLevels[target.researchId] || 0) >= target.targetLevel;
}

const MILESTONE_MAX_STEPS = 2000;

// How many ROI-ranked candidates to try as a detour at each step before giving up and falling back
// to the non-detour path (buying the milestone target directly, or — for a tier chain — finishing
// via cheapest-first). Previously only the single top-ranked candidate was ever tried: the instant
// it stopped beating the fallback, the chain committed to that fallback for good (see both call
// sites' doc comments), even when a lower-ranked-but-still-70%-worthwhile candidate would have kept
// helping. Capped rather than unbounded since every candidate tried costs a
// `simulatePurchaseSequence` call (up to 3, with its pair orderings) and this loop reruns every
// step — the cap only matters when NO candidate helps (the common case once a chain is winding
// down), where every candidate up to the cap gets tried for nothing.
const MAX_DETOUR_CANDIDATES_PER_STEP = 15;

export interface MilestoneChainItem {
  research: CommonResearch;
  targetLevel: number;
  currentLevel: number;
  price: number;
  timeToBuySeconds: number;
  buyToHereSeconds: number;
  roiSeconds?: number;
  totalRoiSeconds?: number;
  showSaleWarning?: boolean;
  showDeadlineWarning?: boolean;
  // Whether this purchase's price reflects a research sale, and whether it completed during a
  // 2x earnings boost — distinct from showSaleWarning/showDeadlineWarning, which mean "you should
  // hold off," not "this happened during an event."
  duringSale: boolean;
  duringEarningsBoost: boolean;
  // Which event boundaries (if any) this purchase's own wait crosses while saving up — e.g. a
  // purchase that starts before the 2x boost but doesn't finish until after it starts. Lets the
  // preview show the same wait/toggle split the manual planner inserts when actually executing it,
  // instead of only revealing that split after the user clicks "Buy".
  eventCrossings?: PurchaseEventCrossings;
}

export interface MilestoneChainResult {
  items: MilestoneChainItem[];
  reached: boolean;
  totalSeconds: number;
}

// Pure crash-safety net for `computeResearchMilestoneChain`'s sweep loop below — NOT a "give up
// after N sale cycles" heuristic (there isn't one anymore; the loop sweeps as many weeks as it
// takes). Only exists so a genuinely-never-terminating case (e.g. a bug that makes every sweep
// unproductive forever) fails loudly/boundedly instead of hanging the worker tab indefinitely.
// 5000 weekly sweeps is ~96 years — nothing a real milestone should ever need.
const MAX_SALE_SWEEPS_SAFETY_CAP = 5000;

// Set to true (temporarily, for debugging) to log each round of `computeResearchMilestoneChain`'s
// loop and `sweepUntilNextSale`'s own candidate search to the console — visible in the browser's
// devtools Console panel even though this runs inside a Web Worker. Remove once the milestone-chain
// investigation this was added for is resolved.
const DEBUG_MILESTONE_CHAIN = false;

function debugTime(t: number): string {
  return new Date(t * 1000).toISOString();
}

/**
 * Buys every currently-eligible 70%-by-next-sale-payback research, until either nothing more
 * qualifies or simulated time reaches the very next research sale's start — then advances any
 * leftover idle time up to that boundary, so the caller always resumes exactly at the sale start
 * regardless of how much slack was left over.
 *
 * Delegates the actual candidate-selection/buying/cleanup to `simulateSaleAwareBuy`
 * (`smartBuyPreview.ts`, `targetPercent: 70`) — the exact same dry run behind the manual planner's
 * own "Buy Until Sale Warning" button — rather than re-deriving that logic here; this function only
 * adapts its output into `MilestoneChainItem[]`/`EngineState` and guarantees the boundary is
 * actually reached. It doesn't exclude the milestone's own target research from consideration — if
 * the target itself happens to be the best-ROI candidate clearing the 70% bar, buying it here is a
 * perfectly good outcome (the caller's next direct-purchase check will simply see it already
 * reached).
 */
function sweepUntilNextSale(
  state: EngineState,
  snapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTimeAtStart: number,
  researchSaleDeadline: number
): { items: MilestoneChainItem[]; state: EngineState; snapshot: CalculationsSnapshot; totalSeconds: number } {
  const nextSaleStart = getNextSaleStart(absoluteSimTimeAtStart);

  if (DEBUG_MILESTONE_CHAIN) {
    console.log(
      `[milestoneChain] sweepUntilNextSale: from ${debugTime(absoluteSimTimeAtStart)} to ${debugTime(nextSaleStart)}, bank=${snapshot.bankValue}, offlineEarnings=${snapshot.offlineEarnings}`
    );
  }

  const plan = simulateSaleAwareBuy(
    state.researchLevels,
    snapshot,
    context,
    mods,
    absoluteSimTimeAtStart,
    researchSaleDeadline,
    nextSaleStart,
    'immediate',
    false,
    70
  );

  if (DEBUG_MILESTONE_CHAIN) {
    console.log(
      `[milestoneChain] sweepUntilNextSale: simulateSaleAwareBuy returned ${plan.entries.length} entries:`,
      plan.entries.map(
        e => `${e.researchId}@${debugTime(e.purchaseTimestamp)} (duringSale=${e.duringSale}, price=${e.price})`
      )
    );
  }

  // `simulateSaleAwareBuy` can accept one final "transitional" purchase whose own wait crosses INTO
  // the target sale, then revert it during its own cleanup pass if it actually completes at/after
  // `nextSaleStart` (see that function's doc comment) — the reverted entry is still present in
  // `plan.entries` (so callers wanting the full history can see it), but isn't reflected in
  // `endLevels`/`endSnapshot`. Its internal `revertIds` aren't exposed, but the same predicate it
  // reverts by (`duringSale` AND landing at/after the deadline) is externally derivable from each
  // entry, so the displayed items below can be kept in sync with the state actually returned.
  const acceptedEntries = plan.entries.filter(e => !(e.duringSale && e.purchaseTimestamp >= nextSaleStart));

  // Rebuild the resulting state/time by replaying only the ACCEPTED entries, from a clean start —
  // rather than trusting `plan.endSnapshot` directly. `simulateSaleAwareBuy`'s own during-sale
  // bypass (see `meetsSaleAwareDeadline`'s doc comment) only checks whether a candidate's modeled
  // completion lands during *some* real sale, not specifically the one `nextSaleStart` refers to —
  // so once cheaper candidates run out, an expensive research (even the milestone's own target, if
  // this sweep doesn't exclude it) whose OWN price/wait modeling happens to resolve to "wait for a
  // much LATER sale" can get selected as "the next candidate," walking `simTime` forward by however
  // long THAT wait is (potentially many weeks past this sweep's actual boundary) before its cleanup
  // pass reverts it. That cleanup only refunds the reverted candidate's research level and bank —
  // there's no way to "un-simulate" the elapsed time already spent evaluating it (confirmed via
  // logging: a sweep meant to stop at Sept 11 silently walked its internal clock to Sept 25 this
  // way). So `plan.endSnapshot.lastStepTime` can't be trusted as this sweep's own elapsed time.
  // Each ACCEPTED entry's own `price`/`purchaseTimestamp`, though, was computed sequentially BEFORE
  // any such detour was ever considered, so replaying just those from `state`/`snapshot` gives an
  // honest result without needing to re-run any of the ranking/eligibility logic itself.
  let resultState = state;
  let resultSnapshot = snapshot;
  const items: MilestoneChainItem[] = [];
  let itemTimestamp = absoluteSimTimeAtStart;

  for (const entry of acceptedEntries) {
    const research = getResearchById(entry.researchId);
    if (!research) continue;
    const currentLevel = resultState.researchLevels[entry.researchId] || 0;
    const timeToBuySeconds = entry.purchaseTimestamp - itemTimestamp;

    resultState = applyAction(resultState, {
      type: 'buy_research',
      payload: { researchId: entry.researchId, fromLevel: currentLevel, toLevel: currentLevel + 1 },
      cost: entry.price,
    });
    resultState = applyTime(resultState, timeToBuySeconds, resultSnapshot, {
      transitions: boostTransitionsFrom(resultSnapshot, itemTimestamp),
    });
    resultSnapshot = computeSnapshot(resultState, context, { skipEpochConversion: true });

    items.push({
      research,
      targetLevel: currentLevel + 1,
      currentLevel,
      price: entry.price,
      timeToBuySeconds,
      buyToHereSeconds: entry.purchaseTimestamp - absoluteSimTimeAtStart,
      duringSale: entry.duringSale,
      duringEarningsBoost: isEarningsBoostActive(entry.purchaseTimestamp),
    });
    itemTimestamp = entry.purchaseTimestamp;
  }

  let totalSeconds = itemTimestamp - absoluteSimTimeAtStart;

  if (DEBUG_MILESTONE_CHAIN) {
    console.log(
      `[milestoneChain] sweepUntilNextSale: replayed ${acceptedEntries.length} accepted entries -> totalSeconds(pre-idle-fastforward)=${totalSeconds} (${(totalSeconds / 86400).toFixed(2)}d)`
    );
  }

  // No further worthwhile candidates before the boundary (or none at all) — advance any leftover
  // idle time up to it, so the caller always resumes exactly at the sale start. Also what guarantees
  // forward progress every sweep when nothing at all qualifies (an empty `plan.entries`), so
  // `computeResearchMilestoneChain`'s outer loop can't stall re-trying the same instant forever.
  const currentAbsoluteTime = absoluteSimTimeAtStart + totalSeconds;
  if (currentAbsoluteTime < nextSaleStart) {
    const idleSeconds = nextSaleStart - currentAbsoluteTime;
    const transitions = boostTransitionsFrom(resultSnapshot, currentAbsoluteTime);
    resultState = applyTime(resultState, idleSeconds, resultSnapshot, { transitions });
    // `skipEpochConversion` keeps `lastStepTime` in `resultSnapshot`'s own reference frame — see
    // `smartBuyPreview.ts`'s `simulateSaleAwareBuy` for the full story on why a mid-loop epoch flip
    // here would corrupt the elapsed-time bookkeeping the caller derives from before/after snapshots.
    resultSnapshot = computeSnapshot(resultState, context, { skipEpochConversion: true });
    totalSeconds += idleSeconds;
    if (DEBUG_MILESTONE_CHAIN) {
      console.log(
        `[milestoneChain] sweepUntilNextSale: fast-forwarded ${idleSeconds}s (${(idleSeconds / 86400).toFixed(2)}d) of idle time to reach boundary; totalSeconds now ${totalSeconds}`
      );
    }
  }

  if (DEBUG_MILESTONE_CHAIN) {
    console.log(
      `[milestoneChain] sweepUntilNextSale: DONE, returning ${items.length} items, totalSeconds=${totalSeconds} (${(totalSeconds / 86400).toFixed(2)}d), ends at ${debugTime(absoluteSimTimeAtStart + totalSeconds)}`
    );
  }

  return { items, state: resultState, snapshot: resultSnapshot, totalSeconds };
}

/**
 * Reaches a specific research level milestone as fast as possible, one level at a time. For each
 * level still needed: check whether buying it directly (`getSaleAwareTimeToSave` — already
 * sale-aware, choosing whichever's faster between today's price and a future discount, see that
 * function's own doc comment) completes before the very next research sale even starts; if so, just
 * buy it. If not — the direct purchase is stuck waiting on some LATER sale — sweep to that next sale
 * boundary first via `sweepUntilNextSale` (buying anything that clears the 70%-by-next-sale bar
 * along the way, mirroring what a player manually running "Buy Until Sale Warning" every week would
 * do), then re-check from there. A denser bank/higher earnings rate at that point may put the level
 * back in reach of the *following* sale even though it wasn't in reach of this one; repeating this
 * for as many sale cycles as it actually takes (see `MAX_SALE_SWEEPS_SAFETY_CAP`'s own comment —
 * there's no "give up after N cycles" heuristic here) is what lets the milestone discover "abandon
 * waiting for any particular sale, spend a couple of weeks sweeping instead, and
 * buy at full price before the next one even arrives" — a global strategy shift a straight one-shot
 * `getSaleAwareTimeToSave` call could never find on its own, since that call only ever reasons about
 * buying THIS item, not about spending the intervening time on other research first.
 *
 * That "abandon this sale, sweep for a while, buy at full price before the next one" strategy shift
 * is `sweepUntilNextSale`'s job, not a per-step detour search's: a per-candidate-at-a-time
 * comparison against a fixed point can recognize a detour that reaches the SAME landing sale sooner,
 * but not the multi-purchase compounding needed to skip a sale entirely (confirmed the hard way —
 * see git history). Whenever the target IS already reachable within this cycle, though
 * (`completesAt <= nextSaleStart` below), a much narrower, genuinely useful form of that same idea
 * still applies: a cheap, high-ROI purchase bought FIRST can make the target's OWN wait shorter than
 * buying it outright right now — e.g. a purchase that roughly doubles earnings can cut a multi-hour
 * wait down to a fraction of that. That comparison has none of the calendar-crossing trap's
 * downsides (both options land within the same cycle, so there's no fixed-point-vs-compounding
 * mismatch), so it's tried directly inline before committing to the direct purchase — see the
 * comment where it's tried, inside the `completesAt <= nextSaleStart` branch below.
 */
export function computeResearchMilestoneChain(
  target: { researchId: string; targetLevel: number },
  startState: EngineState,
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTimeAtStart: number,
  researchSaleDeadline: number
): MilestoneChainResult {
  const targetResearch = getResearchById(target.researchId);
  if (!targetResearch) return { items: [], reached: false, totalSeconds: 0 };

  let state = startState;
  let snapshot = startSnapshot;
  let totalSeconds = 0;
  const items: MilestoneChainItem[] = [];

  // `items.length < MILESTONE_MAX_STEPS` bounds total PURCHASES (shared with every other
  // milestone-chain loop in this file). `round` is purely `MAX_SALE_SWEEPS_SAFETY_CAP`'s crash
  // guard — see that constant's own comment — not a heuristic budget.
  let round = 0;

  while (
    items.length < MILESTONE_MAX_STEPS &&
    round < MAX_SALE_SWEEPS_SAFETY_CAP &&
    (state.researchLevels[targetResearch.id] || 0) < target.targetLevel
  ) {
    round++;
    const currentAbsoluteTime = absoluteSimTimeAtStart + totalSeconds;
    const isSale = isResearchSaleActive(currentAbsoluteTime);
    const transitions = boostTransitionsFrom(snapshot, currentAbsoluteTime);
    const currentLevel = state.researchLevels[targetResearch.id] || 0;

    const purchase = getSaleAwareTimeToSave(
      targetResearch,
      currentLevel,
      mods,
      isSale,
      currentAbsoluteTime,
      snapshot,
      transitions
    );

    if (DEBUG_MILESTONE_CHAIN) {
      console.log(
        `[milestoneChain] computeResearchMilestoneChain round ${round}: now=${debugTime(currentAbsoluteTime)}, targetLevel=${currentLevel}, direct purchase price=${purchase.price}, waitSeconds=${purchase.waitSeconds} (${isFinite(purchase.waitSeconds) ? (purchase.waitSeconds / 86400).toFixed(2) + 'd' : 'Infinity'}), duringSale=${purchase.duringSale}`
      );
    }

    if (purchase.waitSeconds === Infinity) {
      if (DEBUG_MILESTONE_CHAIN)
        console.log(`[milestoneChain] computeResearchMilestoneChain: purchase.waitSeconds is Infinity, giving up`);
      break;
    }

    const nextSaleStart = getNextSaleStart(currentAbsoluteTime);
    const completesAt = currentAbsoluteTime + purchase.waitSeconds;

    if (completesAt <= nextSaleStart) {
      // Before committing to buying the target directly, check whether a cheap, high-ROI purchase
      // FIRST would make the target itself complete sooner — e.g. a purchase that roughly doubles
      // earnings can cut a several-hour wait down to a fraction of that. Only relevant here: the
      // SWEEP branch below already buys everything ROI-worthwhile on its own, so a target that's
      // calendar-locked to a future sale doesn't need this — it's specifically for a target that's
      // ALREADY reachable within this cycle, where nothing else has had a chance to insert a
      // same-cycle detour yet. Candidates are tried in ROI order (capped at
      // `MAX_DETOUR_CANDIDATES_PER_STEP`, same reasoning as `computeTierMilestoneChain`'s identical
      // cap); `<=` allows a detour that ties the direct wait too, not just strictly beats it.
      const ranked = rankResearchByROI(
        state.researchLevels,
        snapshot,
        context,
        mods,
        isSale,
        currentAbsoluteTime,
        researchSaleDeadline,
        'immediate',
        false
      );
      const eligibleCandidates = ranked.filter(
        item => item.canBuy && item.research.id !== targetResearch.id && !item.showSaleWarning
      );

      let tookDetour = false;
      for (const candidate of eligibleCandidates.slice(0, MAX_DETOUR_CANDIDATES_PER_STEP)) {
        // `candidate` can rank this high purely because pairing it with `pairPartnerResearch` gives
        // a great COMBINED payback (see `rankResearchByROI`'s bottleneck-pairing logic) — try it
        // solo, and — when a partner exists and is itself still purchasable — as a two-purchase
        // sequence in both orders, same as `computeTierMilestoneChain`'s own detour search.
        const sequences = buildRoiCandidateSequences(candidate, state.researchLevels, targetResearch.id);
        let bestSequence: {
          result: NonNullable<ReturnType<typeof simulatePurchaseSequence>>;
          pathSeconds: number;
        } | null = null;

        for (const sequence of sequences) {
          const result = simulatePurchaseSequence(sequence, state, snapshot, currentAbsoluteTime, mods, context);
          if (!result) continue;
          const afterTime = currentAbsoluteTime + result.totalSecondsSpent;
          const secondsToTargetAfter = getSaleAwareTimeToSave(
            targetResearch,
            currentLevel,
            mods,
            isResearchSaleActive(afterTime),
            afterTime,
            result.snapshot,
            boostTransitionsFrom(result.snapshot, afterTime)
          ).waitSeconds;
          const pathSeconds = result.totalSecondsSpent + secondsToTargetAfter;
          if (pathSeconds <= purchase.waitSeconds && (!bestSequence || pathSeconds < bestSequence.pathSeconds)) {
            bestSequence = { result, pathSeconds };
          }
        }

        if (bestSequence) {
          if (DEBUG_MILESTONE_CHAIN) {
            console.log(
              `[milestoneChain] computeResearchMilestoneChain round ${round}: DETOUR — ${candidate.research.id} cuts direct wait from ${purchase.waitSeconds}s to ${bestSequence.pathSeconds}s`
            );
          }
          const isPair = bestSequence.result.items.length > 1;
          for (const detourPurchase of bestSequence.result.items) {
            totalSeconds += detourPurchase.timeToBuySeconds;
            items.push({
              ...detourPurchase,
              buyToHereSeconds: totalSeconds,
              // A paired purchase's own solo `roiSeconds`/`totalRoiSeconds` (near-infinite, since
              // that's exactly why it needed pairing to be worth taking) would be misleading here —
              // show the combined figure that actually justified buying it instead.
              roiSeconds: isPair ? candidate.pairRoiSeconds : candidate.roiSeconds,
              totalRoiSeconds: isPair ? candidate.pairRoiSeconds : candidate.totalRoiSeconds,
              showSaleWarning: candidate.showSaleWarning,
              showDeadlineWarning: candidate.showDeadlineWarning,
            });
          }
          state = bestSequence.result.state;
          snapshot = bestSequence.result.snapshot;
          tookDetour = true;
          break;
        }
      }

      if (tookDetour) continue;

      if (DEBUG_MILESTONE_CHAIN) {
        console.log(
          `[milestoneChain] computeResearchMilestoneChain round ${round}: DIRECT BUY — completesAt=${debugTime(completesAt)} <= nextSaleStart=${debugTime(nextSaleStart)}`
        );
      }
      totalSeconds += purchase.waitSeconds;
      state = applyAction(state, {
        type: 'buy_research',
        payload: { researchId: targetResearch.id, fromLevel: currentLevel, toLevel: currentLevel + 1 },
        cost: purchase.price,
      });
      state = applyTime(state, purchase.waitSeconds, snapshot, { transitions });
      // See `sweepUntilNextSale`'s identical comment on why this needs `skipEpochConversion: true`.
      snapshot = computeSnapshot(state, context, { skipEpochConversion: true });

      items.push({
        research: targetResearch,
        targetLevel: currentLevel + 1,
        currentLevel,
        price: purchase.price,
        timeToBuySeconds: purchase.waitSeconds,
        buyToHereSeconds: totalSeconds,
        duringSale: purchase.duringSale,
        duringEarningsBoost: isEarningsBoostActive(completesAt),
        eventCrossings: findEventCrossings(
          currentAbsoluteTime,
          purchase.waitSeconds,
          isSale,
          isEarningsBoostActive(currentAbsoluteTime)
        ),
      });
      continue;
    }

    if (DEBUG_MILESTONE_CHAIN) {
      console.log(
        `[milestoneChain] computeResearchMilestoneChain round ${round}: SWEEP — completesAt=${debugTime(completesAt)} > nextSaleStart=${debugTime(nextSaleStart)}`
      );
    }

    const sweepResult = sweepUntilNextSale(state, snapshot, context, mods, currentAbsoluteTime, researchSaleDeadline);
    // `sweepResult.items`' own `buyToHereSeconds` are relative to THIS sweep's own start
    // (`currentAbsoluteTime`), not the chain's overall start — rebase them onto the running total so
    // every item in the returned chain reports its actual position in the whole plan.
    for (const item of sweepResult.items) {
      items.push({ ...item, buyToHereSeconds: totalSeconds + item.buyToHereSeconds });
    }
    state = sweepResult.state;
    snapshot = sweepResult.snapshot;
    totalSeconds += sweepResult.totalSeconds;
  }

  if (DEBUG_MILESTONE_CHAIN) {
    console.log(
      `[milestoneChain] computeResearchMilestoneChain: FINISHED after ${round} rounds, ${items.length} items, totalSeconds=${totalSeconds} (${(totalSeconds / 86400).toFixed(2)}d), reached=${(state.researchLevels[targetResearch.id] || 0) >= target.targetLevel}`
    );
  }

  return { items, reached: (state.researchLevels[targetResearch.id] || 0) >= target.targetLevel, totalSeconds };
}

// Tier-unlock milestone, cheapest-first strategy from an arbitrary starting point: buys whatever's
// cheapest (ignoring ROI) until the tier unlocks. Much cheaper to compute per step than the ROI
// strategy (just a price compare, no ROI/snapshot projection).
export function simulateCheapestFirstTierChain(
  state: EngineState,
  snapshot: CalculationsSnapshot,
  totalSecondsSoFar: number,
  target: { tier: number },
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTimeAtStart: number
): MilestoneChainResult {
  let curState = state;
  let curSnapshot = snapshot;
  let totalSeconds = totalSecondsSoFar;
  const items: MilestoneChainItem[] = [];

  while (items.length < MILESTONE_MAX_STEPS && !isTierUnlocked(curState.researchLevels, target.tier)) {
    const currentAbsoluteTime = absoluteSimTimeAtStart + totalSeconds;
    const isSale = isResearchSaleActive(currentAbsoluteTime);
    const transitions = boostTransitionsFrom(curSnapshot, currentAbsoluteTime);

    const levels = curState.researchLevels;

    // Sorting by today's price (not sale-aware) is a deliberate, cheap-to-compute simplification —
    // this function's whole point is being fast (see its doc comment above), and re-evaluating
    // every candidate's sale-aware wait here would be the exact kind of hot-loop calendar-call
    // blowup Phase 2's performance regression already ran into. Only the chosen candidate's actual
    // price/wait (below) needs to be correct, since that's the only one that gets executed.
    const candidates = getCommonResearches()
      .filter(r => (levels[r.id] || 0) < r.levels && isTierUnlocked(levels, r.tier))
      .map(r => {
        const level = levels[r.id] || 0;
        return { research: r, level, price: getDiscountedVirtuePrice(r, level, mods, isSale) };
      });

    if (candidates.length === 0) break;

    candidates.sort((a, b) => a.price - b.price);
    const best = candidates[0];
    const bestPurchase = getSaleAwareTimeToSave(
      best.research,
      best.level,
      mods,
      isSale,
      currentAbsoluteTime,
      curSnapshot,
      transitions
    );
    const secondsToBuy = bestPurchase.waitSeconds;
    if (secondsToBuy === Infinity) break;

    totalSeconds += secondsToBuy;

    curState = applyAction(curState, {
      type: 'buy_research',
      payload: { researchId: best.research.id, fromLevel: best.level, toLevel: best.level + 1 },
      cost: bestPurchase.price,
    });
    curState = applyTime(curState, secondsToBuy, curSnapshot, { transitions });
    // See `sweepUntilNextSale`'s identical comment on why this needs `skipEpochConversion: true`.
    curSnapshot = computeSnapshot(curState, context, { skipEpochConversion: true });

    items.push({
      research: best.research,
      targetLevel: best.level + 1,
      currentLevel: best.level,
      price: bestPurchase.price,
      timeToBuySeconds: secondsToBuy,
      buyToHereSeconds: totalSeconds,
      duringSale: bestPurchase.duringSale,
      duringEarningsBoost: isEarningsBoostActive(currentAbsoluteTime + secondsToBuy),
    });
  }

  return { items, reached: isTierUnlocked(curState.researchLevels, target.tier), totalSeconds };
}

export function computeCheapestFirstTierChain(
  target: { tier: number },
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTimeAtStart: number
): MilestoneChainResult {
  return simulateCheapestFirstTierChain(
    createBaseEngineState(startSnapshot),
    startSnapshot,
    0,
    target,
    context,
    mods,
    absoluteSimTimeAtStart
  );
}

// Tier-unlock milestone: every purchase (in an already-unlocked tier) counts toward the threshold,
// so there's no "wasted" purchase the way there is for a research-level target. But that doesn't
// mean ROI-first is always fastest — an expensive, high-ROI purchase only pays off if there's
// enough remaining runway for its earnings boost to matter; buying it when the milestone could
// instead be finished with a pile of purchases cheaper than it just wastes time saving up.
//
// At each step: compare (a) finishing via pure cheapest-first from here, against (b) buying a
// best-ROI candidate now — solo, or as a two-purchase sequence with its bottleneck-paired partner
// when `rankResearchByROI` recommends one (see `buildRoiCandidateSequences`) — then finishing via
// cheapest-first from THAT state. Candidates are tried in ROI order (capped at
// `MAX_DETOUR_CANDIDATES_PER_STEP`), not just the single top-ranked one: the top candidate's ROI
// can degrade below cheapest-first's pace partway through the chain even while a lower-ranked,
// still-70%-worthwhile candidate would still beat it. The first candidate that beats cheapest-first
// wins; commit to that purchase (or pair) and repeat the comparison (another detour may or may not
// be worth it next). If no candidate up to the cap beats cheapest-first, stop inserting detours and
// finish with the cheapest-first tail, itself re-sequenced by ROI (`reorderPurchaseListByROI`).
// This naturally orders the result as [ROI detours..., cheap purchases re-sequenced by ROI...],
// since detours are only ever prepended while they keep winning, and once cheapest-first wins the
// remaining tail is that same cheapest-first set, just bought in ROI order instead of price order.
export function computeTierMilestoneChain(
  target: { tier: number },
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTimeAtStart: number,
  researchSaleDeadline: number
): MilestoneChainResult {
  let state = createBaseEngineState(startSnapshot);
  let snapshot = startSnapshot;
  let totalSeconds = 0;
  const items: MilestoneChainItem[] = [];

  while (items.length < MILESTONE_MAX_STEPS && !isTierUnlocked(state.researchLevels, target.tier)) {
    const cheapPlan = simulateCheapestFirstTierChain(
      state,
      snapshot,
      totalSeconds,
      target,
      context,
      mods,
      absoluteSimTimeAtStart
    );

    const levels = state.researchLevels;
    const currentAbsoluteTime = absoluteSimTimeAtStart + totalSeconds;
    const isSale = isResearchSaleActive(currentAbsoluteTime);

    // No `deliveryImpactOnly` filter, 'immediate' roiMode — matches the Earnings ROI view's
    // default (there's no equivalent toggle exposed for milestones), same convention as
    // `computeResearchMilestoneChain`.
    const ranked = rankResearchByROI(
      levels,
      snapshot,
      context,
      mods,
      isSale,
      currentAbsoluteTime,
      researchSaleDeadline,
      'immediate',
      false
    );
    // Skip any candidate that wouldn't earn back 70% of its cost before the next research sale
    // starts (`showSaleWarning`) — same "not worth prepaying full price for" rule the manual
    // planner's "Buy Until Sale Warning" button enforces (`meetsSaleAwareDeadline`) — UNLESS it
    // still clears 70% by the cheapest-first fallback's own finish time (`cheapPlan`'s deadline,
    // usually much further out than "next sale"): same reasoning as `computeResearchMilestoneChain`'s
    // identical widening — the `restOfPlan.totalSeconds <= cheapPlan.totalSeconds` check below is
    // what actually guarantees "won't finish later than the fallback," so this filter only needs to
    // decide which candidates are worth spending that check on.
    const tierDeadline = cheapPlan.reached ? absoluteSimTimeAtStart + cheapPlan.totalSeconds : Infinity;
    const eligibleCandidates = ranked.filter(item => {
      if (!item.canBuy) return false;
      if (!item.showSaleWarning) return true;
      if (item.earningsDelta === undefined || item.timeToBuySeconds === undefined) return false;
      return meetsROIByDeadline(
        item.earningsDelta,
        item.price,
        currentAbsoluteTime + item.timeToBuySeconds,
        tierDeadline,
        70
      );
    });

    type TierDetourSequence = {
      items: SequencedPurchase[];
      state: EngineState;
      snapshot: CalculationsSnapshot;
      totalSeconds: number;
      isPair: boolean;
    };

    let bestSequence: TierDetourSequence | null = null;
    let winningCandidate: ResearchRankingItem | undefined;

    // Try candidates in ROI order (capped at `MAX_DETOUR_CANDIDATES_PER_STEP`), not just the single
    // top-ranked one — the top candidate's marginal ROI can degrade over the course of the chain to
    // where it no longer beats cheapest-first, even though a lower-ranked, still-70%-worthwhile
    // candidate still would. Take the first candidate whose best sequence beats `cheapPlan`.
    for (const candidate of eligibleCandidates.slice(0, MAX_DETOUR_CANDIDATES_PER_STEP)) {
      // `candidate` can rank this high purely because pairing it with `pairPartnerResearch` gives a
      // great COMBINED payback (see `rankResearchByROI`'s bottleneck-pairing logic) — try it solo,
      // and — when a partner exists and is itself still purchasable — as a two-purchase sequence
      // in both orders (whichever's cheaper to save up for first can finish sooner). Whichever
      // sequence, followed by cheapest-first for whatever's left, reaches the tier fastest wins.
      const sequences = buildRoiCandidateSequences(candidate, levels);

      let candidateBest: TierDetourSequence | null = null;

      for (const sequence of sequences) {
        const result = simulatePurchaseSequence(sequence, state, snapshot, currentAbsoluteTime, mods, context);
        if (!result) continue;
        const restOfPlan = simulateCheapestFirstTierChain(
          result.state,
          result.snapshot,
          totalSeconds + result.totalSecondsSpent,
          target,
          context,
          mods,
          absoluteSimTimeAtStart
        );
        // `<=`, not `<` — same reasoning as `computeResearchMilestoneChain`'s identical comparison:
        // a candidate bought during genuinely idle time (cheapest-first's own tail is itself waiting
        // on a future sale somewhere in its remaining purchases) often ties `cheapPlan` exactly
        // rather than beating it, and requiring a strict win would stop the very first such
        // no-net-cost detour from being taken.
        if (
          restOfPlan.reached &&
          (!cheapPlan.reached || restOfPlan.totalSeconds <= cheapPlan.totalSeconds) &&
          (!candidateBest || restOfPlan.totalSeconds < candidateBest.totalSeconds)
        ) {
          candidateBest = {
            items: result.items,
            state: result.state,
            snapshot: result.snapshot,
            totalSeconds: restOfPlan.totalSeconds,
            isPair: result.items.length > 1,
          };
        }
      }

      if (candidateBest) {
        bestSequence = candidateBest;
        winningCandidate = candidate;
        break;
      }
    }

    if (bestSequence && winningCandidate) {
      for (const purchase of bestSequence.items) {
        totalSeconds += purchase.timeToBuySeconds;
        items.push({
          ...purchase,
          buyToHereSeconds: totalSeconds,
          // A paired purchase's own solo `roiSeconds`/`totalRoiSeconds` (near-infinite, since
          // that's exactly why it needed pairing to be worth taking) would be misleading here —
          // show the combined figure that actually justified buying it instead.
          roiSeconds: bestSequence.isPair ? winningCandidate.pairRoiSeconds : winningCandidate.roiSeconds,
          totalRoiSeconds: bestSequence.isPair ? winningCandidate.pairRoiSeconds : winningCandidate.totalRoiSeconds,
          showSaleWarning: winningCandidate.showSaleWarning,
          showDeadlineWarning: winningCandidate.showDeadlineWarning,
        });
      }
      state = bestSequence.state;
      snapshot = bestSequence.snapshot;
      continue;
    }

    // Cheapest-first wins (or no detour is viable) — buy the same set of items, but re-sequenced
    // by ROI so any ROI-positive purchases in the tail happen before the zero-ROI filler.
    const reordered = reorderPurchaseListByROI(
      cheapPlan.items,
      state,
      snapshot,
      totalSeconds,
      context,
      mods,
      absoluteSimTimeAtStart,
      researchSaleDeadline
    );
    items.push(...reordered.items);
    return { items, reached: cheapPlan.reached, totalSeconds: reordered.totalSeconds };
  }

  return { items, reached: isTierUnlocked(state.researchLevels, target.tier), totalSeconds };
}

export function computeMilestoneBaseline(
  target: MilestoneTarget,
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTimeAtStart: number
): { reached: boolean; totalSeconds: number } {
  if (target.kind === 'research') {
    const targetResearch = getResearchById(target.researchId);
    if (!targetResearch) return { reached: false, totalSeconds: 0 };

    const level = startSnapshot.researchLevels[targetResearch.id] || 0;
    const isSale = isResearchSaleActive(absoluteSimTimeAtStart);
    const transitions = boostTransitionsFrom(startSnapshot, absoluteSimTimeAtStart);
    const purchase = getSaleAwareTimeToSave(
      targetResearch,
      level,
      mods,
      isSale,
      absoluteSimTimeAtStart,
      startSnapshot,
      transitions
    );
    return { reached: purchase.waitSeconds !== Infinity, totalSeconds: purchase.waitSeconds };
  }

  const cheapChain = computeCheapestFirstTierChain(target, startSnapshot, context, mods, absoluteSimTimeAtStart);
  return { reached: cheapChain.reached, totalSeconds: cheapChain.totalSeconds };
}

export interface MilestoneSummaryCore {
  truncated: boolean;
  baselineSeconds?: number;
  optimizedSeconds?: number;
  timeSavedSeconds?: number;
  purchaseCount?: number;
  gemsSpent?: number;
  // Only set when truncated. However far the optimized chain actually got before giving up —
  // either it hit MILESTONE_MAX_STEPS with real progress still being made (the common "this
  // milestone is just very far away" case, where these are genuinely useful lower bounds: "at
  // least N purchases, at least X of saving"), or it got stuck with zero purchases queued because
  // nothing is currently affordable/viable at all (both `partialPurchaseCount` and `partialSeconds`
  // are then 0, which callers should treat as "stuck," not "almost done").
  partialPurchaseCount?: number;
  partialSeconds?: number;
}

export function computeMilestoneSummaryCore(
  chain: { items: MilestoneChainItem[]; reached: boolean; totalSeconds: number },
  baseline: { reached: boolean; totalSeconds: number }
): MilestoneSummaryCore {
  if (!chain.reached || !baseline.reached) {
    return {
      truncated: true,
      partialPurchaseCount: chain.items.length,
      partialSeconds: chain.totalSeconds,
    };
  }

  return {
    truncated: false,
    baselineSeconds: baseline.totalSeconds,
    optimizedSeconds: chain.totalSeconds,
    timeSavedSeconds: baseline.totalSeconds - chain.totalSeconds,
    purchaseCount: chain.items.length,
    gemsSpent: chain.items.reduce((sum, item) => sum + item.price, 0),
  };
}

import { getDiscountedVirtuePrice, type CommonResearch, type ResearchCostModifiers } from './commonResearch';
import type { CalculationsSnapshot } from '@/types';
import type { SimulationContext } from '@/engine/types';
import { createBaseEngineState } from '@/engine/adapter';
import {
  applyAction,
  getTimeToSave,
  calculateEarningsForTime,
  boostTransitionsFrom,
  type EarningsRateTransition,
} from '@/engine/apply';
import { computeSnapshot } from '@/engine/compute';
import { createSimAction } from '@/types/actions/meta';
import { getNextSaleStart, getNextSaleEnd, getNextEarningsBoostStart, getNextEarningsBoostEnd } from '@/lib/events';

// See the comment where this is used in `calculateResearchROI` for why the ROI-payback horizon is
// deliberately much shorter than `boostTransitionsFrom`'s own multi-year default.
const ROI_PAYBACK_TRANSITION_HORIZON_SECONDS = 60 * 86400;

/**
 * How far ahead to search for a purchase to earn back its own cost, when estimating ROI payback
 * time (`roiSeconds`/`totalRoiSeconds` below, and the equivalent inline search in
 * `researchRanking.ts`'s 'maxed_vehicles' branch). Unlike `getTimeToSave`'s wait-to-afford
 * calculation, capping this is safe: a purchase whose payback search doesn't converge within this
 * horizon just gets `roiSeconds: Infinity`, which only ever affects ROI-based sort order (it sorts
 * last) — it's never treated as "this purchase can't be bought," so there's no equivalent risk of
 * reporting a real purchase as impossible.
 */
export const MAX_ROI_PAYBACK_SEARCH_SECONDS = 999 * 86400;

export interface ROICalculationInput {
  research: CommonResearch;
  level: number;
  mods: ResearchCostModifiers;
  snapshot: CalculationsSnapshot;
  context: SimulationContext;
  eventTiming: {
    absoluteSimTime: number;
    nextSaleStart: number;
    researchSaleDeadline: number;
    isSaleActive: boolean;
    // Precomputed via `boostTransitionsFrom(snapshot, absoluteSimTime)` — callers evaluating many
    // candidates at the same point in simulated time (e.g. a milestone chain's per-step candidate
    // list) should compute this ONCE per step and pass the same value to every `calculateResearchROI`
    // call, rather than each call re-deriving an identical result. `boostTransitionsFrom` walks a
    // multi-year horizon to correctly represent long waits (see its own doc comment), so redoing
    // that walk per-candidate rather than once-per-step multiplies an already expensive operation
    // by the candidate count for no benefit.
    transitions: EarningsRateTransition[];
  };
}

export interface ROICalculationResult {
  roiSeconds: number;
  totalRoiSeconds: number;
  earningsDelta: number;
  showSaleWarning: boolean;
  showDeadlineWarning: boolean;
  timeToBuySeconds: number;
  nextSnapshot: CalculationsSnapshot;
  // The price actually paid, and whether that reflects a research sale — may differ from
  // `getDiscountedVirtuePrice(research, level, mods, eventTiming.isSaleActive)` when waiting for
  // an upcoming sale turns out faster than buying at today's price (see `getSaleAwareTimeToSave`).
  price: number;
  duringSale: boolean;
}

export interface SaleAwarePurchase {
  price: number;
  waitSeconds: number;
  duringSale: boolean;
}

/**
 * The true minimum wait to afford `research` at `level`, choosing whichever is faster: buying now
 * at the current price, or waiting for the next research sale to start and buying at the 70%-off
 * price. Money saved *before* the sale starts still counts toward the *discounted* price the
 * instant the sale begins, so waiting can be strictly faster than buying at full price now, even
 * though the sale isn't active yet at decision time. Concretely: 30 minutes before a sale, an item
 * needing 60 minutes of saving at full price only needs ~18 minutes at 70% off — so the true wait
 * is 30 minutes (wait for the sale, then buy instantly with money already banked), not 60.
 *
 * Also handles the symmetric problem in the other direction — a currently-active sale ending
 * before enough is saved for the discounted price. Money earned is unaffected by the sale (only
 * the *target* price is), so the wait to reach the full price is just `getTimeToSave(fullPrice,
 * snapshot, transitions)` computed from now — the same continuous earnings integral already used
 * everywhere else, unaffected by whether it happens to cross the sale's end partway through.
 */
export function getSaleAwareTimeToSave(
  research: CommonResearch,
  level: number,
  mods: ResearchCostModifiers,
  isSaleActive: boolean,
  currentAbsoluteTime: number,
  snapshot: CalculationsSnapshot,
  transitions: EarningsRateTransition[]
): SaleAwarePurchase {
  const currentPrice = getDiscountedVirtuePrice(research, level, mods, isSaleActive);
  const currentWait = getTimeToSave(currentPrice, snapshot, transitions);

  if (isSaleActive) {
    const timeUntilSaleEnds = getNextSaleEnd(currentAbsoluteTime) - currentAbsoluteTime;
    if (!isFinite(timeUntilSaleEnds) || currentWait <= timeUntilSaleEnds) {
      return { price: currentPrice, waitSeconds: currentWait, duringSale: true };
    }
    // Won't finish saving the discounted price before the sale ends — the shortfall has to be
    // covered at full price instead.
    const fullPrice = getDiscountedVirtuePrice(research, level, mods, false);
    const fullPriceWait = getTimeToSave(fullPrice, snapshot, transitions);
    return { price: fullPrice, waitSeconds: fullPriceWait, duringSale: false };
  }

  const timeUntilSale = getNextSaleStart(currentAbsoluteTime) - currentAbsoluteTime;
  if (!isFinite(timeUntilSale) || timeUntilSale <= 0) {
    return { price: currentPrice, waitSeconds: currentWait, duringSale: false };
  }

  const salePrice = getDiscountedVirtuePrice(research, level, mods, true);
  const saleWaitFromNow = getTimeToSave(salePrice, snapshot, transitions);
  // Can't actually buy before the sale starts even if enough would've been saved sooner — but
  // whatever's banked by then still counts, so the wait is never more than the longer of the two.
  const trueSaleWait = Math.max(timeUntilSale, saleWaitFromNow);

  if (trueSaleWait < currentWait) {
    return { price: salePrice, waitSeconds: trueSaleWait, duringSale: true };
  }
  return { price: currentPrice, waitSeconds: currentWait, duringSale: false };
}

/** One event boundary a purchase's own wait crosses: how far away it is, and what it flips to. */
export interface EventCrossing {
  waitSeconds: number;
  togglesTo: boolean;
}

export interface PurchaseEventCrossings {
  sale: EventCrossing[];
  boost: EventCrossing[];
}

/**
 * Given a purchase that starts saving at `currentAbsoluteTime` and (per its own already-computed,
 * boundary-aware `secondsToBuy` — e.g. from `getSaleAwareTimeToSave`/`getTimeToSave`) completes
 * `secondsToBuy` later, determines which event boundaries (research sale start/end, earnings boost
 * start/end) fall within that window — i.e. which events this purchase will cross while saving up.
 * Returns every crossing in chronological order, not just the first — a wait long enough to span a
 * FULL event cycle (e.g. several days, crossing both the boost's start AND its end) needs both
 * represented, or a display/execution consumer would miss the boost turning back off partway
 * through.
 *
 * Purely descriptive: doesn't affect price/wait math at all (that's already baked into
 * `secondsToBuy` by whichever boundary-aware function computed it) — this just identifies, given
 * that already-correct total, what to show/insert as explicit wait+toggle steps around the
 * purchase. Shared by the milestone chain (to annotate the preview) and the manual planner's
 * execution code (to decide what to actually insert) so both sides agree by construction.
 */
export function findEventCrossings(
  currentAbsoluteTime: number,
  secondsToBuy: number,
  isSaleActiveNow: boolean,
  isBoostActiveNow: boolean
): PurchaseEventCrossings {
  return {
    sale: walkEventCrossings(currentAbsoluteTime, secondsToBuy, isSaleActiveNow, getNextSaleStart, getNextSaleEnd),
    boost: walkEventCrossings(
      currentAbsoluteTime,
      secondsToBuy,
      isBoostActiveNow,
      getNextEarningsBoostStart,
      getNextEarningsBoostEnd
    ),
  };
}

/**
 * Walks forward from `currentAbsoluteTime`, alternating between `getNextStart`/`getNextEnd`,
 * collecting every flip within the purchase's `secondsToBuy` window. Each entry's `waitSeconds` is
 * the length of the segment ENDING at that crossing (from the previous crossing, or from
 * `currentAbsoluteTime` for the first) — i.e. exactly the duration of the `wait_for_*` action that
 * would precede it, so callers can insert/display a chronological sequence of wait+toggle steps
 * without needing to re-derive offsets.
 */
function walkEventCrossings(
  currentAbsoluteTime: number,
  secondsToBuy: number,
  isActiveNow: boolean,
  getNextStart: (t: number) => number,
  getNextEnd: (t: number) => number
): EventCrossing[] {
  if (!isFinite(secondsToBuy) || secondsToBuy <= 0) return [];

  const crossings: EventCrossing[] = [];
  const deadline = currentAbsoluteTime + secondsToBuy;
  let cursor = currentAbsoluteTime;
  let active = isActiveNow;

  while (true) {
    const boundary = active ? getNextEnd(cursor) : getNextStart(cursor);
    if (!isFinite(boundary) || boundary > deadline) break;
    crossings.push({ waitSeconds: boundary - cursor, togglesTo: !active });
    active = !active;
    cursor = boundary;
  }

  return crossings;
}

/**
 * Whether a purchase made at `purchaseTime` will have earned back at least `targetPercent`% of
 * `price` by `targetTimestamp`, assuming `earningsDelta` stays constant over that span. Generalizes
 * a check that used to be hardcoded separately in this codebase: `showSaleWarning` below ("70% by
 * the next sale start") is now just a call to this.
 */
export function meetsROIByDeadline(
  earningsDelta: number,
  price: number,
  purchaseTime: number,
  targetTimestamp: number,
  targetPercent: number
): boolean {
  if (targetTimestamp <= purchaseTime) return false;
  return earningsDelta * (targetTimestamp - purchaseTime) >= (targetPercent / 100) * price;
}

/**
 * Calculate the Return on Investment (ROI) for a specific research purchase.
 * This predicts how long it will take for the research to pay for itself
 * in terms of increased earnings.
 */
export function calculateResearchROI(input: ROICalculationInput): ROICalculationResult {
  const { research, level, mods, snapshot, context, eventTiming } = input;
  const { absoluteSimTime, nextSaleStart, researchSaleDeadline, isSaleActive, transitions } = eventTiming;

  const purchase = getSaleAwareTimeToSave(research, level, mods, isSaleActive, absoluteSimTime, snapshot, transitions);
  const price = purchase.price;
  const timeToBuySeconds = purchase.waitSeconds;
  const baseState = createBaseEngineState(snapshot);

  const tempAction = createSimAction(
    'buy_research',
    {
      researchId: research.id,
      fromLevel: level,
      toLevel: level + 1,
    },
    price
  );

  // Project the farm state forward to the actual time of purchase to get accurate ROI
  // predictions based on expected population growth while saving.
  const stateAtBuy =
    timeToBuySeconds > 0 && isFinite(timeToBuySeconds)
      ? applyAction(baseState, createSimAction('wait_for_time', { totalTimeSeconds: timeToBuySeconds }))
      : baseState;
  const snapshotAtBuy =
    timeToBuySeconds > 0 && isFinite(timeToBuySeconds) ? computeSnapshot(stateAtBuy, context) : snapshot;

  const nextStateAtBuy = applyAction(stateAtBuy, tempAction);
  const nextSnapshot = computeSnapshot(nextStateAtBuy, context);

  const absoluteSimTimeAtBuy = absoluteSimTime + timeToBuySeconds;
  // Hoisted out of `getExtra`: neither depends on `t`, so computing them once and reusing across
  // every binary-search iteration below avoids redoing a transitions walk up to 61 times per call —
  // `getExtra` is invoked once for the initial check plus up to 60 more times in the loop.
  //
  // Deliberately a much shorter horizon than `boostTransitionsFrom`'s own default (see its doc
  // comment): this feeds a PAYBACK ESTIMATE that can search up to `maxTime`
  // (`MAX_ROI_PAYBACK_SEARCH_SECONDS`, ~999 days) below — unlike the wait-to-afford calculation
  // above, where exactly which boost cycles fall within the wait changes the real answer, unresolved
  // oscillation far in the future barely moves a payback estimate already spanning months to years,
  // and `getExtra` computes a DIFFERENCE between two highly-correlated curves (before/after this
  // purchase) whose tail-extrapolation errors mostly cancel. This is called once per candidate
  // researched per step, so it dominates the calendar-lookup cost of a large milestone chain if
  // left at the full horizon.
  const nextTransitions = boostTransitionsFrom(
    nextSnapshot,
    absoluteSimTimeAtBuy,
    ROI_PAYBACK_TRANSITION_HORIZON_SECONDS
  );
  const atBuyTransitions = boostTransitionsFrom(
    snapshotAtBuy,
    absoluteSimTimeAtBuy,
    ROI_PAYBACK_TRANSITION_HORIZON_SECONDS
  );

  let roiSeconds = Infinity;
  const maxTime = MAX_ROI_PAYBACK_SEARCH_SECONDS;
  const getExtra = (t: number) =>
    calculateEarningsForTime(t, nextSnapshot, nextTransitions) -
    calculateEarningsForTime(t, snapshotAtBuy, atBuyTransitions);

  if (getExtra(maxTime) >= price) {
    let low = 0;
    let high = maxTime;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (getExtra(mid) >= price) {
        high = mid;
      } else {
        low = mid;
      }
    }
    roiSeconds = high;
  }

  const earningsDelta = roiSeconds !== Infinity && roiSeconds > 0 ? price / roiSeconds : 0;
  const totalRoiSeconds = timeToBuySeconds + roiSeconds;

  // No warning needed if this purchase is already timed to land during the sale (either it was
  // already active, or getSaleAwareTimeToSave already decided waiting for it was worth it) —
  // there's nothing left to warn about, the price/wait above already account for it.
  const showSaleWarning =
    !purchase.duringSale &&
    !meetsROIByDeadline(earningsDelta, price, absoluteSimTime + timeToBuySeconds, nextSaleStart, 70);

  const showDeadlineWarning = isSaleActive && absoluteSimTime + timeToBuySeconds > researchSaleDeadline;

  return {
    roiSeconds,
    totalRoiSeconds,
    earningsDelta,
    price,
    duringSale: purchase.duringSale,
    showSaleWarning,
    showDeadlineWarning,
    timeToBuySeconds,
    nextSnapshot,
  };
}

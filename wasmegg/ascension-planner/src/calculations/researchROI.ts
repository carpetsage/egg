import { getDiscountedVirtuePrice, type CommonResearch, type ResearchCostModifiers } from './commonResearch';
import type { CalculationsSnapshot } from '@/types';
import type { SimulationContext } from '@/engine/types';
import { createBaseEngineState } from '@/engine/adapter';
import { applyAction, getTimeToSave, calculateEarningsForTime, type EarningsRateTransition } from '@/engine/apply';
import { computeSnapshot } from '@/engine/compute';
import { createSimAction } from '@/types/actions/meta';
import { getNextSaleStart } from '@/lib/events';

export interface ROICalculationInput {
  research: CommonResearch;
  level: number;
  mods: ResearchCostModifiers;
  snapshot: CalculationsSnapshot;
  context: SimulationContext;
  eventTiming: {
    absoluteSimTime: number;
    nextSaleStart: number;
    eventExpirationSeconds: number;
    researchSaleDeadline: number;
    isSaleActive: boolean;
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

/**
 * Builds the single-transition array `calculateEarningsForTime`/`getTimeToSave` expect, from a
 * snapshot's current boost state plus the number of seconds until it next flips (whichever
 * direction — `eventExpirationSeconds` already means "seconds until active boost ends" OR "seconds
 * until inactive boost starts", per `EventTiming`'s doc). The transition always flips to the
 * opposite of the snapshot's own `earningsBoost.active` — including when `atSeconds <= 0`, which
 * correctly signals "this snapshot's flag is stale, the true state already flipped" to the
 * boundary-aware math (see `EarningsRateTransition`'s doc in `engine/apply/math.ts`).
 */
function boostTransitionFor(snapshot: CalculationsSnapshot, atSeconds: number): EarningsRateTransition[] {
  if (!isFinite(atSeconds)) return [];
  return [{ atSeconds, boostActive: !snapshot.earningsBoost.active }];
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
 * Only handles the *upcoming* sale, not a currently-active one ending mid-wait (the symmetric
 * problem in the other direction) — if `isSaleActive` is already true, this returns the same
 * answer the old naive computation would have.
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
    return { price: currentPrice, waitSeconds: currentWait, duringSale: true };
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
  const { absoluteSimTime, nextSaleStart, eventExpirationSeconds, researchSaleDeadline, isSaleActive } = eventTiming;

  const purchase = getSaleAwareTimeToSave(
    research,
    level,
    mods,
    isSaleActive,
    absoluteSimTime,
    snapshot,
    boostTransitionFor(snapshot, eventExpirationSeconds)
  );
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

  const relativeExpirationAtBuy = eventExpirationSeconds - timeToBuySeconds;

  let roiSeconds = Infinity;
  const maxTime = 1e9; // ~31 years
  const getExtra = (t: number) =>
    calculateEarningsForTime(t, nextSnapshot, boostTransitionFor(nextSnapshot, relativeExpirationAtBuy)) -
    calculateEarningsForTime(t, snapshotAtBuy, boostTransitionFor(snapshotAtBuy, relativeExpirationAtBuy));

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

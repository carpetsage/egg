import type { CommonResearch } from './commonResearch';
import type { CalculationsSnapshot } from '@/types';
import type { SimulationContext } from '@/engine/types';
import { createBaseEngineState } from '@/engine/adapter';
import { applyAction, getTimeToSave, calculateEarningsForTime } from '@/engine/apply';
import { computeSnapshot } from '@/engine/compute';
import { createSimAction } from '@/types/actions/meta';

export interface ROICalculationInput {
  research: CommonResearch;
  level: number;
  price: number;
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
}

/**
 * Calculate the Return on Investment (ROI) for a specific research purchase.
 * This predicts how long it will take for the research to pay for itself
 * in terms of increased earnings.
 */
export function calculateResearchROI(input: ROICalculationInput): ROICalculationResult {
  const { research, level, price, snapshot, context, eventTiming } = input;
  const { absoluteSimTime, nextSaleStart, eventExpirationSeconds, researchSaleDeadline, isSaleActive } = eventTiming;

  const timeToBuySeconds = getTimeToSave(price, snapshot);
  const baseState = createBaseEngineState(snapshot);

  const tempAction = createSimAction('buy_research', {
    researchId: research.id,
    fromLevel: level,
    toLevel: level + 1,
  }, price);

  // Project the farm state forward to the actual time of purchase to get accurate ROI 
  // predictions based on expected population growth while saving.
  const stateAtBuy = timeToBuySeconds > 0 && isFinite(timeToBuySeconds)
    ? applyAction(baseState, createSimAction('wait_for_time', { totalTimeSeconds: timeToBuySeconds }))
    : baseState;
  const snapshotAtBuy = timeToBuySeconds > 0 && isFinite(timeToBuySeconds)
    ? computeSnapshot(stateAtBuy, context)
    : snapshot;

  const nextStateAtBuy = applyAction(stateAtBuy, tempAction);
  const nextSnapshot = computeSnapshot(nextStateAtBuy, context);
  
  const relativeExpirationAtBuy = eventExpirationSeconds - timeToBuySeconds;

  let roiSeconds = Infinity;
  const maxTime = 1e9; // ~31 years
  const getExtra = (t: number) => 
    calculateEarningsForTime(t, nextSnapshot, relativeExpirationAtBuy) - 
    calculateEarningsForTime(t, snapshotAtBuy, relativeExpirationAtBuy);

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

  const showSaleWarning = !isSaleActive && (
    (absoluteSimTime + timeToBuySeconds >= nextSaleStart) ||
    (earningsDelta * (nextSaleStart - (absoluteSimTime + timeToBuySeconds)) < 0.7 * price)
  );
  
  const showDeadlineWarning = isSaleActive && (absoluteSimTime + timeToBuySeconds > researchSaleDeadline);

  return {
    roiSeconds,
    totalRoiSeconds,
    earningsDelta,
    showSaleWarning,
    showDeadlineWarning,
    timeToBuySeconds,
    nextSnapshot,
  };
}

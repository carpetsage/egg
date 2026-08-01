import {
  type CommonResearch,
  getCommonResearches,
  getResearchById,
  getDiscountedVirtuePrice,
  isTierUnlocked,
  type ResearchCostModifiers,
} from './commonResearch';
import {
  calculateResearchROI,
  getSaleAwareTimeToSave,
  findEventCrossings,
  type PurchaseEventCrossings,
} from './researchROI';
import type { EngineState, SimulationContext } from '@/engine/types';
import type { CalculationsSnapshot } from '@/types';
import { computeSnapshot } from '@/engine/compute';
import { createBaseEngineState } from '@/engine/adapter';
import { applyAction, applyTime, getTimeToSave, boostTransitionsFrom } from '@/engine/apply';
import {
  getNextPacificTime,
  isResearchSaleActive,
  isEarningsBoostActive,
  getNextEarningsBoostStart,
  getNextEarningsBoostEnd,
} from '@/lib/events';

export type MilestoneTarget =
  | { kind: 'tier'; tier: number }
  | { kind: 'research'; researchId: string; targetLevel: number };

export function isMilestoneReached(target: MilestoneTarget, researchLevels: Record<string, number>): boolean {
  return target.kind === 'tier'
    ? isTierUnlocked(researchLevels, target.tier)
    : (researchLevels[target.researchId] || 0) >= target.targetLevel;
}

const MILESTONE_MAX_STEPS = 2000;

export interface MilestoneChainItem {
  research: CommonResearch;
  targetLevel: number;
  currentLevel: number;
  price: number;
  timeToBuySeconds: number;
  buyToHereSeconds: number;
  roiSeconds?: number;
  totalRoiSeconds?: number;
  timeSavedSeconds?: number;
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

interface MilestoneChainResult {
  items: MilestoneChainItem[];
  reached: boolean;
  totalSeconds: number;
}

// For a "research level" milestone there's always a well-defined fallback: just save up and buy
// the target directly. So a detour through some other research is only worth suggesting if it
// provably shortens the total time versus that direct purchase — not merely because the detour
// has good ROI in isolation (a great-ROI item can still make you arrive at the target *later*,
// since you also have to spend time saving up for the detour itself).
export function computeResearchMilestoneChain(
  target: { researchId: string; targetLevel: number },
  startState: EngineState,
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTimeAtStart: number
): MilestoneChainResult {
  const targetResearch = getResearchById(target.researchId);

  let state = startState;
  let snapshot = startSnapshot;
  let totalSeconds = 0;
  const items: MilestoneChainItem[] = [];

  if (!targetResearch) return { items, reached: false, totalSeconds };

  while (items.length < MILESTONE_MAX_STEPS && (state.researchLevels[targetResearch.id] || 0) < target.targetLevel) {
    const currentAbsoluteTime = absoluteSimTimeAtStart + totalSeconds;
    const isSale = isResearchSaleActive(currentAbsoluteTime);
    const transitions = boostTransitionsFrom(snapshot, currentAbsoluteTime);

    const levels = state.researchLevels;
    const targetLevel = levels[targetResearch.id] || 0;
    const targetPurchase = getSaleAwareTimeToSave(
      targetResearch,
      targetLevel,
      mods,
      isSale,
      currentAbsoluteTime,
      snapshot,
      transitions
    );
    const targetPrice = targetPurchase.price;
    const directSeconds = targetPurchase.waitSeconds;

    let best: {
      research: CommonResearch;
      level: number;
      price: number;
      secondsToBuy: number;
      pathSeconds: number;
      duringSale: boolean;
    } | null = null;

    for (const r of getCommonResearches()) {
      if (r.id === targetResearch.id) continue;
      const level = levels[r.id] || 0;
      if (level >= r.levels || !isTierUnlocked(levels, r.tier)) continue;

      const detourPurchase = getSaleAwareTimeToSave(r, level, mods, isSale, currentAbsoluteTime, snapshot, transitions);
      const price = detourPurchase.price;
      const secondsToBuy = detourPurchase.waitSeconds;
      if (secondsToBuy === Infinity) continue;

      const stateAfter = applyTime(
        applyAction(state, {
          type: 'buy_research',
          payload: { researchId: r.id, fromLevel: level, toLevel: level + 1 },
          cost: price,
        }),
        secondsToBuy,
        snapshot,
        { transitions }
      );
      const snapshotAfter = computeSnapshot(stateAfter, context);
      const secondsToTargetAfter = getTimeToSave(
        targetPrice,
        snapshotAfter,
        boostTransitionsFrom(snapshotAfter, currentAbsoluteTime + secondsToBuy)
      );
      const pathSeconds = secondsToBuy + secondsToTargetAfter;

      if (pathSeconds < directSeconds && (!best || pathSeconds < best.pathSeconds)) {
        best = { research: r, level, price, secondsToBuy, pathSeconds, duringSale: detourPurchase.duringSale };
      }
    }

    if (best) {
      totalSeconds += best.secondsToBuy;
      state = applyAction(state, {
        type: 'buy_research',
        payload: { researchId: best.research.id, fromLevel: best.level, toLevel: best.level + 1 },
        cost: best.price,
      });
      state = applyTime(state, best.secondsToBuy, snapshot, { transitions });
      snapshot = computeSnapshot(state, context);

      const timeSaved = directSeconds - best.pathSeconds;
      items.push({
        research: best.research,
        targetLevel: best.level + 1,
        currentLevel: best.level,
        price: best.price,
        timeToBuySeconds: best.secondsToBuy,
        buyToHereSeconds: totalSeconds,
        timeSavedSeconds: timeSaved,
        duringSale: best.duringSale,
        duringEarningsBoost: isEarningsBoostActive(currentAbsoluteTime + best.secondsToBuy),
        eventCrossings: findEventCrossings(
          currentAbsoluteTime,
          best.secondsToBuy,
          isSale,
          isEarningsBoostActive(currentAbsoluteTime)
        ),
      });
    } else {
      if (directSeconds === Infinity) break;

      totalSeconds += directSeconds;
      state = applyAction(state, {
        type: 'buy_research',
        payload: { researchId: targetResearch.id, fromLevel: targetLevel, toLevel: targetLevel + 1 },
        cost: targetPrice,
      });
      state = applyTime(state, directSeconds, snapshot, { transitions });
      snapshot = computeSnapshot(state, context);

      items.push({
        research: targetResearch,
        targetLevel: targetLevel + 1,
        currentLevel: targetLevel,
        price: targetPrice,
        timeToBuySeconds: directSeconds,
        buyToHereSeconds: totalSeconds,
        duringSale: targetPurchase.duringSale,
        duringEarningsBoost: isEarningsBoostActive(currentAbsoluteTime + directSeconds),
        eventCrossings: findEventCrossings(
          currentAbsoluteTime,
          directSeconds,
          isSale,
          isEarningsBoostActive(currentAbsoluteTime)
        ),
      });
    }
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
    curSnapshot = computeSnapshot(curState, context);

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

// Re-sequences a FIXED set of purchases (same researches, same levels — just picked by price) into
// ROI order instead. The set of purchases and their total price don't change, but since each
// purchase's own price only depends on its own current level (never on what else has been bought),
// buying the ROI-positive ones earlier can only grow earnings sooner and speed up the rest — never
// slower than the original price-only order. Per-research level order is preserved (you can't buy
// level N+1 before level N of the same research).
function reorderTierChainByROI(
  tailItems: MilestoneChainItem[],
  startState: EngineState,
  startSnapshot: CalculationsSnapshot,
  startTotalSeconds: number,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTimeAtStart: number,
  researchSaleDeadline: number
): { items: MilestoneChainItem[]; totalSeconds: number } {
  const pendingByResearch = new Map<string, { research: CommonResearch; levels: number[] }>();
  for (const item of tailItems) {
    const entry = pendingByResearch.get(item.research.id);
    if (entry) {
      entry.levels.push(item.targetLevel);
    } else {
      pendingByResearch.set(item.research.id, { research: item.research, levels: [item.targetLevel] });
    }
  }

  let state = startState;
  let snapshot = startSnapshot;
  let totalSeconds = startTotalSeconds;
  const items: MilestoneChainItem[] = [];

  while (items.length < tailItems.length) {
    const currentAbsoluteTime = absoluteSimTimeAtStart + totalSeconds;
    const isSale = isResearchSaleActive(currentAbsoluteTime);
    const transitions = boostTransitionsFrom(snapshot, currentAbsoluteTime);
    const nextSaleStart = getNextPacificTime(5, 9, currentAbsoluteTime);
    // Seconds until the boost's own next flip (see `boostTransitionFor`'s contract in
    // researchROI.ts) — must match calendar truth (`isEarningsBoostActive`), not the nearest 9 AM
    // on any day, else an inactive boost gets treated as starting on the next day instead of the
    // next Monday.
    const eventExpirationSeconds = isEarningsBoostActive(currentAbsoluteTime)
      ? getNextEarningsBoostEnd(currentAbsoluteTime) - currentAbsoluteTime
      : getNextEarningsBoostStart(currentAbsoluteTime) - currentAbsoluteTime;

    const candidates = Array.from(pendingByResearch.values())
      .filter(entry => entry.levels.length > 0)
      .map(entry => {
        const targetLevel = entry.levels[0];
        const level = targetLevel - 1;
        const roiResult = calculateResearchROI({
          research: entry.research,
          level,
          mods,
          snapshot,
          context,
          eventTiming: {
            absoluteSimTime: currentAbsoluteTime,
            nextSaleStart,
            eventExpirationSeconds,
            researchSaleDeadline,
            isSaleActive: isSale,
          },
        });
        return { research: entry.research, level, targetLevel, roiResult };
      });

    if (candidates.length === 0) break;

    // Sort by totalRoiSeconds (wait-to-afford + payback), not roiSeconds (payback alone) — same
    // convention `researchRanking.ts`'s final sort already uses. Sorting by payback alone can pick
    // an expensive item with a slightly faster payback over several cheaper, still-decent-ROI items
    // that are individually affordable much sooner, forcing one long idle wait instead of buying
    // things as money allows.
    candidates.sort((a, b) => {
      if (a.roiResult.totalRoiSeconds !== b.roiResult.totalRoiSeconds) {
        return a.roiResult.totalRoiSeconds - b.roiResult.totalRoiSeconds;
      }
      return a.roiResult.price - b.roiResult.price;
    });

    const best = candidates[0];
    // Re-derive the actual purchase with this file's own boost-staleness-aware `transitions`
    // (calculateResearchROI's internal wait, used above for ranking, is precise about the sale but
    // uses a simpler earnings-boost transition — fine for ranking, not for the wait we execute).
    const bestPurchase = getSaleAwareTimeToSave(
      best.research,
      best.level,
      mods,
      isSale,
      currentAbsoluteTime,
      snapshot,
      transitions
    );
    const secondsToBuy = bestPurchase.waitSeconds;
    if (secondsToBuy === Infinity) break;

    totalSeconds += secondsToBuy;

    state = applyAction(state, {
      type: 'buy_research',
      payload: { researchId: best.research.id, fromLevel: best.level, toLevel: best.targetLevel },
      cost: bestPurchase.price,
    });
    state = applyTime(state, secondsToBuy, snapshot, { transitions });
    snapshot = computeSnapshot(state, context);

    items.push({
      research: best.research,
      targetLevel: best.targetLevel,
      currentLevel: best.level,
      price: bestPurchase.price,
      timeToBuySeconds: secondsToBuy,
      buyToHereSeconds: totalSeconds,
      roiSeconds: best.roiResult.roiSeconds,
      totalRoiSeconds: best.roiResult.totalRoiSeconds,
      showSaleWarning: best.roiResult.showSaleWarning,
      showDeadlineWarning: best.roiResult.showDeadlineWarning,
      duringSale: bestPurchase.duringSale,
      duringEarningsBoost: isEarningsBoostActive(currentAbsoluteTime + secondsToBuy),
      eventCrossings: findEventCrossings(
        currentAbsoluteTime,
        secondsToBuy,
        isSale,
        isEarningsBoostActive(currentAbsoluteTime)
      ),
    });

    pendingByResearch.get(best.research.id)!.levels.shift();
  }

  return { items, totalSeconds };
}

// Tier-unlock milestone: every purchase (in an already-unlocked tier) counts toward the threshold,
// so there's no "wasted" purchase the way there is for a research-level target. But that doesn't
// mean ROI-first is always fastest — an expensive, high-ROI purchase only pays off if there's
// enough remaining runway for its earnings boost to matter; buying it when the milestone could
// instead be finished with a pile of purchases cheaper than it just wastes time saving up.
//
// At each step: compare (a) finishing via pure cheapest-first from here, against (b) buying the
// single best-ROI candidate now, then finishing via cheapest-first from THAT state. Whichever is
// faster wins. If (b) wins, commit to that one purchase and repeat the comparison (another detour
// may or may not be worth it next); if (a) wins, stop inserting detours and finish with the
// cheapest-first tail. This naturally orders the result as [ROI detours..., cheap purchases...],
// since detours are only ever prepended while they keep winning, and once cheapest-first wins the
// remaining tail is pure cheapest-first.
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
    const transitions = boostTransitionsFrom(snapshot, currentAbsoluteTime);
    const nextSaleStart = getNextPacificTime(5, 9, currentAbsoluteTime);
    // Seconds until the boost's own next flip — see the matching comment above in
    // `reorderTierChainByROI` (or `boostTransitionFor`'s doc in researchROI.ts).
    const eventExpirationSeconds = isEarningsBoostActive(currentAbsoluteTime)
      ? getNextEarningsBoostEnd(currentAbsoluteTime) - currentAbsoluteTime
      : getNextEarningsBoostStart(currentAbsoluteTime) - currentAbsoluteTime;

    const roiCandidates = getCommonResearches()
      .filter(r => (levels[r.id] || 0) < r.levels && isTierUnlocked(levels, r.tier))
      .map(r => {
        const level = levels[r.id] || 0;
        const roiResult = calculateResearchROI({
          research: r,
          level,
          mods,
          snapshot,
          context,
          eventTiming: {
            absoluteSimTime: currentAbsoluteTime,
            nextSaleStart,
            eventExpirationSeconds,
            researchSaleDeadline,
            isSaleActive: isSale,
          },
        });
        return { research: r, level, roiResult };
      });

    // Same totalRoiSeconds (wait-to-afford + payback) convention as reorderTierChainByROI above.
    roiCandidates.sort((a, b) => {
      if (a.roiResult.totalRoiSeconds !== b.roiResult.totalRoiSeconds) {
        return a.roiResult.totalRoiSeconds - b.roiResult.totalRoiSeconds;
      }
      return a.roiResult.price - b.roiResult.price;
    });

    let detourPlan: {
      detourItem: MilestoneChainItem;
      secondsToBuy: number;
      totalSeconds: number;
      reached: boolean;
    } | null = null;

    if (roiCandidates.length > 0) {
      const bestRoi = roiCandidates[0];
      // Re-derive with this file's own boost-staleness-aware `transitions`, same reasoning as
      // reorderTierChainByROI above.
      const bestPurchase = getSaleAwareTimeToSave(
        bestRoi.research,
        bestRoi.level,
        mods,
        isSale,
        currentAbsoluteTime,
        snapshot,
        transitions
      );
      const secondsToBuy = bestPurchase.waitSeconds;

      if (secondsToBuy !== Infinity) {
        const stateAfterDetour = applyTime(
          applyAction(state, {
            type: 'buy_research',
            payload: { researchId: bestRoi.research.id, fromLevel: bestRoi.level, toLevel: bestRoi.level + 1 },
            cost: bestPurchase.price,
          }),
          secondsToBuy,
          snapshot,
          { transitions }
        );
        const snapshotAfterDetour = computeSnapshot(stateAfterDetour, context);
        const restOfPlan = simulateCheapestFirstTierChain(
          stateAfterDetour,
          snapshotAfterDetour,
          totalSeconds + secondsToBuy,
          target,
          context,
          mods,
          absoluteSimTimeAtStart
        );

        detourPlan = {
          detourItem: {
            research: bestRoi.research,
            targetLevel: bestRoi.level + 1,
            currentLevel: bestRoi.level,
            price: bestPurchase.price,
            timeToBuySeconds: secondsToBuy,
            buyToHereSeconds: totalSeconds + secondsToBuy,
            roiSeconds: bestRoi.roiResult.roiSeconds,
            totalRoiSeconds: bestRoi.roiResult.totalRoiSeconds,
            showSaleWarning: bestRoi.roiResult.showSaleWarning,
            showDeadlineWarning: bestRoi.roiResult.showDeadlineWarning,
            duringSale: bestPurchase.duringSale,
            duringEarningsBoost: isEarningsBoostActive(currentAbsoluteTime + secondsToBuy),
            eventCrossings: findEventCrossings(
              currentAbsoluteTime,
              secondsToBuy,
              isSale,
              isEarningsBoostActive(currentAbsoluteTime)
            ),
          },
          secondsToBuy,
          totalSeconds: restOfPlan.totalSeconds,
          reached: restOfPlan.reached,
        };
      }
    }

    const detourWins =
      detourPlan && detourPlan.reached && (!cheapPlan.reached || detourPlan.totalSeconds < cheapPlan.totalSeconds);

    if (detourWins && detourPlan) {
      items.push(detourPlan.detourItem);
      totalSeconds += detourPlan.secondsToBuy;
      state = applyAction(state, {
        type: 'buy_research',
        payload: {
          researchId: detourPlan.detourItem.research.id,
          fromLevel: detourPlan.detourItem.currentLevel,
          toLevel: detourPlan.detourItem.targetLevel,
        },
        cost: detourPlan.detourItem.price,
      });
      state = applyTime(state, detourPlan.secondsToBuy, snapshot, { transitions });
      snapshot = computeSnapshot(state, context);
      continue;
    }

    // Cheapest-first wins (or no detour is viable) — buy the same set of items, but re-sequenced
    // by ROI so any ROI-positive purchases in the tail happen before the zero-ROI filler.
    const reordered = reorderTierChainByROI(
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
}

export function computeMilestoneSummaryCore(
  chain: { items: MilestoneChainItem[]; reached: boolean; totalSeconds: number },
  baseline: { reached: boolean; totalSeconds: number }
): MilestoneSummaryCore {
  if (!chain.reached || !baseline.reached) {
    return { truncated: true };
  }

  return {
    truncated: false,
    baselineSeconds: baseline.totalSeconds,
    optimizedSeconds: chain.totalSeconds,
    timeSavedSeconds: baseline.totalSeconds - chain.totalSeconds,
    purchaseCount: chain.items.length,
  };
}

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
import {
  rankResearchByROI,
  buildRoiCandidateSequences,
  simulatePurchaseSequence,
  type SequencedPurchase,
} from './researchRanking';
import type { EngineState, SimulationContext } from '@/engine/types';
import type { CalculationsSnapshot } from '@/types';
import { computeSnapshot } from '@/engine/compute';
import { createBaseEngineState } from '@/engine/adapter';
import { applyAction, applyTime, getTimeToSave, boostTransitionsFrom } from '@/engine/apply';
import { getNextPacificTime, isResearchSaleActive, isEarningsBoostActive } from '@/lib/events';
import { debugLog } from '@/lib/debugLog';

// Time-based (not iteration-count-based) progress heartbeat for the milestone-chain loops below.
// Time-based rather than every-N-iterations because we don't know in advance whether a hang means
// "many iterations, each fast" or "stuck within one iteration" — logging on a wall-clock interval
// catches both, and each call is a synchronous localStorage write (see debugLog.ts), so it's
// captured immediately even if the loop itself never returns.
const PROGRESS_LOG_INTERVAL_MS = 500;
function maybeLogProgress(label: string, lastLogTime: number, data: Record<string, unknown>): number {
  const now = performance.now();
  if (now - lastLogTime < PROGRESS_LOG_INTERVAL_MS) return lastLogTime;
  debugLog(`${label}: progress`, data);
  return now;
}

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
// the target directly. A detour through some other research is only worth taking if it provably
// shortens the total time versus that direct purchase — not merely because the detour has good
// ROI in isolation (a great-ROI item can still make you arrive at the target *later*, since you
// also have to spend time saving up for the detour itself).
//
// Which detour to consider at each step is driven by `rankResearchByROI` — the same "fastest
// total ROI time" ordering (wait-to-afford + payback) the Earnings ROI research view and Smart
// Buy's sale-aware flow already buy in (see `roiRankedResearches`/`simulateSaleAwareBuy`) — rather
// than a bespoke search over every candidate's effect on the target. Only the single top-ranked
// candidate is checked each step — as a solo purchase, and, if it's a bottleneck-paired
// recommendation (see `buildRoiCandidateSequences`), as a two-purchase sequence with its pair
// partner: if any of those beats buying the target directly, it's taken and the loop
// repeats (re-ranking, since a purchase can shift the ROI order); the moment the top-ranked
// candidate no longer helps in any of those forms, detouring stops and the target itself is bought.
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

  let state = startState;
  let snapshot = startSnapshot;
  let totalSeconds = 0;
  const items: MilestoneChainItem[] = [];

  if (!targetResearch) return { items, reached: false, totalSeconds };

  let outerIterations = 0;
  let lastProgressLog = performance.now();
  const loopStart = lastProgressLog;

  while (items.length < MILESTONE_MAX_STEPS && (state.researchLevels[targetResearch.id] || 0) < target.targetLevel) {
    outerIterations++;
    lastProgressLog = maybeLogProgress('computeResearchMilestoneChain', lastProgressLog, {
      target,
      outerIterations,
      itemsSoFar: items.length,
      elapsedMs: Math.round(performance.now() - loopStart),
    });
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

    // No `deliveryImpactOnly` filter, 'immediate' roiMode — matches the Earnings ROI view's
    // default (there's no equivalent toggle exposed for milestones), and already excludes the
    // target itself only via the `.find` below, not the ranking itself.
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
    // `showSaleWarning` (from `calculateResearchROI`, inside `rankResearchByROI`) means this
    // candidate, bought right now, wouldn't earn back 70% of its cost before the next research
    // sale starts — the same "not worth prepaying full price for" rule the manual planner's "Buy
    // Until Sale Warning" button enforces (`meetsSaleAwareDeadline`). A detour is optional (the
    // milestone chain always has the direct target purchase as its fallback), so it should never
    // insert a purchase that flunks this rule — skip it and consider the next-best-ROI candidate
    // instead, same as that button's own `ranked.find(...)` pattern.
    const bestRoi = ranked.find(item => item.canBuy && item.research.id !== targetResearch.id && !item.showSaleWarning);

    let bought = false;

    if (bestRoi) {
      lastProgressLog = maybeLogProgress('computeResearchMilestoneChain', lastProgressLog, {
        target,
        outerIterations,
        candidateResearchId: bestRoi.research.id,
        elapsedMs: Math.round(performance.now() - loopStart),
      });

      // `bestRoi` can rank this high purely because pairing it with `pairPartnerResearch` gives a
      // great COMBINED payback (see `rankResearchByROI`'s bottleneck-pairing logic) — a laying or
      // shipping research capped by the other side of the pipeline moves earnings by ~0 bought
      // alone, so evaluating it solo (the only thing the previous version of this code did) would
      // never beat `directSeconds`, and a genuinely-worthwhile pairing would never get taken. Try
      // it solo, and — when a partner exists and is itself still purchasable — as a two-purchase
      // sequence in both orders (whichever's cheaper to save up for first can finish sooner);
      // take whichever sequence both completes and beats `directSeconds` by the widest margin.
      const sequences = buildRoiCandidateSequences(bestRoi, levels, targetResearch.id);

      let bestSequence: { result: NonNullable<ReturnType<typeof simulatePurchaseSequence>>; pathSeconds: number } | null =
        null;

      for (const sequence of sequences) {
        const result = simulatePurchaseSequence(sequence, state, snapshot, currentAbsoluteTime, mods, context);
        if (!result) continue;
        const secondsToTargetAfter = getTimeToSave(
          targetPrice,
          result.snapshot,
          boostTransitionsFrom(result.snapshot, currentAbsoluteTime + result.totalSecondsSpent)
        );
        const pathSeconds = result.totalSecondsSpent + secondsToTargetAfter;
        if (pathSeconds < directSeconds && (!bestSequence || pathSeconds < bestSequence.pathSeconds)) {
          bestSequence = { result, pathSeconds };
        }
      }

      if (bestSequence) {
        const isPair = bestSequence.result.items.length > 1;
        for (const purchase of bestSequence.result.items) {
          totalSeconds += purchase.timeToBuySeconds;
          items.push({
            ...purchase,
            buyToHereSeconds: totalSeconds,
            // A paired purchase's own solo `roiSeconds`/`totalRoiSeconds` (near-infinite, since
            // that's exactly why it needed pairing to be worth taking) would be misleading here —
            // show the combined figure that actually justified buying it instead.
            roiSeconds: isPair ? bestRoi.pairRoiSeconds : bestRoi.roiSeconds,
            totalRoiSeconds: isPair ? bestRoi.pairRoiSeconds : bestRoi.totalRoiSeconds,
            showSaleWarning: bestRoi.showSaleWarning,
            showDeadlineWarning: bestRoi.showDeadlineWarning,
          });
        }
        state = bestSequence.result.state;
        snapshot = bestSequence.result.snapshot;
        bought = true;
      }
    }

    if (!bought) {
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

  let outerIterations = 0;
  let lastProgressLog = performance.now();
  const loopStart = lastProgressLog;

  while (items.length < MILESTONE_MAX_STEPS && !isTierUnlocked(curState.researchLevels, target.tier)) {
    outerIterations++;
    lastProgressLog = maybeLogProgress('simulateCheapestFirstTierChain', lastProgressLog, {
      target,
      outerIterations,
      itemsSoFar: items.length,
      elapsedMs: Math.round(performance.now() - loopStart),
    });
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
            researchSaleDeadline,
            isSaleActive: isSale,
            transitions,
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
// single best-ROI candidate now — solo, or as a two-purchase sequence with its bottleneck-paired
// partner when `rankResearchByROI` recommends one (see `buildRoiCandidateSequences`) — then
// finishing via cheapest-first from THAT state. Whichever is faster wins. If (b) wins, commit to
// that purchase (or pair) and repeat the comparison (another detour may or may not be worth it
// next); if (a) wins, stop inserting detours and finish with the cheapest-first tail, itself
// re-sequenced by ROI (`reorderTierChainByROI`). This naturally orders the result as [ROI
// detours..., cheap purchases re-sequenced by ROI...], since detours are only ever prepended while
// they keep winning, and once cheapest-first wins the remaining tail is that same cheapest-first
// set, just bought in ROI order instead of price order.
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

  let outerIterations = 0;
  let lastProgressLog = performance.now();
  const loopStart = lastProgressLog;

  while (items.length < MILESTONE_MAX_STEPS && !isTierUnlocked(state.researchLevels, target.tier)) {
    outerIterations++;
    lastProgressLog = maybeLogProgress('computeTierMilestoneChain', lastProgressLog, {
      target,
      outerIterations,
      itemsSoFar: items.length,
      elapsedMs: Math.round(performance.now() - loopStart),
    });
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
    // planner's "Buy Until Sale Warning" button enforces (`meetsSaleAwareDeadline`). A detour here
    // is optional — cheapest-first is always the fallback — so it should never jump the queue on a
    // purchase that flunks this rule; the next-best-ROI candidate that passes is used instead.
    const bestRoi = ranked.find(item => item.canBuy && !item.showSaleWarning);

    let bestSequence: {
      items: SequencedPurchase[];
      state: EngineState;
      snapshot: CalculationsSnapshot;
      totalSeconds: number;
      isPair: boolean;
    } | null = null;

    if (bestRoi) {
      lastProgressLog = maybeLogProgress('computeTierMilestoneChain', lastProgressLog, {
        target,
        outerIterations,
        candidateResearchId: bestRoi.research.id,
        elapsedMs: Math.round(performance.now() - loopStart),
      });

      // `bestRoi` can rank this high purely because pairing it with `pairPartnerResearch` gives a
      // great COMBINED payback (see `rankResearchByROI`'s bottleneck-pairing logic) — try it solo,
      // and — when a partner exists and is itself still purchasable — as a two-purchase sequence
      // in both orders (whichever's cheaper to save up for first can finish sooner). Whichever
      // sequence, followed by cheapest-first for whatever's left, reaches the tier fastest wins.
      const sequences = buildRoiCandidateSequences(bestRoi, levels);

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
        if (restOfPlan.reached && (!bestSequence || restOfPlan.totalSeconds < bestSequence.totalSeconds)) {
          bestSequence = {
            items: result.items,
            state: result.state,
            snapshot: result.snapshot,
            totalSeconds: restOfPlan.totalSeconds,
            isPair: result.items.length > 1,
          };
        }
      }
    }

    const detourWins = bestSequence && (!cheapPlan.reached || bestSequence.totalSeconds < cheapPlan.totalSeconds);

    if (detourWins && bestSequence && bestRoi) {
      for (const purchase of bestSequence.items) {
        totalSeconds += purchase.timeToBuySeconds;
        items.push({
          ...purchase,
          buyToHereSeconds: totalSeconds,
          // A paired purchase's own solo `roiSeconds`/`totalRoiSeconds` (near-infinite, since
          // that's exactly why it needed pairing to be worth taking) would be misleading here —
          // show the combined figure that actually justified buying it instead.
          roiSeconds: bestSequence.isPair ? bestRoi.pairRoiSeconds : bestRoi.roiSeconds,
          totalRoiSeconds: bestSequence.isPair ? bestRoi.pairRoiSeconds : bestRoi.totalRoiSeconds,
          showSaleWarning: bestRoi.showSaleWarning,
          showDeadlineWarning: bestRoi.showDeadlineWarning,
        });
      }
      state = bestSequence.state;
      snapshot = bestSequence.snapshot;
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
  };
}

import { type ResearchCostModifiers, getCommonResearches, getResearchById, getResearchByTier } from './commonResearch';
import {
  rankResearchByROI,
  rankResearchByELRImpact,
  buyWhilePassingCheck,
  buyUntilRealSaleStarts,
} from './researchRanking';
import { meetsSaleAwareDeadline, meetsROIByDeadline, getSaleAwareTimeToSave } from './researchROI';
import { findSmartBuyCandidate } from './smartBuyCandidate';
import type { CalculationsSnapshot } from '@/types';
import type { SimulationContext, EngineState } from '@/engine/types';
import { createBaseEngineState } from '@/engine/adapter';
import { computeSnapshot } from '@/engine/compute';
import { applyAction, applyTime, boostTransitionsFrom } from '@/engine/apply';
import { isResearchSaleActive } from '@/lib/events';
import { ei } from 'lib';

/**
 * Safety-net cap shared by every dry run below — protects against a runaway loop, not a real
 * per-scenario budget (it comfortably exceeds the total number of individual research levels in
 * the game). Matches the same "guard rail, not a tuning knob" role Quick Buy's real execution loop
 * already gives its own iteration cap.
 */
export const MAX_SIMULATED_PURCHASES = 2000;

/**
 * Safety-net cap on the earnings-prelude loop specifically (`simulateEarningsPreludeForSaleEnd`) —
 * every prelude LENGTH tried triggers its own full delivery-loop re-run in `simulateSaleEndsBuy`'s
 * trim search below, so this needs to stay much smaller than `MAX_SIMULATED_PURCHASES` to keep that
 * search's worst case (this many extra delivery-loop runs, each up to `MAX_SIMULATED_PURCHASES`
 * iterations) from stalling the tab. A single research sale's window realistically can't fit
 * anywhere near this many sequential ROI-qualifying purchases.
 */
const MAX_PRELUDE_PURCHASES = 100;

function buyResearchAction(researchId: string, fromLevel: number, cost: number) {
  return {
    type: 'buy_research' as const,
    payload: { researchId, fromLevel, toLevel: fromLevel + 1 },
    cost,
  };
}

export interface SaleAwarePlanEntry {
  researchId: string;
  duringSale: boolean;
  purchaseTimestamp: number;
}

export interface SaleAwareBuyPlan {
  /** Full sequence, INCLUDING any sale-bypass entry still pending cleanup (see below). */
  entries: SaleAwarePlanEntry[];
  /** Final levels after the same bypass-cleanup the real flow's post-hoc sweep does. */
  endLevels: Record<string, number>;
  /** Scratch snapshot at that same final (post-cleanup) state — not used by this feature's own
   *  UI, but already carries offlineEarnings/elr/etc. for a future "current vs. post-purchase
   *  rate" comparison without needing to touch this function again. */
  endSnapshot: CalculationsSnapshot;
}

export interface SimpleBuyPlan {
  /** Purchase order, one entry per level bought (may repeat the same id for multi-level buys). */
  researchIds: string[];
  endLevels: Record<string, number>;
  endSnapshot: CalculationsSnapshot;
}

/**
 * Dry run of the sale-aware ROI buy flow ("70% Return", parameterized by `targetPercent` so other
 * thresholds remain possible) — mirrors `runSaleAwareBuyFlow` in ResearchActions.vue, but against
 * disposable scratch state instead of the live plan, so it can run reactively for a preview.
 * Re-derives sale state from the simulated clock via `isResearchSaleActive` at each step rather
 * than replicating the real flow's `insertWait`/`insertToggleSale` bookkeeping — that machinery
 * only writes real history records for the player to see later, it doesn't change which research
 * gets picked.
 *
 * Returns the plan `ResearchActions.vue`'s real handler executes directly (see its own comments) —
 * this function is the single source of truth for "what gets bought, in what order" for both the
 * preview and the real purchase.
 */
export function simulateSaleAwareBuy(
  researchLevels: Record<string, number>,
  snapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTime: number,
  researchSaleDeadline: number,
  nextSaleStart: number,
  roiMode: 'immediate' | 'maxed_vehicles',
  deliveryImpactOnly: boolean,
  targetPercent: number
): SaleAwareBuyPlan {
  let simState: EngineState = { ...createBaseEngineState(snapshot), researchLevels: { ...researchLevels } };
  let simSnapshot = snapshot;
  let simTime = absoluteSimTime;

  interface LogEntry {
    id: string;
    researchId: string;
    fromLevel: number;
    price: number;
    duringSale: boolean;
    purchaseTimestamp: number;
  }
  const log: LogEntry[] = [];
  let pending: (LogEntry & { timeToBuySeconds: number }) | undefined;

  const result = buyUntilRealSaleStarts(
    () => {
      const isSale = isResearchSaleActive(simTime);
      const ranked = rankResearchByROI(
        simState.researchLevels,
        simSnapshot,
        context,
        mods,
        isSale,
        simTime,
        researchSaleDeadline,
        roiMode,
        deliveryImpactOnly
      );
      const candidate = ranked.find(item =>
        meetsSaleAwareDeadline(
          {
            canBuy: item.canBuy,
            isMaxed: false,
            price: item.price,
            earningsDelta: item.earningsDelta,
            purchaseTimestamp: simTime + (item.timeToBuySeconds ?? 0),
            duringSale: item.duringSale,
          },
          nextSaleStart,
          targetPercent
        )
      );
      if (!candidate) return undefined;

      const timeToBuySeconds = candidate.timeToBuySeconds ?? 0;
      const purchaseTimestamp = simTime + timeToBuySeconds;
      pending = {
        id: String(log.length),
        researchId: candidate.research.id,
        fromLevel: simState.researchLevels[candidate.research.id] || 0,
        price: candidate.price,
        duringSale: candidate.duringSale,
        purchaseTimestamp,
        timeToBuySeconds,
      };
      return {
        researchId: pending.researchId,
        duringSale: pending.duringSale,
        purchaseTimestamp: pending.purchaseTimestamp,
      };
    },
    researchId => {
      if (!pending || pending.researchId !== researchId) return false;
      simState = applyAction(simState, buyResearchAction(researchId, pending.fromLevel, pending.price));
      simState = applyTime(simState, pending.timeToBuySeconds, simSnapshot);
      simTime += pending.timeToBuySeconds;
      simSnapshot = computeSnapshot(simState, context);
      log.push(pending);
      return true;
    },
    () => simTime >= nextSaleStart,
    () => log[log.length - 1]?.id,
    MAX_SIMULATED_PURCHASES
  );

  // Same rule the real flow's post-hoc sweep applies via `executeUndo`: a purchase that only
  // passed via the `duringSale` bypass AND landed at-or-after the target deadline gets reverted.
  const revertIds = new Set(
    result.duringSalePurchases.filter(p => p.purchaseTimestamp >= nextSaleStart).map(p => p.actionId)
  );
  let cleanState = simState;
  for (let i = log.length - 1; i >= 0; i--) {
    const entry = log[i];
    if (revertIds.has(entry.id)) {
      cleanState = {
        ...cleanState,
        researchLevels: { ...cleanState.researchLevels, [entry.researchId]: entry.fromLevel },
        bankValue: (cleanState.bankValue || 0) + entry.price,
      };
    }
  }
  const endSnapshot = computeSnapshot(cleanState, context);

  return {
    entries: log.map(e => ({
      researchId: e.researchId,
      duringSale: e.duringSale,
      purchaseTimestamp: e.purchaseTimestamp,
    })),
    endLevels: cleanState.researchLevels,
    endSnapshot,
  };
}

export interface EarningsPreludePurchase {
  researchId: string;
  price: number;
  waitSeconds: number;
  purchaseTimestamp: number;
}

/** One point along an earnings-prelude purchase sequence — `purchases` is every earnings research
 *  bought so far to reach this point, in order (empty for the starting checkpoint at index 0). */
export interface EarningsPreludeCheckpoint {
  purchases: EarningsPreludePurchase[];
  researchLevels: Record<string, number>;
  snapshot: CalculationsSnapshot;
  simTime: number;
}

/**
 * Simulates buying earnings research, best-ROI-first, for as long as each purchase can still earn
 * back 100% of its own price before `researchSaleDeadline` — the end of the CURRENTLY ACTIVE
 * research sale, not the next sale start (unlike `simulateSaleAwareBuy`'s 70% Return plan, which
 * targets the next sale). Always ranks across every research category in 'immediate' ROI mode,
 * regardless of the Smart Buy tab's own `deliveryImpactOnly`/`roiMode` settings — deciding what
 * earnings research is worth buying before switching to delivery research this sale is a distinct
 * question from that button's, with its own fixed answer, not something meant to follow whatever
 * the tab happens to be configured for.
 *
 * Deliberately does NOT use `meetsSaleAwareDeadline`'s during-sale bypass. That bypass exists so the
 * 70% Return button buys through an already-active sale at its real discount without also
 * demanding it clears the ROI bar (missing the discount, not the ROI bar, is the real cost there).
 * This function only ever runs while a sale is active (see `simulateSaleEndsBuy`'s own gating), so
 * reusing that bypass here would let nearly every candidate through regardless of ROI and defeat the
 * point of this function entirely — a plain `meetsROIByDeadline` check is used instead.
 *
 * Returns every intermediate checkpoint (one per prefix of the purchase sequence, including the
 * empty prefix at index 0) rather than just the final state, so callers can evaluate "what if I
 * stopped buying earnings research k purchases early" without re-simulating this loop from scratch
 * for each k — see `simulateSaleEndsBuy`'s trim search below, the first consumer. Exported so other
 * flows can reuse this same "which earnings research pays for itself before X" simulation with their
 * own start state/deadline.
 */
export function simulateEarningsPreludeForSaleEnd(
  researchLevels: Record<string, number>,
  snapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTime: number,
  researchSaleDeadline: number,
  maxIterations: number = MAX_PRELUDE_PURCHASES
): EarningsPreludeCheckpoint[] {
  let simState: EngineState = { ...createBaseEngineState(snapshot), researchLevels: { ...researchLevels } };
  let simSnapshot = snapshot;
  let simTime = absoluteSimTime;

  const checkpoints: EarningsPreludeCheckpoint[] = [
    { purchases: [], researchLevels: simState.researchLevels, snapshot: simSnapshot, simTime },
  ];

  for (let i = 0; i < maxIterations && simTime < researchSaleDeadline; i++) {
    const isSale = isResearchSaleActive(simTime);
    const ranked = rankResearchByROI(
      simState.researchLevels,
      simSnapshot,
      context,
      mods,
      isSale,
      simTime,
      researchSaleDeadline,
      'immediate',
      false
    );
    const candidate = ranked.find(item => {
      if (!item.canBuy || item.earningsDelta === undefined || item.timeToBuySeconds === undefined) return false;
      return meetsROIByDeadline(
        item.earningsDelta,
        item.price,
        simTime + item.timeToBuySeconds,
        researchSaleDeadline,
        100
      );
    });
    if (!candidate) break;

    const waitSeconds = candidate.timeToBuySeconds ?? 0;
    const level = simState.researchLevels[candidate.research.id] || 0;

    simState = applyAction(simState, buyResearchAction(candidate.research.id, level, candidate.price));
    simState = applyTime(simState, waitSeconds, simSnapshot);
    simTime += waitSeconds;
    simSnapshot = computeSnapshot(simState, context);

    checkpoints.push({
      purchases: [
        ...checkpoints[checkpoints.length - 1].purchases,
        { researchId: candidate.research.id, price: candidate.price, waitSeconds, purchaseTimestamp: simTime },
      ],
      researchLevels: simState.researchLevels,
      snapshot: simSnapshot,
      simTime,
    });
  }

  return checkpoints;
}

export interface DeliveryPurchase {
  researchId: string;
  purchaseTimestamp: number;
}

export interface DeliveryLoopResult {
  purchases: DeliveryPurchase[];
  endLevels: Record<string, number>;
  endSnapshot: CalculationsSnapshot;
}

/**
 * Simulates buying delivery-impact research, best-impact-first (`rankResearchByELRImpact`), from
 * `researchLevels`/`snapshot`/`absoluteSimTime` until nothing more can finish before
 * `researchSaleDeadline`. Generalized out of what used to be `simulateSaleEndsBuy`'s own inline loop
 * so it can be re-run from any starting point — `simulateSaleEndsBuy`'s trim search below re-runs it
 * from several different earnings-prelude checkpoints, but it's exported for any other caller that
 * wants the same "buy delivery research until a deadline" simulation from its own start state.
 *
 * `fixedArtifactFamilies`, when passed, is threaded straight through to every
 * `rankResearchByELRImpact` call this loop makes (one per purchase decision) — see that function's
 * own doc comment and `getOptimalELRSet`'s (lib/artifacts/virtue.ts) for what it does and why it's
 * safe. Optional and backward-compatible: omitted, this loop's existing callers (auto/shifts/c3.ts,
 * the manual planner's "Buy Until Sale Ends" preview) get identical behavior to before.
 */
export function runDeliveryBuyLoop(
  researchLevels: Record<string, number>,
  snapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTime: number,
  researchSaleDeadline: number,
  elrViewMode: 'realistic' | 'potential',
  elrSortMode: 'efficiency' | 'impact',
  rawBackup: ei.IBackup | null | undefined,
  maxIterations: number = MAX_SIMULATED_PURCHASES,
  fixedArtifactFamilies?: string[]
): DeliveryLoopResult {
  let simState: EngineState = { ...createBaseEngineState(snapshot), researchLevels: { ...researchLevels } };
  let simSnapshot = snapshot;
  let simTime = absoluteSimTime;
  const purchases: DeliveryPurchase[] = [];

  buyWhilePassingCheck(
    () => {
      const isSale = isResearchSaleActive(simTime);
      const ranked = rankResearchByELRImpact(
        simState.researchLevels,
        rawBackup,
        simSnapshot,
        context,
        mods,
        isSale,
        simTime,
        researchSaleDeadline,
        elrViewMode,
        elrSortMode,
        fixedArtifactFamilies
      );
      const candidate = ranked.find(item => item.canBuy && !item.showDeadlineWarning);
      return candidate ? { researchId: candidate.research.id } : undefined;
    },
    researchId => {
      const research = getResearchById(researchId);
      if (!research) return false;
      const level = simState.researchLevels[researchId] || 0;
      const isSale = isResearchSaleActive(simTime);
      const transitions = boostTransitionsFrom(simSnapshot, simTime);
      const purchase = getSaleAwareTimeToSave(research, level, mods, isSale, simTime, simSnapshot, transitions);
      simState = applyAction(simState, buyResearchAction(researchId, level, purchase.price));
      simState = applyTime(simState, purchase.waitSeconds, simSnapshot);
      simTime += purchase.waitSeconds;
      simSnapshot = computeSnapshot(simState, context);
      purchases.push({ researchId, purchaseTimestamp: simTime });
      return true;
    },
    maxIterations
  );

  return { purchases, endLevels: simState.researchLevels, endSnapshot: simSnapshot };
}

/** Whether every research/level pair in `target` has been reached in `endLevels`. */
function achievesTarget(endLevels: Record<string, number>, target: Map<string, number>): boolean {
  for (const [researchId, level] of target) {
    if ((endLevels[researchId] || 0) < level) return false;
  }
  return true;
}

/**
 * Walks `run`'s purchases in order, starting from `startLevels`, and returns the timestamp at which
 * every entry in `target` first becomes simultaneously satisfied — i.e. when the run has finished
 * buying (at least) the target set, which may be earlier than when the run itself stops (it can keep
 * buying further research afterward with whatever budget/time is left). Assumes
 * `achievesTarget(run.endLevels, target)` is already true and `target` is non-empty; the caller
 * (`simulateSaleEndsBuy`) checks both before calling this.
 */
function findTargetCompletionTime(
  run: DeliveryLoopResult,
  target: Map<string, number>,
  startLevels: Record<string, number>
): number {
  const levels = { ...startLevels };
  const remaining = new Map(target);
  for (const p of run.purchases) {
    levels[p.researchId] = (levels[p.researchId] || 0) + 1;
    const targetLevel = remaining.get(p.researchId);
    if (targetLevel !== undefined && levels[p.researchId] >= targetLevel) {
      remaining.delete(p.researchId);
    }
    if (remaining.size === 0) return p.purchaseTimestamp;
  }
  return Infinity;
}

export interface SaleEndsPlan extends SimpleBuyPlan {
  /** Just the earnings-prelude portion of `researchIds`, in purchase order. */
  earningsResearchIds: string[];
  /** Just the delivery portion of `researchIds`, in purchase order. */
  deliveryResearchIds: string[];
  /** Levels right after the earnings-prelude portion, before any delivery research is bought — the
   *  midpoint between the plan's start levels and `endLevels`. Lets a caller show the earnings and
   *  delivery portions of the plan as two separate before/after summaries instead of one combined
   *  diff. */
  earningsEndLevels: Record<string, number>;
  /** Snapshot at that same midpoint — carries `offlineEarnings`/etc. for a "current vs.
   *  post-earnings-prelude rate" comparison, same idea as `SaleAwareBuyPlan.endSnapshot`'s doc
   *  comment. */
  earningsEndSnapshot: CalculationsSnapshot;
}

/**
 * Dry run of the Delivery Impact "Buy Until Sale Ends" flow — mirrors `handleBuyUntilSaleDeadline`.
 * No cleanup sweep needed (the real handler doesn't do one either).
 *
 * Buying delivery research directly, from today's levels, isn't actually the fastest way to
 * maximize delivery research bought before the sale ends: spending part of the sale on earnings
 * research first raises the earn rate for the rest of the window, which can let MORE delivery
 * research get bought by the deadline than skipping straight to it — but only up to a point, since
 * every second spent buying earnings research is a second not spent buying delivery research
 * directly. This runs a full earnings-research prelude
 * (`simulateEarningsPreludeForSaleEnd` — up to 100% ROI by the sale's end), simulates the delivery
 * research that unlocks (the target set `D`), then trims purchases off the END of that prelude one
 * at a time — keeping each trim only if the resulting plan still buys all of `D` AND finishes buying
 * it strictly sooner than the previous (untrimmed-further) iteration did — stopping, and rolling back
 * one step, at the first trim that loses a target purchase or doesn't finish sooner. This greedy
 * trim isn't an exhaustive search of every possible prelude length, but it never ends up worse than
 * skipping the prelude entirely (`n = 0`, i.e. no earnings research clears the ROI bar, degenerates
 * to the old direct-delivery-only behavior), and the final delivery run is left free to keep buying
 * past `D` with whatever time/budget remains — so the result can end up buying the same delivery
 * research as the untrimmed prelude, or more, never less.
 */
export function simulateSaleEndsBuy(
  researchLevels: Record<string, number>,
  snapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  absoluteSimTime: number,
  researchSaleDeadline: number,
  elrViewMode: 'realistic' | 'potential',
  elrSortMode: 'efficiency' | 'impact',
  rawBackup: ei.IBackup | null | undefined
): SaleEndsPlan {
  const checkpoints = simulateEarningsPreludeForSaleEnd(
    researchLevels,
    snapshot,
    context,
    mods,
    absoluteSimTime,
    researchSaleDeadline
  );
  const n = checkpoints.length - 1;

  const runDeliveryFromCheckpoint = (k: number) =>
    runDeliveryBuyLoop(
      checkpoints[k].researchLevels,
      checkpoints[k].snapshot,
      context,
      mods,
      checkpoints[k].simTime,
      researchSaleDeadline,
      elrViewMode,
      elrSortMode,
      rawBackup
    );

  let bestK = n;
  let bestRun = runDeliveryFromCheckpoint(n);

  // The target set D: every research this baseline (full prelude) run bought, at the level it
  // ended up at. Fixed once, up front — every trimmed iteration below is judged against this same
  // set, not whatever it happens to buy itself.
  const target = new Map<string, number>();
  for (const p of bestRun.purchases) {
    target.set(p.researchId, bestRun.endLevels[p.researchId]);
  }

  let bestCompletionTime =
    target.size === 0
      ? checkpoints[n].simTime
      : findTargetCompletionTime(bestRun, target, checkpoints[n].researchLevels);

  for (let k = n - 1; k >= 0; k--) {
    const run = runDeliveryFromCheckpoint(k);
    if (!achievesTarget(run.endLevels, target)) break;
    const completionTime =
      target.size === 0 ? checkpoints[k].simTime : findTargetCompletionTime(run, target, checkpoints[k].researchLevels);
    if (!(completionTime < bestCompletionTime)) break;
    bestK = k;
    bestRun = run;
    bestCompletionTime = completionTime;
  }

  const earningsResearchIds = checkpoints[bestK].purchases.map(p => p.researchId);
  const deliveryResearchIds = bestRun.purchases.map(p => p.researchId);

  return {
    researchIds: [...earningsResearchIds, ...deliveryResearchIds],
    earningsResearchIds,
    deliveryResearchIds,
    earningsEndLevels: checkpoints[bestK].researchLevels,
    earningsEndSnapshot: checkpoints[bestK].snapshot,
    endLevels: bestRun.endLevels,
    endSnapshot: bestRun.endSnapshot,
  };
}

/**
 * Dry run of the threshold-based buy flow shared by Quick Buy's one-time click and Auto Buy's
 * background sweep — mirrors `handleThresholdBuy`. Never simulates a wait (matches Quick Buy/Auto
 * Buy's real "buy instantly at today's price" behavior) — just repeatedly buys whatever's already
 * affordable within `thresholdSeconds` until nothing else qualifies.
 */
export function simulateThresholdBuy(
  researchLevels: Record<string, number>,
  snapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  isSale: boolean,
  thresholdSeconds: number
): SimpleBuyPlan {
  let simState: EngineState = { ...createBaseEngineState(snapshot), researchLevels: { ...researchLevels } };
  let simSnapshot = snapshot;
  const researchIds: string[] = [];

  for (let i = 0; i < MAX_SIMULATED_PURCHASES; i++) {
    const candidate = findSmartBuyCandidate(simState.researchLevels, mods, isSale, simSnapshot, thresholdSeconds);
    if (!candidate) break;
    const level = simState.researchLevels[candidate.research.id] || 0;
    simState = applyAction(simState, buyResearchAction(candidate.research.id, level, candidate.price));
    simSnapshot = computeSnapshot(simState, context);
    researchIds.push(candidate.research.id);
  }

  return { researchIds, endLevels: simState.researchLevels, endSnapshot: simSnapshot };
}

export interface ResearchSummaryItem {
  text: string;
  premium?: boolean;
}

/**
 * Compact "what changed" summary in `CuriositySummary.vue`'s visual language (contiguous
 * maxed-tier ranges collapse to "Max Tier(s) X(-Y)", everything else reads as "Name (start -> end)"
 * or "Max Name") — a trimmed, non-Vue port of that component's grouping algorithm, driven by two
 * plain level maps instead of an executed `Action[]` list (so it works for a hypothetical plan, not
 * just real history) and without the action-id/click-to-scroll behavior (nothing to scroll to for a
 * purchase that hasn't happened).
 */
export function summarizeResearchLevelChanges(
  startLevels: Record<string, number>,
  endLevels: Record<string, number>
): ResearchSummaryItem[] {
  const items: ResearchSummaryItem[] = [];

  const modifiedResearchIds = new Set<string>();
  const modifiedTiers = new Set<number>();
  for (const r of getCommonResearches()) {
    const start = startLevels[r.id] || 0;
    const end = endLevels[r.id] || 0;
    if (end > start) {
      modifiedResearchIds.add(r.id);
      modifiedTiers.add(r.tier);
    }
  }
  if (modifiedResearchIds.size === 0) return [];

  const maxedTiers: number[] = [];
  const handledResearchIds = new Set<string>();
  const researchByTier = getResearchByTier();
  const sortedModifiedTiers = Array.from(modifiedTiers).sort((a, b) => a - b);

  for (const tier of sortedModifiedTiers) {
    const tierResearches = researchByTier.get(tier) || [];
    const isTierMaxed = tierResearches.every(r => (endLevels[r.id] || 0) >= r.levels);
    if (isTierMaxed) {
      maxedTiers.push(tier);
      tierResearches.forEach(r => handledResearchIds.add(r.id));
    }
  }

  if (maxedTiers.length > 0) {
    let rangeStart = maxedTiers[0];
    let prev = maxedTiers[0];
    for (let i = 1; i <= maxedTiers.length; i++) {
      const curr = maxedTiers[i];
      if (curr === prev + 1) {
        prev = curr;
      } else {
        items.push({
          premium: true,
          text: rangeStart === prev ? `Max Tier ${rangeStart}` : `Max Tiers ${rangeStart}-${prev}`,
        });
        rangeStart = curr;
        prev = curr;
      }
    }
  }

  const remaining = Array.from(modifiedResearchIds)
    .filter(id => !handledResearchIds.has(id))
    .map(id => getResearchById(id)!)
    .sort((a, b) => a.serial_id - b.serial_id);

  for (const r of remaining) {
    const startLevel = startLevels[r.id] || 0;
    const finalLevel = endLevels[r.id] || 0;
    if (startLevel >= finalLevel) continue;
    const isMaxed = finalLevel >= r.levels;
    items.push({
      text: isMaxed ? `Max ${r.name}` : `${r.name} (${startLevel} -> ${finalLevel})`,
    });
  }

  return items;
}

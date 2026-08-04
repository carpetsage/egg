import { type ResearchCostModifiers, getCommonResearches, getResearchById, getResearchByTier } from './commonResearch';
import {
  rankResearchByROI,
  rankResearchByELRImpact,
  buyWhilePassingCheck,
  buyUntilRealSaleStarts,
} from './researchRanking';
import { meetsSaleAwareDeadline, getSaleAwareTimeToSave } from './researchROI';
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
const MAX_SIMULATED_PURCHASES = 2000;

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
 * Dry run of the sale-aware ROI buy flow ("70% Return" / "100% Return") — mirrors
 * `runSaleAwareBuyFlow` in ResearchActions.vue, but against disposable scratch state instead of
 * the live plan, so it can run reactively for a preview. Re-derives sale state from the simulated
 * clock via `isResearchSaleActive` at each step rather than replicating the real flow's
 * `insertWait`/`insertToggleSale` bookkeeping — that machinery only writes real history records
 * for the player to see later, it doesn't change which research gets picked.
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

/**
 * Dry run of the Delivery Impact "Buy Until Sale Ends" flow — mirrors `handleBuyUntilSaleDeadline`.
 * No cleanup sweep needed (the real handler doesn't do one either).
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
): SimpleBuyPlan {
  let simState: EngineState = { ...createBaseEngineState(snapshot), researchLevels: { ...researchLevels } };
  let simSnapshot = snapshot;
  let simTime = absoluteSimTime;
  const researchIds: string[] = [];

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
        elrSortMode
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
      researchIds.push(researchId);
      return true;
    },
    MAX_SIMULATED_PURCHASES
  );

  return { researchIds, endLevels: simState.researchLevels, endSnapshot: simSnapshot };
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

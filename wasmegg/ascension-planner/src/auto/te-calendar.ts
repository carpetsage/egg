import type { Action } from '@/types/actions/meta';
import type { VirtueEgg } from '@/types/actions/virtue';
import { countTEThresholdsPassed, getThresholdForTE, MAX_TOTAL_TE } from '@/lib/truthEggs';
import { distributeTargetTE } from './shifts/te-wait';
import type { AscensionSummary } from './types';

export type PlanVariantLabel = 'continue' | '1-sale' | '2-sale';

export interface TECalendarEntry {
  type: 'start' | 'end' | 'te' | 'crossover' | 'shift';
  timestamp: number; // Unix seconds
  te?: number; // global TE rank (1-490), for 'te' and 'crossover'
  gapSeconds?: number; // time since the previous 'te' entry, filled in by buildAscensionCalendar (Step 1.3)
  isProjected: boolean; // false = within the ascension's real configured target
  fromVariant?: PlanVariantLabel; // 'crossover' only: which plan was winning before
  toVariant?: PlanVariantLabel; // 'crossover' only: which plan takes over
  shiftLabel?: string; // 'shift' only: e.g. "K3 Shift"
  shiftEgg?: VirtueEgg; // 'shift' only: which egg this shift lands on
}

const ALL_EGGS: VirtueEgg[] = ['curiosity', 'integrity', 'resilience', 'humility', 'kindness'];

// Only the 5 TE-earning shifts (the back half of the 13-shift template) are shown —
// the 8 build-phase shifts (C1...H1) are buying research/vehicles, not waiting for
// TE, and aren't what this calendar is about.
const TE_WAIT_SHIFT_TITLES = ['K3 Shift', 'C4 Shift', 'I2 Shift', 'R2 Shift', 'H2 Shift'];

// True if, scanning forward from `fromIdx`, a `'wait_for_te'` action is reached
// before any other `'shift'` action — i.e. this shift leads into a TE-wait with only
// non-shift actions (like K3's hyperloop purchases) possibly in between, as opposed
// to a build-phase shift that leads into more build-phase shifts before any wait.
function leadsToWait(actions: Action[], fromIdx: number): boolean {
  for (let j = fromIdx + 1; j < actions.length; j++) {
    if (actions[j].type === 'wait_for_te') return true;
    if (actions[j].type === 'shift') return false;
  }
  return false;
}

/**
 * Walks a real, already-simulated action list and emits one TECalendarEntry for each
 * of the 5 TE-earning shifts (K3, C4, I2, R2, H2) — identified as a `'shift'` action
 * that *eventually* leads into a `'wait_for_te'` action (see `leadsToWait`), not just
 * counting every `'shift'` action in order. That distinction matters: K3 specifically
 * buys hyperloop cars *before* its wait begins, so its shift action is not the very
 * next one — checking only the immediate next action would skip K3 entirely and
 * mislabel C4's shift as "K3" instead (shifting every label down by one).
 *
 * The timestamp recorded is the *start* of the shift, not its end: shifts are always
 * instant (`totalTimeSeconds: 0`), so "start" is just the running clock value at the
 * moment this action is reached in the walk — i.e. the instant after whatever
 * preceded it finished, before any purchases or the `wait_for_te` that follows even
 * begin.
 *
 * Deliberately only ever called with the *active* result's actions (see
 * `buildAscensionCalendar`) — shifts are real, concrete events tied to whichever
 * plan is actually configured, not something every candidate independently has its
 * own version of worth displaying.
 */
export function walkActionsForShifts(actions: Action[], startTimestamp: number): TECalendarEntry[] {
  const entries: TECalendarEntry[] = [];
  let currentTimestamp = startTimestamp;
  let waitShiftIndex = 0;

  for (let idx = 0; idx < actions.length; idx++) {
    const action = actions[idx];

    if (action.type === 'shift' && leadsToWait(actions, idx)) {
      const toEgg = action.payload.toEgg;
      const label = TE_WAIT_SHIFT_TITLES[waitShiftIndex] ?? `${toEgg.charAt(0).toUpperCase()}${toEgg.slice(1)} Shift`;
      entries.push({
        type: 'shift',
        timestamp: currentTimestamp,
        isProjected: false,
        shiftLabel: label,
        shiftEgg: toEgg,
      });
      waitShiftIndex++;
    }
    currentTimestamp += action.totalTimeSeconds || 0;
  }

  return entries;
}

/**
 * Walks a real, already-simulated action list and emits one TECalendarEntry per
 * individual global TE earned (1-98 per egg, summed across all 5 eggs).
 *
 * Eggs accumulate continuously for whichever egg is `endState.currentEgg` during an
 * action, at a rate constant for that single action (the engine always runs with
 * `skipGrowth: true`, so within one action eggsDelivered grows linearly in time).
 * That means the exact moment a threshold is crossed inside an action can be found
 * by linear interpolation between the action's start and end eggsDelivered for that egg.
 */
export function walkActionsForTECrossings(
  actions: Action[],
  startEggsDelivered: Record<VirtueEgg, number>,
  startTimestamp: number
): TECalendarEntry[] {
  const eggsDelivered: Record<VirtueEgg, number> = { ...startEggsDelivered };
  const teByEgg: Record<VirtueEgg, number> = {} as Record<VirtueEgg, number>;
  for (const egg of ALL_EGGS) {
    teByEgg[egg] = countTEThresholdsPassed(eggsDelivered[egg] || 0);
  }

  const entries: TECalendarEntry[] = [];
  let currentTimestamp = startTimestamp;

  for (const action of actions) {
    const duration = action.totalTimeSeconds || 0;
    const egg = action.endState?.currentEgg;

    if (egg && duration > 0) {
      const before = eggsDelivered[egg] || 0;
      const after = action.endState.eggsDelivered?.[egg] ?? before;

      if (after > before) {
        const rate = (after - before) / duration;
        const beforeTE = teByEgg[egg];
        const afterTE = countTEThresholdsPassed(after);

        for (let n = beforeTE + 1; n <= afterTE; n++) {
          const thresholdEggs = getThresholdForTE(n);
          const offsetSeconds = (thresholdEggs - before) / rate;
          teByEgg[egg] = n;
          const globalTE = ALL_EGGS.reduce((sum, e) => sum + teByEgg[e], 0);
          entries.push({
            type: 'te',
            timestamp: currentTimestamp + offsetSeconds,
            te: globalTE,
            isProjected: false,
          });
        }

        eggsDelivered[egg] = after;
      }
    }

    currentTimestamp += duration;
  }

  return entries;
}

/**
 * Continues a timeline past an ascension's real configured target, all the way to
 * TE 490, assuming the settled post-build ELR holds constant. Each step picks
 * whichever egg has the cheapest next threshold — the same greedy "equalize TE
 * across eggs" rule `distributeTargetTE` already uses for the real plan, reused
 * directly here so the two never drift apart. This is the time-optimal
 * continuation (cheapest-next-threshold greedy minimizes elapsed time to reach
 * any given global TE total), matching this tool's "fastest possible" philosophy
 * rather than literally replaying the real big-block-per-egg shift order.
 */
export function extendTEProjection(
  fromEggsDelivered: Record<VirtueEgg, number>,
  elrPerSecond: number,
  fromTimestamp: number,
  fromGlobalTE: number
): TECalendarEntry[] {
  if (elrPerSecond <= 0 || fromGlobalTE >= MAX_TOTAL_TE) return [];

  const eggsDelivered: Record<VirtueEgg, number> = { ...fromEggsDelivered };
  let teByEgg: Record<VirtueEgg, number> = {} as Record<VirtueEgg, number>;
  for (const egg of ALL_EGGS) {
    teByEgg[egg] = countTEThresholdsPassed(eggsDelivered[egg] || 0);
  }

  const entries: TECalendarEntry[] = [];
  let currentTimestamp = fromTimestamp;
  let globalTE = fromGlobalTE;

  while (globalTE < MAX_TOTAL_TE) {
    const nextDistribution = distributeTargetTE(teByEgg, globalTE + 1);
    const egg = ALL_EGGS.find(e => nextDistribution[e] !== teByEgg[e]);
    if (!egg) break; // shouldn't happen unless every egg is already at its 98 cap

    const before = eggsDelivered[egg] || 0;
    const threshold = getThresholdForTE(nextDistribution[egg]);
    const waitSeconds = (threshold - before) / elrPerSecond;

    currentTimestamp += waitSeconds;
    eggsDelivered[egg] = threshold;
    teByEgg = nextDistribution;
    globalTE++;

    entries.push({
      type: 'te',
      timestamp: currentTimestamp,
      te: globalTE,
      isProjected: true,
    });
  }

  return entries;
}

/**
 * Builds one candidate plan's full TE timeline for a single ascension: real
 * crossings up to its configured target (Step 1.1), then projected forward to
 * TE 490 at its settled post-build ELR (Step 1.2). `realTargetTE: null` means
 * this candidate already targets 490 for real (the forced-490 ascension) — no
 * projection needed, Step 1.1's output already covers the full range.
 *
 * `startEggsDelivered` is the same for every candidate of a given ascension —
 * they're alternate strategies (continue/1-sale/2-sale) from one identical
 * starting point, not independent starting states.
 */
export function buildCandidateTimeline(
  ascensionStartTimestamp: number,
  result: { summary: AscensionSummary; actions: Action[] },
  realTargetTE: number | null,
  startEggsDelivered: Record<VirtueEgg, number>
): TECalendarEntry[] {
  const realEntries = walkActionsForTECrossings(result.actions, startEggsDelivered, ascensionStartTimestamp);

  if (realTargetTE == null || realTargetTE >= MAX_TOTAL_TE) {
    return realEntries;
  }

  const lastReal = realEntries[realEntries.length - 1];
  const fromTimestamp = lastReal ? lastReal.timestamp : ascensionStartTimestamp;
  const startGlobalTE = ALL_EGGS.reduce((sum, e) => sum + countTEThresholdsPassed(startEggsDelivered[e] || 0), 0);
  const fromGlobalTE = lastReal ? lastReal.te! : startGlobalTE;

  // result.summary.eggsDelivered is already this candidate's real end-of-ascension
  // lifetime eggsDelivered per egg (the same field the next real ascension would
  // inherit as its own startEggsDelivered) — no need to re-derive it by hand.
  const projectedEntries = extendTEProjection(
    result.summary.eggsDelivered,
    result.summary.maxELR,
    fromTimestamp,
    fromGlobalTE
  );

  return [...realEntries, ...projectedEntries];
}

/**
 * Builds the full calendar for one ascension card: the optimal (fastest-at-every-
 * TE-rank) composite across all its candidate plans, plus start/end markers and a
 * crossover marker wherever the winning candidate changes.
 *
 * `candidates` is every plan available for this ascension, in upgrade order —
 * `[1-sale, 2-sale]` for every ascension except A1, which is `[continue, 1-sale,
 * 2-sale]` when `result3` was actually computed (see `result3Available`/
 * `result3SkippedReason` on the chain entry).
 *
 * Implemented as a forward-only scan rather than literally comparing all candidates
 * at every rank, but it computes the same thing: at each step it checks the *current*
 * candidate against the best of every *remaining* one (not just the immediate next),
 * and jumps straight to whichever remaining candidate is winning. That "jump past a
 * middle tier" matters in practice — e.g. 1-sale can easily be dominated by *both*
 * `continue` and 2-sale for every single TE rank (never the single fastest option
 * anywhere), in which case the only real crossover is continue→2-sale directly, and
 * a version of this that only ever compares "current vs next" gets stuck forever
 * checking continue-vs-1-sale and never notices 2-sale at all. The forward-only scan
 * is valid (equivalent to a true global minimum, not an approximation of one) because
 * none of these candidates' timelines ever cross back the other way once one overtakes
 * another — each settles into a constant rate, so a higher-rate one that's pulled
 * ahead stays ahead.
 */
export function buildAscensionCalendar(
  ascensionStartTimestamp: number,
  activeResult: { summary: AscensionSummary; actions: Action[] },
  realTargetTE: number | null,
  startEggsDelivered: Record<VirtueEgg, number>,
  candidates: { variant: PlanVariantLabel; result: { summary: AscensionSummary; actions: Action[] } }[]
): { entries: TECalendarEntry[] } {
  const candidateTimelines = candidates.map(c => ({
    variant: c.variant,
    timeline: buildCandidateTimeline(ascensionStartTimestamp, c.result, realTargetTE, startEggsDelivered),
  }));

  const entries: TECalendarEntry[] = [{ type: 'start', timestamp: ascensionStartTimestamp, isProjected: false }];

  const length = Math.max(...candidateTimelines.map(c => c.timeline.length));

  // TEMP DEBUG — remove once crossover behavior is confirmed against real data.
  // One row per TE rank: days-since-ascension-start AND the absolute date/time for
  // each candidate (raw, before the forward-scan/clamp below does anything), plus an
  // independently-computed "winner" column so you can eyeball whether 1-sale is ever
  // actually the smallest. Keyed by an object (not an array) so console.table's
  // leftmost index column shows the *real* TE number (whatever you're starting from)
  // instead of a meaningless 0,1,2... row counter.
  if (candidateTimelines.length > 1) {
    const debugRows: Record<string, Record<string, string>> = {};
    for (let i = 0; i < length; i++) {
      const teValue = candidateTimelines.map(c => c.timeline[i]?.te).find(v => v !== undefined);
      if (teValue === undefined) continue;

      const row: Record<string, string> = {};
      let winner = '';
      let winnerTs: number | undefined;
      for (const c of candidateTimelines) {
        const ts = c.timeline[i]?.timestamp;
        row[`${c.variant} (+days)`] = ts !== undefined ? `${((ts - ascensionStartTimestamp) / 86400).toFixed(2)}d` : '—';
        row[`${c.variant} (date)`] = ts !== undefined ? new Date(ts * 1000).toLocaleString() : '—';
        if (ts !== undefined && (winnerTs === undefined || ts < winnerTs)) {
          winnerTs = ts;
          winner = c.variant;
        }
      }
      row.winner = winner;
      debugRows[`TE ${teValue}`] = row;
    }
    console.log(
      `[TE Calendar Debug] candidates: ${candidates.map(c => c.variant).join(', ')}, ascension start: ${new Date(ascensionStartTimestamp * 1000).toLocaleString()}`
    );
    console.table(debugRows);
  }

  let currentIdx = 0;

  // Belt-and-suspenders monotonicity clamp — the forward-only scan above is provably
  // non-decreasing for these candidates (see the doc comment), but this guards against
  // any real-data edge case (e.g. non-monotonic ELR during an unusual build phase)
  // that breaks that assumption, so the displayed sequence never visibly runs backward.
  let lastTimestamp = ascensionStartTimestamp;

  for (let i = 0; i < length; i++) {
    let bestIdx = currentIdx;
    let bestTs = candidateTimelines[currentIdx].timeline[i]?.timestamp;
    for (let j = currentIdx + 1; j < candidateTimelines.length; j++) {
      const ts = candidateTimelines[j].timeline[i]?.timestamp;
      if (ts !== undefined && (bestTs === undefined || ts < bestTs)) {
        bestTs = ts;
        bestIdx = j;
      }
    }

    if (bestIdx !== currentIdx) {
      const crossingEntry = candidateTimelines[bestIdx].timeline[i];
      const timestamp = Math.max(crossingEntry.timestamp, lastTimestamp);
      entries.push({
        type: 'crossover',
        timestamp,
        te: crossingEntry.te,
        isProjected: crossingEntry.isProjected,
        fromVariant: candidateTimelines[currentIdx].variant,
        toVariant: candidateTimelines[bestIdx].variant,
      });
      lastTimestamp = timestamp;
      currentIdx = bestIdx;
      continue;
    }

    const entry = candidateTimelines[currentIdx].timeline[i];
    if (!entry) continue;
    const timestamp = Math.max(entry.timestamp, lastTimestamp);
    entries.push({ ...entry, timestamp });
    lastTimestamp = timestamp;
  }

  // Shifts are real, concrete events from the active plan's own actions — never
  // simulated for the projected portion, per the same "real portion only" rule as
  // the 'end' marker — inserted by timestamp for the same reason (the composite
  // above may be "controlled" by a different candidate at that exact moment).
  for (const shiftEntry of walkActionsForShifts(activeResult.actions, ascensionStartTimestamp)) {
    const insertIndex = entries.findIndex(e => e.timestamp > shiftEntry.timestamp);
    if (insertIndex === -1) {
      entries.push(shiftEntry);
    } else {
      entries.splice(insertIndex, 0, shiftEntry);
    }
  }

  // The 'end' marker is the actually-configured plan's real stopping point, which
  // doesn't necessarily line up with wherever the sequential composite above happens
  // to be at that TE rank (e.g. the active variant might not be the one currently
  // "in control" of the composite) — so it's inserted by timestamp, not appended.
  if (realTargetTE != null) {
    const endEntry: TECalendarEntry = {
      type: 'end',
      timestamp: activeResult.summary.endTime,
      te: realTargetTE,
      isProjected: false,
    };
    const insertIndex = entries.findIndex(e => e.timestamp > endEntry.timestamp);
    if (insertIndex === -1) {
      entries.push(endEntry);
    } else {
      entries.splice(insertIndex, 0, endEntry);
    }
  }

  // Fill in gapSeconds (time since the previous 'te'/'crossover' entry) now that
  // the full ordered list — sequential composite, crossovers, start/end — is final.
  let lastTeTimestamp: number | null = null;
  for (const entry of entries) {
    if (entry.type === 'te' || entry.type === 'crossover') {
      if (lastTeTimestamp !== null) {
        entry.gapSeconds = entry.timestamp - lastTeTimestamp;
      }
      lastTeTimestamp = entry.timestamp;
    }
  }

  return { entries };
}

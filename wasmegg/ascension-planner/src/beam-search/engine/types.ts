/**
 * Core types for the beam search research-purchase optimizer.
 *
 * See ../01-overview.md through ../05-design-decisions.md for the game-agnostic design, and
 * ../06-egg-codebase-integration.md for how it maps onto this codebase. In short: this engine is a
 * pure, Pinia-free client of the existing game simulation (engine/compute.ts, engine/apply/*,
 * calculations/*) — it never reimplements pricing, earnings, or tier-unlock rules, only searches
 * over *when* to invoke them.
 */
import type { EngineState, SimulationContext } from '@/engine/types';
import type { ArtifactSlotPayload, ArtifactSetName, VehicleSlot, ResearchLevels, VirtueEgg } from '@/types';

export type BeamPhase = 1 | 2;

/**
 * The subset of EngineState the beam search assumes is frozen for the entire Curiosity build
 * window (confirmed in ../06-egg-codebase-integration.md §8.1: hab/vehicle/artifact loadout don't
 * change while riding out Curiosity research sales). Passed once per run, never duplicated per
 * state — this is the "do not duplicate immutable game data" half of the design docs' state
 * representation guidance.
 */
export interface BeamFrozenContext {
  currentEgg: VirtueEgg;
  shiftCount: number;
  te: number;
  soulEggs: number;
  habIds: (number | null)[];
  vehicles: VehicleSlot[];
  siloCount: number;
  tankLevel: number;
  artifactLoadout: ArtifactSlotPayload[];
  activeArtifactSet: ArtifactSetName | null;
  artifactSets: Record<ArtifactSetName, ArtifactSlotPayload[] | null>;
}

/** A single ordinary research purchase — one level of one research, bought the moment it's affordable. */
export interface ResearchPurchaseEdge {
  kind: 'research';
  researchId: string;
  toLevel: number;
}

/**
 * Tier Unlock Macro result, per ../02-algorithm-specification.md. Carries its own ordered
 * sub-sequence (which research, in which order, `runTierUnlockMilestone` actually bought to cross
 * the threshold) rather than just a tag — see ../06-egg-codebase-integration.md §3 for why: the
 * "don't copy purchase histories" rule is about the *outer* per-purchase chain, not a single bounded
 * macro invocation, and this is what lets reconstruct.ts flatten a winning path with no separate
 * macro-expansion step. `researchIds` may repeat an id across multiple levels, matching the
 * `SimpleBuyPlan.researchIds` convention already used by calculations/smartBuyPreview.ts.
 */
export interface TierMacroEdge {
  kind: 'tierMacro';
  tier: number;
  researchIds: string[];
}

/**
 * Phase 3 Delivery Macro result — terminal, per the design docs. Also carries its own ordered
 * sub-sequence, plus the final score (`min(finalLayRate, finalShippingRate)` after realistic
 * post-deadline transformations — see engine/macros.ts).
 */
export interface Phase3MacroEdge {
  kind: 'phase3Macro';
  researchIds: string[];
  /** Research levels after the macro's own purchases — stored directly (rather than reconstructed
   *  by replaying `researchIds`) because BeamTerminalResult doesn't carry a full post-macro
   *  BeamSearchState (Phase 3 is terminal; see that type's doc comment), so reconstruct.ts needs
   *  this to report `endLevels`. */
  finalLevels: ResearchLevels;
  finalScore: number;
}

/** Phase 1 -> Phase 2 transition. Carries no purchase of its own. */
export interface PhaseTransitionEdge {
  kind: 'phaseTransition';
}

/**
 * "Nothing worth buying right now — skip straight to the next research sale" — search.ts's
 * fastForwardToSale, taken instead of a purchase whenever no candidate clears the 70%-by-next-sale
 * bar (see selectCandidates's doc comment for why that no longer falls back to buying something
 * weak). Carries no purchase of its own, same as PhaseTransitionEdge — reconstruct.ts records when
 * these happen (`saleWaitTimes`) but doesn't add anything to `researchIds`, since nothing was
 * bought.
 */
export interface WaitForSaleEdge {
  kind: 'waitForSale';
}

export type BeamPurchase =
  | ResearchPurchaseEdge
  | TierMacroEdge
  | Phase3MacroEdge
  | PhaseTransitionEdge
  | WaitForSaleEdge;

/**
 * Compact mutable search state. Deliberately does NOT carry its own absolute timestamp — every
 * other purchase-timing function in this codebase (getSaleAwareTimeToSave, isResearchSaleActive,
 * rankResearchByROI, ...) derives absoluteSimTime from `lastStepTime` + SimulationContext on demand
 * (see absoluteSimTimeOf below), and EngineState itself has no separate absolute-time field either
 * — storing both here would just be one more way for the two to drift apart.
 *
 * `parent` is a direct object reference, not an index into a flat array with an integer id. This
 * still satisfies the design docs' "store parent pointer + purchase, not a copied history array"
 * requirement (see ../03-performance-and-optimization.md), just via ordinary JS/GC semantics: once
 * a state is pruned and nothing else references it, it's garbage collected automatically — no
 * manual bookkeeping needed. Part 3 explicitly says to start with the simplest version that fits
 * memory; this is it.
 */
export interface BeamSearchState {
  parent: BeamSearchState | null;
  purchase: BeamPurchase | null;
  phase: BeamPhase;
  researchLevels: ResearchLevels;
  bankValue: number;
  population: number;
  lastStepTime: number;
  eggsDelivered: Record<VirtueEgg, number>;
  fuelTankAmounts: Record<VirtueEgg, number>;
  teEarned: Record<VirtueEgg, number>;
  activeSales: { research: boolean; hab: boolean; vehicle: boolean };
  earningsBoost: { active: boolean; multiplier: number };
}

/** A branch that has terminated via the Phase 3 macro. Phase 3 is terminal — per the design docs,
 *  it never returns to the beam, so these are collected separately from the active beam array. */
export interface BeamTerminalResult {
  /** The Phase 2 state the Phase 3 macro was invoked from — reconstruct.ts walks this state's
   *  parent chain, then appends `edge.researchIds` to get the full flat plan. */
  state: BeamSearchState;
  edge: Phase3MacroEdge;
  lastPurchaseTime: number;
}

export interface BeamSearchProgress {
  depth: number;
  beamSize: number;
  statesExpanded: number;
  duplicatesRemoved: number;
  tierMacroCalls: number;
  phase3MacroCalls: number;
  phase3CacheHits: number;
  bestScoreSoFar: number;
  elapsedMs: number;
  /** Cumulative count of every successor state produced (research purchases + tier-macro successes
   *  + phase transitions), before dedupe — i.e. the raw branching-out total. Diffing this against the
   *  previous progress message (see useBeamSearch.ts's generation-history derivation) gives "how many
   *  candidates did this generation actually generate", the first column of the diagnostics panel
   *  (../HANDOFF.md's tooling option #1). Cumulative, matching every other counter here, rather than
   *  per-generation — see their shared doc note on why (progress-message coalescing under the
   *  worker's throttle would otherwise make a "per generation" field lie). */
  candidatesGenerated: number;
  /** Cumulative count of `tierMacroCalls` that actually returned a successor (as opposed to `null` —
   *  unreachable before the deadline, see macros.ts's runTierMacro). Diffed the same way as
   *  candidatesGenerated to show "attempts vs. hits" per generation in the diagnostics panel. */
  tierMacroSuccesses: number;
  /** Cumulative count of `phase3MacroCalls` that actually produced a finished plan (as opposed to
   *  `null`). Same diffing convention as tierMacroSuccesses. */
  phase3MacroSuccesses: number;
  /** Cumulative count of complete plans found so far (`finished.length` at the time of this
   *  message) — every Phase 3 attempt that succeeded, not just the eventual winner. Not itself a
   *  diffed field (already legible as a running total on its own — "14 complete plans found by
   *  generation 40"), unlike the *Calls/*Successes counters above. */
  finishedCount: number;
}

export interface BeamSearchOptions {
  beamWidth: number;
  /** Absolute unix seconds — the Curiosity build-phase end the user picked. */
  deadline: number;
  onProgress?: (progress: BeamSearchProgress) => void;
  /** Safety-net cap on outer search decisions, same "guard rail, not a tuning knob" role
   *  MAX_SIMULATED_PURCHASES plays in calculations/smartBuyPreview.ts. */
  maxDepth?: number;
  /** Polled once per generation (see search.ts's runSearchLoop), not mid-generation — matching
   *  Phase B's worker plan (../HANDOFF.md), which only ever needs "stop before the next generation
   *  starts", not sub-generation interruption. When it starts returning true, the loop stops after
   *  finishing its current generation and returns whatever `finished` results it already has
   *  (possibly none) instead of continuing — same shape as a natural maxDepth/empty-beam stop, just
   *  earlier. `runBeamSearch` reports this via `BeamSearchResult.metrics.cancelled`.
   *
   *  Correctly implemented and unit-tested (engine/search.spec.ts) at this level — but note that the
   *  Web Worker caller (../../workers/beamSearch.worker.ts) currently can't actually flip this to
   *  true *while a run is busy*, since the whole call is one synchronous block on a single-threaded
   *  worker with no yield point for its own postMessage handler to run in the meantime. That's a
   *  Phase C integration gap (worked around there by terminating the worker instead), not a bug in
   *  this hook — see useBeamSearch.ts's `cancel()` for the full story and the follow-up that would
   *  close the gap (yielding once per generation here). */
  isCancelled?: () => boolean;
  /** Opt-in diagnostics (../HANDOFF.md's tooling option #2: "explain the winning plan"). When true:
   *  - `runSearchLoop` retains a per-generation snapshot of the (post-trim, earnings-ranked) beam,
   *    used afterward to build `BeamSearchResult.trace` — see WinningPathTrace's own doc comment for
   *    what that contains and why it's bounded (doesn't scale with beamWidth × generations in the
   *    *output*, even though the retained snapshots do — see that cost note there).
   *  - The Web Worker (beamSearch.worker.ts) also stops throttling `onProgress` posts for this run,
   *    so the diagnostics panel's generation-history table gets exactly one row per generation
   *    instead of occasionally coalescing a few together (see BeamSearchProgress's own doc note on
   *    why its counters are cumulative specifically to stay correct even when throttled — this flag
   *    is what removes the need for that fallback on a given run).
   *  Off by default: the retained snapshots are a real, if bounded and opt-in, memory cost (roughly
   *  beamWidth × generations small objects) not worth paying on every ordinary run. */
  trace?: boolean;
}

/** One beam member's summary, stripped of its live object identity/parent chain — used only in
 *  `WinningPathTrace`'s output, never as a stand-in for `BeamSearchState` elsewhere. Deliberately
 *  small and plain: this is what actually crosses the Worker postMessage boundary as part of
 *  `BeamSearchResult`, so (like everything else that does) it needs to already be plain, cloneable
 *  data — see workers/beamSearch.protocol.ts's `sanitizeLongsForWorker` doc comment for the general
 *  postMessage-safety lesson this follows. */
export interface BeamMemberSummary {
  /** What this member's own most recent purchase was — null only for the untouched initial state,
   *  which never appears in a trace step (see WinningPathTrace's doc comment). */
  purchase: BeamPurchase;
  phase: BeamPhase;
  /** The same offline-earnings proxy `rankByEarnings` (search.ts) sorts by — i.e. exactly the number
   *  the search itself used to judge "how promising is this branch" at the time. Not itself a "score"
   *  in the Phase 3 sense (see BeamSearchResult.score's own doc note) — see search.ts's
   *  rankByEarnings doc comment for why this proxy is used at all for non-terminal states. */
  earnings: number;
  absoluteSimTime: number;
}

/** One step of the winning plan's path, generation by generation, alongside what else was
 *  competitive at that same fork — the "how did you get here, and what did we pass up" view
 *  (../HANDOFF.md's tooling option #2). Built once, after the search finishes, by walking the
 *  winning terminal's parent chain against the per-generation beam snapshots `runSearchLoop` retained
 *  when `BeamSearchOptions.trace` was set — see reconstruct.ts's `reconstructPlan`.
 *
 *  Bounded by construction: one step per *generation* the winning path passed through, not one per
 *  individual purchase — a tier-macro edge's whole sub-sequence is still just one step here, matching
 *  how it's just one generation's worth of decision in the search itself. A typical run has tens to
 *  a couple hundred generations (see ../HANDOFF.md's convergence notes — ~71 for one documented real
 *  run), not the hundreds of individual purchases `BeamSearchResult.researchIds` might list — this is
 *  what keeps the export from being "an overwhelming swarm of logs" despite covering the whole run. */
export interface WinningPathStepTrace {
  /** Generation number — matches BeamSearchProgress.depth's numbering for the same run. */
  depth: number;
  chosen: BeamMemberSummary;
  /** The top few OTHER members of this generation's beam by earnings, chosen state excluded — capped
   *  well below beamWidth (see reconstruct.ts's TRACE_ALTERNATIVES_LIMIT) specifically so this stays
   *  small regardless of how wide the search was run. */
  alternatives: BeamMemberSummary[];
  /** 1-based rank of the chosen state within this generation's full beam, by the same earnings
   *  ranking `alternatives` is sorted by — e.g. 3 means it was the 3rd-highest earner that
   *  generation, not necessarily the top. Worth watching for: a consistently non-1 rank means the
   *  winning branch was regularly *not* what the moment-to-moment earnings proxy liked best, which is
   *  either the proxy being appropriately farsighted (good) or misleading (see search.ts's
   *  rankByEarnings doc comment on that heuristic's own acknowledged limits). */
  chosenRank: number;
  /** Full size of this generation's beam (before `alternatives` was capped), so "chosen was #3 of
   *  N" is legible without cross-referencing beamWidth. */
  beamSizeThisGeneration: number;
}

/** The Phase 3 attempt that won, in the same context as `WinningPathStepTrace` — but "alternatives"
 *  here means every *other* complete plan the search found anywhere during the whole run (Phase 3 is
 *  terminal, so there's no "beam" to compare against at this step the way earlier generations have —
 *  see BeamTerminalResult's own doc comment), not sibling beam members. */
export interface FinalStepTrace {
  finalScore: number;
  /** How many Phase 3 attempts succeeded anywhere in the search, matching
   *  BeamSearchProgress.finishedCount's final value for this run. */
  totalPhase3AttemptsFound: number;
  /** Always 1, by construction — reconstruct.ts ranks `finished` with the exact same comparator
   *  `pickWinner` (engine/index.ts) used to choose `winner` in the first place (score desc, then
   *  earliest lastPurchaseTime), so the winner is always its own rank-1. Kept as an explicit field
   *  anyway (rather than assumed and omitted) as a visible consistency check — if this were ever
   *  anything but 1, that would mean the trace's ranking had drifted out of sync with pickWinner's
   *  own selection rule, worth catching rather than silently trusting. Found by direct testing (a
   *  real exported trace) that an earlier, score-only version of this sort reported values like 11
   *  even when the winner was genuinely pickWinner's own pick — see this field's own git history /
   *  the sort just above where it's computed for the full story. */
  winnerRank: number;
  /** The other attempts, ranked the same way `winnerRank` is (score desc, then earliest
   *  lastPurchaseTime — not score alone), capped the same way `WinningPathStepTrace.alternatives` is. */
  otherAttempts: { finalScore: number; lastPurchaseTime: number }[];
}

export interface WinningPathTrace {
  steps: WinningPathStepTrace[];
  finalStep: FinalStepTrace;
}

export interface BeamSearchResult {
  score: number;
  /** Flat, ordered, may repeat an id across multiple levels — same convention as
   *  SimpleBuyPlan.researchIds (calculations/smartBuyPreview.ts), ready for the same
   *  "replay against the live plan" adapter that convention already has. */
  researchIds: string[];
  endLevels: ResearchLevels;
  lastPurchaseTime: number;
  phaseTransitionTime: number | null;
  tierUnlockTimes: { tier: number; time: number }[];
  /** Absolute unix seconds of every WaitForSaleEdge on the winning path — each one a point where
   *  the search found nothing worth buying immediately and skipped ahead to the next research sale
   *  instead of settling for a weak purchase. Empty on a plan that never needed to. */
  saleWaitTimes: number[];
  metrics: {
    runtimeMs: number;
    statesExpanded: number;
    duplicatesRemoved: number;
    tierMacroCalls: number;
    phase3MacroCalls: number;
    /** How many of phase3MacroCalls hit the memoized artifact-optimization cache instead of
     *  re-running getOptimalELRSet's combinatorial search — see macros.ts's runPhase3Macro doc
     *  comment. A high ratio here confirms the cache is earning its keep. */
    phase3CacheHits: number;
    beamWidth: number;
    /** True if `options.isCancelled` returned true before the loop reached a natural stop
     *  (maxDepth/empty beam). The result is whatever was found up to that point — may still be a
     *  usable plan (finished.length > 0), or may be absent (runBeamSearch throws in that case, same
     *  as the ordinary "no plan found" path — see its own doc comment). */
    cancelled: boolean;
  };
  /** Present only when `BeamSearchOptions.trace` was set — see WinningPathTrace's own doc comment. */
  trace?: WinningPathTrace;
}

/** Same formula every purchase-timing function in this codebase already uses (see
 *  engine/simulate.ts, composables/useResearchViews.ts) — kept in one place so it can't drift. */
export function absoluteSimTimeOf(state: BeamSearchState, context: SimulationContext): number {
  return context.ascensionStartTime + (state.lastStepTime - context.planStartOffset);
}

/** Splits a real EngineState into the beam's frozen shared context plus its initial mutable state
 *  (Phase 1, no purchase, no parent). The counterpart, toEngineState, reconstitutes a full
 *  EngineState from a BeamSearchState + the frozen context whenever an existing calc function needs
 *  one. */
export function splitEngineState(state: EngineState): { frozen: BeamFrozenContext; initial: BeamSearchState } {
  const frozen: BeamFrozenContext = {
    currentEgg: state.currentEgg,
    shiftCount: state.shiftCount,
    te: state.te,
    soulEggs: state.soulEggs,
    habIds: state.habIds,
    vehicles: state.vehicles,
    siloCount: state.siloCount,
    tankLevel: state.tankLevel,
    artifactLoadout: state.artifactLoadout,
    activeArtifactSet: state.activeArtifactSet,
    artifactSets: state.artifactSets,
  };
  const initial: BeamSearchState = {
    parent: null,
    purchase: null,
    phase: 1,
    researchLevels: { ...state.researchLevels },
    bankValue: state.bankValue,
    population: state.population,
    lastStepTime: state.lastStepTime,
    eggsDelivered: { ...state.eggsDelivered },
    fuelTankAmounts: { ...state.fuelTankAmounts },
    teEarned: { ...state.teEarned },
    activeSales: { ...state.activeSales },
    earningsBoost: { ...state.earningsBoost },
  };
  return { frozen, initial };
}

export function toEngineState(beamState: BeamSearchState, frozen: BeamFrozenContext): EngineState {
  return {
    ...frozen,
    researchLevels: beamState.researchLevels,
    bankValue: beamState.bankValue,
    population: beamState.population,
    lastStepTime: beamState.lastStepTime,
    eggsDelivered: beamState.eggsDelivered,
    fuelTankAmounts: beamState.fuelTankAmounts,
    teEarned: beamState.teEarned,
    activeSales: beamState.activeSales,
    earningsBoost: beamState.earningsBoost,
  };
}

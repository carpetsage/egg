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

export type BeamPurchase = ResearchPurchaseEdge | TierMacroEdge | Phase3MacroEdge | PhaseTransitionEdge;

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

# Refactor Plan — Share Manual-Planner "Smart" Logic with Auto Planner

> **AGENT INSTRUCTIONS**:
> - This plan is written to be executed **one phase per chat session**, because the full context
>   (manual planner + auto planner) is too large for one window.
> - Read this entire file before starting, but only **work on the single next incomplete phase**
>   (first unchecked `## Phase` heading). Do not jump ahead.
> - Each phase lists exact files, exact line ranges (as of the commit this plan was written against —
>   `73e63bf4`, 2026-07-30 — re-locate by function name if lines have drifted), and exact new
>   function signatures. Follow them precisely; this is meant to be mechanical, not exploratory.
> - After finishing a phase: run `pnpm vue-tsc --noEmit`, and confirm the auto planner still produces
>   plans (if touched). **Do not use the `run` skill / launch the dev server to smoke-test the UI
>   during this refactor** — per the user, they'll do manual browser verification themselves; rely on
>   the type check (and, where useful, a throwaway script against a fixture) instead. Then mark the
>   phase `[x]` in this file and stop. Let the user decide whether to continue in this chat or start a
>   fresh one.
> - Do not touch files outside `wasmegg/ascension-planner` unless a phase explicitly says to.
> - **No behavior change is intended in Phases A–C.** They are pure relocation/generalization of
>   existing logic. If a phase seems to require a behavior change to work, stop and ask the user
>   rather than guessing.

## Why

The manual ascension planner (rest of `wasmegg/ascension-planner/src`) has accumulated several
"smart" buying behaviors as buttons: Smart Buy (buy anything under a time threshold), milestone
chain buying (ROI-optimal path to a tier unlock or a specific research level), and sale-aware batch
buying ("Buy Until Sale Warning" / "Buy Until Sale Ends"). All of this logic currently lives inside
Vue components/composables and is wired directly to Pinia stores (`useCommonResearchStore`,
`useActionsStore`) and the action-executor (`useActionExecutor`'s `prepareExecution`/
`completeExecution`/`batch`).

The auto planner (`src/auto/`) runs the same *kind* of decisions, but against a plain
`EngineState` object with no Vue/Pinia involved (see `src/auto/AGENT.md`, "Do not use Pinia
stores or Vue composables"). Right now it re-implements simplified versions of this logic from
scratch inside shift files like `src/auto/shifts/c1.ts` (see `findTierUnlockCandidate`,
`buyBestEarningsResearch`) rather than reusing the manual planner's more sophisticated algorithms.

Good news: the actual *math* (`calculateResearchROI` in `src/calculations/researchROI.ts`,
`getBestEarningsRecommendation` in `src/auto/engine/strategist.ts`) is already pure and already
shared. The problem is narrower than a full rewrite: a handful of functions inside
`src/composables/useResearchViews.ts` are pure engine simulations (`EngineState` +
`SimulationContext` in, `EngineState` + a purchase list out) but are currently written as
**closures inside the composable**, reading Vue refs (`costModifiers.value`,
`isResearchSaleActive.value`, `virtueStore.planStartTime`, etc.) instead of taking them as
parameters. The fix is to hoist them out into plain exported functions in `src/calculations/`
(the existing home for framework-agnostic pure logic — see `researchROI.ts`, `commonResearch.ts`,
`layRate.ts`), parameterized explicitly. Once they're plain functions, both
`useResearchViews.ts` (as a thin adapter passing store-derived values in) and new `src/auto/`
helpers (passing `EngineState` values in directly) can call the same code.

This plan covers the capabilities requested across C1, K1, I1, C2, and K2:

1. **Smart Buy, one-time purchase for N seconds** (C1) → new `src/calculations/smartBuyCandidate.ts` +
   new `src/auto/shifts/milestones.ts::runSmartBuyForSeconds`.
2. **Unlock Tier milestone (ROI-optimal chain) + "Buy Entire Chain"** (C1) → hoisted
   `computeTierMilestoneChain` et al. into `src/calculations/milestoneChain.ts` +
   `src/auto/shifts/milestones.ts::runTierUnlockMilestone`.
3. **Milestone view for a specific research, buy its chain only if `optimizedSeconds` is below a
   threshold** (C1) → hoisted `computeResearchMilestoneChain` into the same new file +
   `src/auto/shifts/milestones.ts::runResearchMilestoneIfWorthwhile`.
4. **Research view / smart buy again, just applied to different research targets** (C2) → no new
   extraction; reuses #1–#3. See "Phase G" below.
5. **"5 Min Max Shipping" budget-ROI vehicle buyer** (K1) → new
   `src/calculations/vehiclePurchasePlan.ts` + `src/auto/shifts/vehicles.ts::runVehicleBudgetPlan`.
6. **"Max Habs" / interim-hab purchase planner** (I1) → hoisted `findBestNextHabPurchase` /
   `simulateHabPurchases` from `HabActions.vue` into `src/calculations/habPurchasePlan.ts` +
   `src/auto/shifts/habs.ts::runHabPurchasePlan`.
7. **"Max Vehicles" (all-Hyperloop + max cars) planner** (K2) → hoisted `maxVehiclesSeconds`'s
   simulation from `VehicleActions.vue` into `src/calculations/vehiclePurchasePlan.ts` (same new
   file as #5) + `src/auto/shifts/vehicles.ts::runMaxVehiclesPlan`. **K3 needs this too** — see
   Phase D's note; `auto/shifts/k3.ts:137-153` is a byte-for-byte copy of `k2.ts:132-157`.
8. **"1-Hr Max" silo buyer** (R1) → new `src/calculations/siloPurchasePlan.ts` +
   `src/auto/shifts/silos.ts::runSiloBudgetPlan`. `auto/shifts/r1.ts` already does almost exactly
   this; see Phase H.
9. **Equip optimal ELR artifact set** (H1) → **already done** — `auto/shifts/h1.ts::runH1` already
   calls the same shared `getOptimalELRSet` the manual planner's `equipOptimalELR` calls. See
   Phase I; this is a documentation/reconciliation phase, not an extraction.
10. **Bulk "specify total TE, get a wait/shift schedule"** (K3, second half) → `auto/te-thresholds.ts`
    and `auto/shifts/te-wait.ts` already implement a parallel version of this
    (`distributeTargetTE`, `timeToEarnTE`, `runTEWaitShift`). See Phase J — this needs investigation
    and reconciliation, not a mechanical extraction; the two implementations may not be equivalent.
11. **Ranked, sale-aware research candidate lists (the actual subsets/orders `handleBuyUntilSaleWarning`
    and `handleBuyUntilSaleDeadline` buy from)** (C3) → hoist `sortedResearches`'s `roi`/`elr`
    branches from `useResearchViews.ts` into `src/calculations/researchRanking.ts`. See Phase K —
    this is the biggest single hoist in the plan (~400 lines across two branches) and, per the user,
    the most complicated piece; do not rush it.
12. **Wait-for-research-sale / wait-for-earnings-boost actions** (C3) → largely **already covered**
    as a side effect of `c1.ts`'s and `c3.ts`'s existing boundary-aware `advanceTime` (which already
    emits the same `wait_for_research_sale`/`wait_for_earnings_boost`/toggle actions). See Phase L —
    mostly a "confirm and dedupe," not new capability.

Wiring these new auto-planner helpers into an actual shift's decision-making (e.g. rewriting C1's
Phase 1/2, or K1's/K2's/I1's existing loops to call the new shared planners instead of their own
parallel logic) is **deliberately left out of this plan** — it's a design decision (replace vs.
supplement existing heuristics), not a mechanical extraction. Do it as a separate follow-up after
the relevant phase is merged and validated on its own. See "Not in scope" at the bottom.

Phase order: **A → B → C are C1's phases (do these first)** — most later phases lean on the pattern
they establish, even when they don't strictly import their code. **D and E (K2, I1) have no
dependency on A/B/C** and can be done in parallel/either order once you're back to a fresh chat.
**F (K1) depends on D** (it reuses the vehicle-capacity helper D creates). **G (C2) depends on
A/B/C** and is documentation-only, not code. **H (R1) is independent.** **I (H1) is independent and
documentation-only.** **J (K3) depends on D** for its vehicle-max part (J.3); its TE-distribution
part (J.1/J.2) is independent but is investigation-first, not a mechanical extraction — don't write
code for it until the investigation concludes. **K (C3, ranked candidate lists) depends on Phase A's
pattern** and is the largest single phase in this plan — budget a full session for K.1+K.2 alone,
and treat K.5 (wiring into C3 itself) as a separate, later, carefully-reviewed follow-up, not
something to attempt in the same pass. **L (C3, wait-for-event actions) is independent** and mostly
confirms existing coverage rather than building anything new.

Suggested order if working through the whole plan sequentially: **A, B, C, D, E, F, H, I, G, J, L,
K** — K last, since it's the biggest and depends on the hoisting pattern being well-practiced by
then.

---

## Phase A — Hoist milestone-chain math into `src/calculations/milestoneChain.ts` [x]

**Touches only**: `src/composables/useResearchViews.ts` (edit) and a new file
`src/calculations/milestoneChain.ts` (create). No other files. No behavior change.

### A.1 — Create `src/calculations/milestoneChain.ts`

Move these five functions **out of** `useResearchViews.ts` (they currently live inside the
`useResearchViews()` composable body, lines given below refer to the pre-refactor file) into the
new file, converting every closed-over Vue ref/store read into an explicit parameter:

| Function | Current location (closure) | Closed-over values to convert to params |
|---|---|---|
| `computeResearchMilestoneChain` | `useResearchViews.ts:330-433` | `costModifiers.value` → `mods`; `isResearchSaleActive.value` → `isSale`; `actionsStore.effectiveSnapshot` → `startSnapshot` param |
| `simulateCheapestFirstTierChain` | `useResearchViews.ts:438-496` | `costModifiers.value` → `mods`; `isResearchSaleActive.value` → `isSale` (already takes `state`/`snapshot`/`totalSecondsSoFar`/`target`/`context` as params — least change needed) |
| `computeCheapestFirstTierChain` | `useResearchViews.ts:498-500` | `actionsStore.effectiveSnapshot` → `startSnapshot` param; becomes a thin wrapper calling `simulateCheapestFirstTierChain(createBaseEngineState(startSnapshot), startSnapshot, 0, target, context, mods, isSale)` |
| `reorderTierChainByROI` | `useResearchViews.ts:508-618` | `costModifiers.value` → `mods`; `isResearchSaleActive.value` → `isSale`; `virtueStore.planStartTime`/`actionsStore.planStartOffset`/`actionsStore.effectiveSnapshot.lastStepTime` (used to build `absoluteSimTime`) → single `absoluteSimTimeAtStart` param; `researchSaleDeadline.value` → `researchSaleDeadline` param |
| `computeTierMilestoneChain` | `useResearchViews.ts:633-768` | same as `reorderTierChainByROI`, plus it calls `simulateCheapestFirstTierChain` and `reorderTierChainByROI` internally — thread the new params through |

Also move the `ResearchViewItem` interface's milestone-relevant shape — actually **do not** move
`ResearchViewItem` itself (it's a UI-view type with fields like `showDivider`, `extraLabel` used by
other views too, and lives correctly in `useResearchViews.ts:63-100`). Instead, define a narrower
result type in the new file, e.g.:

```ts
// src/calculations/milestoneChain.ts
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
}
```

...and have `useResearchViews.ts` map `MilestoneChainItem[]` → `ResearchViewItem[]` at the call
site (adding back `timeToBuy`/`buyToHereTime` formatted strings, `canBuy`, `isMaxed`,
`canBuyToHere`, `extraStats`/`extraLabel`/`extraSeconds` — all trivially derived, this mapping is
~15 lines). This keeps the new pure module free of `formatDuration`/display concerns, matching how
`calculateResearchROI` in `src/calculations/researchROI.ts` returns raw seconds and lets callers
format.

New exported signatures (imports needed: `CommonResearch`, `getCommonResearches`,
`getDiscountedVirtuePrice`, `isTierUnlocked`, `type ResearchCostModifiers` from
`../calculations/commonResearch`; `EngineState`, `SimulationContext` from `../engine/types`;
`CalculationsSnapshot` from `../types`; `computeSnapshot` from `../engine/compute`; `applyAction`,
`applyTime`, `getTimeToSave` from `../engine/apply`; `getNextPacificTime` from `../lib/events`;
`calculateResearchROI` from `./researchROI`):

```ts
export function computeResearchMilestoneChain(
  target: { researchId: string; targetLevel: number },
  startState: EngineState,
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  isSale: boolean
): { items: MilestoneChainItem[]; reached: boolean; totalSeconds: number };

export function simulateCheapestFirstTierChain(
  state: EngineState,
  snapshot: CalculationsSnapshot,
  totalSecondsSoFar: number,
  target: { tier: number },
  context: SimulationContext,
  mods: ResearchCostModifiers,
  isSale: boolean
): { items: MilestoneChainItem[]; reached: boolean; totalSeconds: number };

export function computeCheapestFirstTierChain(
  target: { tier: number },
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  isSale: boolean
): { items: MilestoneChainItem[]; reached: boolean; totalSeconds: number };

export function computeTierMilestoneChain(
  target: { tier: number },
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  isSale: boolean,
  absoluteSimTimeAtStart: number,
  researchSaleDeadline: number
): { items: MilestoneChainItem[]; reached: boolean; totalSeconds: number };
```

(`reorderTierChainByROI` can stay module-private/unexported in the new file — it's only ever
called from `computeTierMilestoneChain`, same as today.)

Also move the two small helpers that only these functions need:
`isMilestoneReached` (`useResearchViews.ts:319-321`) can move too, or stay — it's tiny and generic
(`MilestoneTarget` + `researchLevels` in, `boolean` out); moving it to the new file alongside
`MilestoneTarget`'s definition is cleaner. **Note**: `MilestoneTarget` type itself currently lives
at `useResearchViews.ts:40-42` — move that type to the new file too and re-export it from
`useResearchViews.ts` (`export type { MilestoneTarget } from '@/calculations/milestoneChain'`) so
existing imports elsewhere (e.g. `MilestoneTargetPicker.vue:88`) don't need to change.

### A.2 — Add a baseline + summary helper to the same file

`milestoneBaselineResult` (`useResearchViews.ts:784-804`) and the numeric core of
`milestoneSummary` (`useResearchViews.ts:806-829`, excluding the `formatAbsoluteTime` /
`finishAbsoluteTime` line which needs `virtueStore.ascensionTimezone` and stays in the composable)
are also pure once parameterized. Add:

```ts
export function computeMilestoneBaseline(
  target: MilestoneTarget,
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  isSale: boolean
): { reached: boolean; totalSeconds: number };

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
): MilestoneSummaryCore;
```

This is the piece the auto planner will call directly for C1's third bullet ("buy the chain if
`optimizedSeconds` is below a threshold") — `computeMilestoneSummaryCore(...).optimizedSeconds`.

### A.3 — Update `src/composables/useResearchViews.ts`

- Delete the five hoisted functions' bodies (keep nothing behind — no re-export shims, no
  "deprecated" wrappers; this repo's convention is direct deletion, see CLAUDE.md/global
  instructions on no backwards-compat hacks).
- Import the new functions from `@/calculations/milestoneChain`.
- Update `milestoneChainResult` (`useResearchViews.ts:770-776`), `milestoneBaselineResult`
  (`784-804`), and `milestoneSummary` (`806-829`) to call the imported functions, passing
  `costModifiers.value`, `isResearchSaleActive.value`, the computed `absoluteSimTime` (same
  expression already inline at `useResearchViews.ts:637-639` and `818-819` — factor into one local
  `const absoluteSimTime = ...` at the top of each computed if not already), and
  `researchSaleDeadline.value`.
- Map the returned `MilestoneChainItem[]` to `ResearchViewItem[]` at the `sortedResearches`
  milestone branch (`useResearchViews.ts:1548-1550`, currently just
  `return milestoneChainResult.value.items;`) — add the small formatting/derivation step described
  in A.1.
- `milestoneSummary`'s final return needs to add back `finishAbsoluteTime` using
  `computeMilestoneSummaryCore(...)`'s `optimizedSeconds` plus the existing
  `formatAbsoluteTime(...)` call (`useResearchViews.ts:827`).

### Acceptance check for Phase A

`pnpm vue-tsc --noEmit` must pass. Per the user, do not use the `run` skill / dev server to
browser-verify this phase — the user will manually open the Milestones research view (pick "Unlock
Tier N" and a specific research target) themselves and confirm the summary numbers
(baseline/optimized/saved/purchase count/finish time) and chain list render identically to before
the change.

---

## Phase B — Extract Smart Buy's candidate-selection into `src/calculations/smartBuyCandidate.ts` [x]

**Touches only**: `src/components/actions/ResearchActions.vue` (edit) and a new file
`src/calculations/smartBuyCandidate.ts` (create). No behavior change to the manual planner.
Does **not** touch `src/auto/shifts/quickWins.ts` — see "Note on quickWins.ts" below for why.

### B.1 — Create `src/calculations/smartBuyCandidate.ts`

The candidate-selection logic currently lives inline in `handleSmartBuy`
(`ResearchActions.vue:471-528`), specifically the `candidates` construction and `.find(...)` at
lines 495-517. Extract just that decision into:

```ts
export interface SmartBuyCandidate {
  research: CommonResearch;
  price: number;
  secondsToSave: number;
}

/**
 * Cheapest unpurchased, unlocked research level that can be saved up for in
 * `<= thresholdSeconds` of pure earning time (existing bank/gems are ignored — see
 * `ResearchActions.vue`'s "Smart Buy will never spend gems from your bank" note).
 */
export function findSmartBuyCandidate(
  researchLevels: Record<string, number>,
  mods: ResearchCostModifiers,
  isSale: boolean,
  offlineEarnings: number,
  thresholdSeconds: number
): SmartBuyCandidate | null;
```

Implementation is a direct lift of `ResearchActions.vue:497-517` (the `.filter` for
unpurchased+unlocked, `.map` to `{research, price, seconds: getTimeToSave(price, {bankValue: 0,
offlineEarnings})}` — note `getTimeToSave` only reads `bankValue`/`offlineEarnings` off the
snapshot it's given, so pass a minimal `{ bankValue: 0, offlineEarnings } as CalculationsSnapshot`
rather than a full snapshot — check `src/engine/apply/math.ts:155` `getTimeToSave`'s actual field
usage before doing this to confirm nothing else is read), `.sort` by price, `.find(c => c.seconds
<= threshold)`.

### B.2 — Update `handleSmartBuy` in `ResearchActions.vue`

Replace the inline `candidates`/`found` block (lines 495-517) with a call to
`findSmartBuyCandidate(commonResearchStore.researchLevels, costModifiers.value,
isResearchSaleActive.value, actionsStore.effectiveSnapshot.offlineEarnings, threshold)`. The
surrounding loop/`buyOneLevel`/`isSmartBuying` machinery (lines 471-494, 518-527) is
manual-planner-specific (Pinia store mutation) and stays exactly as is.

### Note on quickWins.ts — do not touch in this phase

`src/auto/shifts/quickWins.ts::runQuickWins` already does something similar (and already accepts a
configurable `thresholdSeconds`, not just its 3-second default — see
`quickWins.ts:38,66-77`), but it's a hand-optimized hot path used inside C1/C2's per-tier loop
(its own doc comment at `quickWins.ts:12-23` explains the caching/boundary-skipping it does that a
shared `findSmartBuyCandidate` call would not replicate without re-adding that complexity). Forcing
it to call `findSmartBuyCandidate` would either lose those optimizations or require pushing the
caching into the shared function and complicating its signature for the (simpler) manual-planner
caller. Leave `quickWins.ts` as its own implementation. Phase C's new one-shot smart-buy helper for
the auto planner (a *different* use case — a single explicit "buy everything under N seconds right
now" step, not a per-tier inner loop) should use `findSmartBuyCandidate` directly, not
`runQuickWins`.

### Acceptance check for Phase B

Toggle Smart Buy "Always On" and use "One-time Purchase" in the manual planner at a few different
threshold values; confirm identical purchases happen as before the change.

---

## Phase C — New auto-planner helpers: `src/auto/shifts/milestones.ts` [x]

**Touches only**: new file `src/auto/shifts/milestones.ts` (create). Does not modify any existing
shift file or wire these into a shift's control flow — that's explicitly deferred (see "Not in
scope"). Depends on Phases A and B being merged (imports their new exports).

### C.1 — Shared plumbing

This file needs the same `advanceTime`-credits-`bankValue` pattern documented in
`src/auto/AGENT.md` ("Known Bugs & Gotchas" section) — copy the pattern from
`src/auto/shifts/c1.ts:87-166`'s `advanceTime`, simplified (no sale/boost-boundary stepping needed
for a single research purchase's wait — that level of care is only needed for long C1-style waits;
confirm this assumption holds for milestone-chain waits, which are typically short, before skipping
boundary handling — if a milestone chain wait could plausibly cross a sale boundary, reuse the
boundary-stepping version instead of the simplified one). Define once at the top of the file and
reuse across the three exported functions below (mirrors how `quickWins.ts` takes a `getAbsTime`
callback rather than redefining time tracking per-caller).

### C.2 — `runSmartBuyForSeconds`

C1 bullet 1: "buy everything you can in a specific number of seconds."

```ts
export function runSmartBuyForSeconds(
  startState: EngineState,
  context: SimulationContext,
  thresholdSeconds: number,
  timeLimit: number
): ShiftResult
```

Loop: compute snapshot → `findSmartBuyCandidate(state.researchLevels, mods, isSale,
snapshot.offlineEarnings, thresholdSeconds)` (from Phase B) → if null, stop; else buy it (same
`buyResearch`-style single-purchase pattern as `c1.ts:168-206`, respecting `timeLimit`) → repeat.
Return `{ actions, elapsedSeconds, endState }` matching the `ShiftResult` shape
(`src/auto/types.ts:57-61`).

### C.3 — `runTierUnlockMilestone`

C1 bullet 2: "unlock tiers efficiently and cost-effectively" via the milestone chain algorithm
(rather than C1's current simpler `findTierUnlockCandidate` heuristic at `c1.ts:221-242`).

```ts
export function runTierUnlockMilestone(
  startState: EngineState,
  context: SimulationContext,
  targetTier: number,
  timeLimit: number
): ShiftResult
```

Call `computeTierMilestoneChain` (from Phase A) once, up front, against a snapshot of `startState`,
to get the ordered `MilestoneChainItem[]`. Then execute that list item-by-item against the mutable
`EngineState` (advance time per-item using C.1's helper, then `applyAction` the `buy_research`,
same shape as `handleBuyMilestoneChain`'s loop in `ResearchActions.vue:585-606` but against
`EngineState`/`Action[]` instead of the Pinia store), stopping early if `elapsedSeconds` would
exceed `timeLimit`. Note: `computeTierMilestoneChain` plans the *whole* chain assuming unlimited
time — if `timeLimit` cuts it off partway, the remaining plan is simply not executed (no
re-planning needed, since each item's cost only depends on state up to that point, not on later
items).

### C.4 — `runResearchMilestoneIfWorthwhile`

C1 bullet 3: "find researches that have specific types or IDs, buy the chains for these if
[`optimizedSeconds`] is below a specific threshold."

```ts
export function runResearchMilestoneIfWorthwhile(
  startState: EngineState,
  context: SimulationContext,
  researchId: string,
  targetLevel: number,
  maxOptimizedSeconds: number,
  timeLimit: number
): ShiftResult // no-op (0 actions, unchanged state) if the chain's optimizedSeconds exceeds maxOptimizedSeconds
```

Call `computeResearchMilestoneChain` (Phase A) to get the chain + `computeMilestoneBaseline` +
`computeMilestoneSummaryCore` (Phase A) to get `optimizedSeconds`. If
`optimizedSeconds > maxOptimizedSeconds` (or the chain wasn't `reached`), return immediately with
no actions taken. Otherwise execute the chain the same way as C.3.

For "researches that have specific types or IDs" (the caller-side filtering mentioned in the C1
description) — that's the responsibility of whatever shift code eventually calls this function in
a loop over candidate research IDs/categories; this function itself just handles "one target,
buy-if-worthwhile." Don't build ID/category filtering into this file.

### Acceptance check for Phase C

No existing behavior changes (nothing calls these new functions yet). Confirm the file compiles
(`pnpm vue-tsc --noEmit`) and, if time permits, write a throwaway script/test invoking each
function against a `createBaseEngineState` fixture to sanity-check it returns a plausible
`ShiftResult` (purchases happen, `elapsedSeconds` advances, `bankValue` never goes negative-without-
explanation per the AGENT.md gotcha).

---

## Phase D — K2: hoist "Max Vehicles" (all-Hyperloop + max cars) planner [x]

**Touches**: new file `src/calculations/vehiclePurchasePlan.ts` (create — Phase F adds to this same
file later) and `src/components/actions/VehicleActions.vue` (edit). No behavior change to the
manual planner. No dependency on Phases A–C.

### D.1 — Extract per-slot vehicle capacity into a pure function

`getVehicleCapacity` (`VehicleActions.vue:355-384`) computes one slot's capacity from
`effectiveMultipliers.value` (itself derived from `calculateShippingMultipliers` in
`src/calculations/shippingCapacity.ts`, already pure, plus `calculateArtifactModifiers` from
`src/lib/artifacts`, also already pure). There's no existing shared "single slot capacity" function
(`calculateShippingCapacity` in the same file computes a fleet *total*, not a per-slot value), so
add one to the new file:

```ts
export function calculateVehicleCapacity(
  slot: { vehicleId: number | null; trainLength: number },
  universalMultiplier: number,
  hoverMultiplier: number,
  hyperloopMultiplier: number,
  epicMultiplier: number,
  shippingCapMultiplier: number,
  artifactMultiplier: number
): number
```

Direct lift of `VehicleActions.vue:355-384`'s body, with `effectiveMultipliers.value`'s six fields
now explicit params instead of a closure read.

### D.2 — Extract the "max out every slot" simulation into a pure function

`maxVehiclesSeconds` (`VehicleActions.vue:630-724`) simulates upgrading every slot to Hyperloop
then maxing its train cars, in slot order (slot 0 fully maxed before slot 1 starts — **not**
globally-greedy across slots the way `HabActions.vue`'s hab planner is; preserve that exact
per-slot-then-next order, don't "improve" it here). Extract it into:

```ts
export interface VehiclePurchaseStep {
  slotIndex: number;
  type: 'upgrade_hyperloop' | 'add_car';
  cost: number;
  waitSeconds: number;
}

export interface VehiclePlanResult {
  steps: VehiclePurchaseStep[];
  totalSeconds: number;
  allMaxed: boolean;
}

export function planMaxVehicles(
  vehicles: { vehicleId: number | null; trainLength: number }[],
  maxSlots: number,
  maxTrainLength: number,
  costModifiers: VehicleCostModifiers,
  isSaleActive: boolean,
  multipliers: { universalMultiplier: number; hoverMultiplier: number; hyperloopMultiplier: number; epicMultiplier: number; shippingCapMultiplier: number; artifactMultiplier: number },
  startSnapshot: { bankValue: number; offlineEarnings: number; population: number; habCapacity: number; offlineIHR: number; shippingCapacity: number; ratePerChickenPerSecond: number }
): VehiclePlanResult
```

Direct lift of the loop body (lines 655-721), generalized to push a `VehiclePurchaseStep` per
purchase instead of only accumulating `totalSeconds`, and calling `calculateVehicleCapacity` (D.1)
instead of the closure-based `getVehicleCapacity`.

### D.3 — Update `VehicleActions.vue`

Turn `maxVehiclesSeconds`/`maxVehiclesTime`/`canBuyMax`/`handleBuyMax`
(`VehicleActions.vue:630-737`, `739-764`) into thin wrappers, mirroring how `HabActions.vue` already
does this cleanly for habs (`maxHabsSim`/`maxHabsSeconds`/`maxHabsTime`/`canBuyMax`/`handleBuyMax`
at `HabActions.vue:528-552`): one computed calls `planMaxVehicles(...)` once, the rest derive from
its result, and `handleBuyMax` just iterates `sim.steps` calling `handleVehicleChange`/
`addTrainCarAction`.

### D.4 — New auto-planner helper (optional at this phase)

Add `src/auto/shifts/vehicles.ts` with `runMaxVehiclesPlan(startState, context, timeLimit):
ShiftResult`, calling `planMaxVehicles` then executing steps against `EngineState` with the
standard `advanceTime`-credits-`bankValue` pattern. Note this is a very close match to what
`auto/shifts/k2.ts:132-157` already does by hand with the same purchase order — this extraction is
low-risk but also low-value on its own unless a later shift wants to reuse it too. Fine to include
now for consistency with the other new helpers, or defer until something actually needs it.

**Two call sites, not one**: `auto/shifts/k3.ts:137-153` ("2. Buy any remaining vehicles/trains")
is a byte-for-byte copy of `k2.ts:132-157` — same loops, same order, just against K3's own
`currentState`/`actions`/`advanceTime` closures. If `runMaxVehiclesPlan` gets wired in anywhere
(a "Not in scope" follow-up, see below), wire it into both `k2.ts` and `k3.ts` together, not just
one — otherwise they'll drift.

### Acceptance check for Phase D

Click "Max Vehicles" in the manual planner from a few different starting fleet states; confirm
identical purchase order and time estimate as before the change.

---

## Phase E — I1: hoist hab purchase planner from `HabActions.vue` [x]

**Touches**: new file `src/calculations/habPurchasePlan.ts` (create) and
`src/components/actions/HabActions.vue` (edit). No behavior change to the manual planner. No
dependency on Phases A–D. Also flags (but does not perform) an upgrade opportunity for
`src/auto/shifts/i1.ts` — see E.3.

### E.1 — Extract `findBestNextHabPurchase` + `simulateHabPurchases`

These two (`HabActions.vue:401-449` and `463-524`) are already nearly pure: they take a virtual
snapshot/hab-id array and return purchase steps, closing over only `costModifiers.value` and
`isHabSaleActive.value` (Pinia refs) plus a call to `getHabCapacity` (a thin wrapper combining the
already-pure `calculateHabCapacity` from `src/calculations/habCapacity.ts` with
`effectiveMultipliers.value`). Move both into the new file, parameterizing:

- `costModifiers.value` → `mods: HabCostModifiers` param
- `isHabSaleActive.value` → `isSaleActive: boolean` param
- `getHabCapacity(habId)` → call `calculateHabCapacity(hab, universalMultiplier, portalMultiplier, habCapMultiplier, artifactMultiplier)` directly, with those four multiplier values (currently `effectiveMultipliers.value`, `HabActions.vue:189-205`) passed in as one params object

```ts
export interface HabPurchaseStep { slotIndex: number; habId: number; cost: number; waitSeconds: number; }
export interface HabPlanResult { steps: HabPurchaseStep[]; totalSeconds: number; allMaxed: boolean; }

export const INTERIM_HAB_THRESHOLD_SECONDS = 10;

export function simulateHabPurchases(
  startSnapshot: CalculationsSnapshot,
  startHabIds: (number | null)[],
  mods: HabCostModifiers,
  isSaleActive: boolean,
  multipliers: { universalMultiplier: number; portalMultiplier: number; habCapMultiplier: number; artifactMultiplier: number },
  shouldStop: (elapsedSeconds: number) => boolean
): HabPlanResult
```

(`findBestNextHabPurchase` stays module-private, called only from `simulateHabPurchases`, same as
today.) Export `INTERIM_HAB_THRESHOLD_SECONDS` too — `auto/shifts/i1.ts` currently hardcodes the
same value twice (`i1.ts:114`, `i1.ts:124`, both literal `10`) and should import the shared
constant once E.3's follow-up happens, so both places can never drift apart silently.

### E.2 — Update `HabActions.vue`

Delete the two functions' bodies, import from the new file, call it with
`actionsStore.effectiveSnapshot` and `effectiveMultipliers.value`. `maxHabsSim`/`maxHabsSeconds`/
`maxHabsTime`/`canBuyMax`/`handleBuyMax`/`handleBuy5MinSpace` (`HabActions.vue:528-566`) are
unchanged structurally — they already call `simulateHabPurchases` as a black box.

### E.3 — Flag for a later (separate, behavior-changing) phase: upgrade `i1.ts`

`auto/shifts/i1.ts`'s current logic (lines 104-138) is a hardcoded 2-step heuristic: buy at most
**one** intermediate hab if the Chicken-Universe wait exceeds 10s (picking the highest hab tier
buyable in <10s, checked once), then buy 4 Chicken Universes slot-by-slot. `simulateHabPurchases`
is strictly more general — it repeats the "best next purchase, preferring a quick high-tier win"
decision every step, across all 4 slots, not just once before the first Chicken Universe. Once E.1
lands, a natural follow-up is rewriting `i1.ts`'s steps 2–3 to call
`simulateHabPurchases(startSnapshot, startState.habIds, mods, false, multipliers, () => false)`
and execute its `steps`. **Do not fold this into Phase E** — unlike Phases A/B/D (pure relocation),
this would likely change I1's simulated output (probably for the better, since it's a strictly more
general search), so it needs its own before/after comparison, same caveat as the C1
Phase-1-heuristic replacement noted under "Not in scope."

### Acceptance check for Phase E

Click "Max Habs" and "5 Min Max Habs" in the manual planner from a few different starting hab
states; confirm identical purchase order and time estimate as before the change.

---

## Phase F — K1: extract the "5 Min Max Shipping" budget-ROI vehicle planner [x]

**Touches**: `src/calculations/vehiclePurchasePlan.ts` (edit — the file Phase D created) and
`src/components/actions/VehicleActions.vue` (edit). **Depends on Phase D** (reuses
`calculateVehicleCapacity`). No behavior change to the manual planner.

### F.1 — Extract `handleBuy5MinCap`'s budget-ROI loop

`handleBuy5MinCap` (`VehicleActions.vue:766-858`) is a genuinely different algorithm from anything
in `auto/shifts/k1.ts` today — not a duplicate to merge, a new capability to expose. Each iteration
scores every possible next purchase (upgrade any slot to any higher vehicle tier, or add a car to a
Hyperloop slot) by `deltaCapacity / cost`, with an override so any purchase adding >1000 capacity
outranks pure ROI (`score = deltaCap > 1000 ? deltaCap * 1000 + roi : roi`, lines 814 and 832),
picks the best-scoring purchase that still fits the remaining budget, applies it virtually, and
repeats until nothing more fits. Extract into:

```ts
export interface VehicleBudgetStep {
  type: 'vehicle' | 'car';
  slotIndex: number;
  vehicleId?: number; // present when type === 'vehicle'
  cost: number;
}

export function planVehiclesWithinBudget(
  vehicles: { vehicleId: number | null; trainLength: number }[],
  maxSlots: number,
  maxTrainLength: number,
  costModifiers: VehicleCostModifiers,
  isSaleActive: boolean,
  multipliers: { universalMultiplier: number; hoverMultiplier: number; hyperloopMultiplier: number; epicMultiplier: number; shippingCapMultiplier: number; artifactMultiplier: number },
  budget: number
): { steps: VehicleBudgetStep[]; totalSpent: number }
```

Direct lift of the `while (spent < maxBudget)` loop (lines 780-856), with `getVehicleCapacity`
calls replaced by Phase D's `calculateVehicleCapacity`, and cost calls taking the passed-in
`costModifiers`/`isSaleActive` instead of closure reads.

### F.2 — Update `VehicleActions.vue`

`handleBuy5MinCap` computes `budget = calculateEarningsForTime(5 * 60, snapshot)` (unchanged — the
"5 minutes" choice is a UI-specific constant, not part of the shared planner), calls
`planVehiclesWithinBudget(...)`, then executes `steps` via `handleVehicleChange`/
`addTrainCarAction` inside `batch(...)` (same overall shape as today, just driven by pre-computed
steps instead of interleaved compute-and-apply).

### F.3 — New auto-planner helper

Add `runVehicleBudgetPlan(startState, context, budget, timeLimit)` to `src/auto/shifts/vehicles.ts`
(same file Phase D adds to). Takes a gem `budget` directly rather than a seconds-based threshold —
unlike Smart Buy's "N seconds per item" framing, this algorithm's budget is a lump sum spent across
multiple purchases, so forcing a "seconds" framing here would require picking an earnings-rate
snapshot to convert from, adding a choice the manual planner's button doesn't have to make (it's
handed a literal 5-minute conversion once, up front). If a caller wants "spend what you'd earn in N
seconds," it should compute that with `calculateEarningsForTime(seconds, snapshot)` itself before
calling — same as `VehicleActions.vue`'s own `handleBuy5MinCap` does — rather than this function
doing it implicitly. Execute the returned `steps` against `EngineState` with the standard
`advanceTime`-credits-`bankValue` pattern, respecting `timeLimit`.

### Acceptance check for Phase F

Click "5 Min Max Shipping" in the manual planner from a few different starting fleet/earnings
states; confirm identical purchases and total spend as before the change.

---

## Phase G — C2: confirm reuse, no extraction (documentation-only, do this last) [x]

**Touches**: nothing, unless a `src/auto/shifts/c2.ts` already exists by the time this is reached
(none does as of this plan's writing — see `src/auto/shifts/index.ts`, no `runC2` export). Depends
on Phases A, B, C.

Per the user: "Nothing unique here. It will use the same pieces as C1: use the smart buy or
milestone view to target individual researches or types of researches, buying in smart chains."
Once Phase C's `runSmartBuyForSeconds` and `runResearchMilestoneIfWorthwhile` exist, C2's needs are
met by calling them with different research IDs/category filters/thresholds. There is no new
shared-logic file for this phase. If/when a C2 shift is actually written, it should import from
`src/auto/shifts/milestones.ts` directly rather than duplicating anything — but that write-up is
itself a "Not in scope" wiring decision, same as the rest of this plan. The only action item here:
before assuming Phase C already covers everything C2 needs, re-read the C2 description above
against whatever C2's actual requirements turn out to be at that time, in case something
research-buying-specific was missed.

### Resolution (found when this phase was executed)

The plan's premise above is now stale: `src/auto/shifts/c2.ts` **does exist** and `runC2` **is**
exported from `index.ts`. It was built independently of Phase C, not on top of it:

- Its own boundary-aware `advanceTime` — a byte-for-byte copy of the same logic already flagged in
  Phase L as duplicated between `c1.ts`/`c3.ts` (and, since Phase C landed, also duplicated a third
  time inside `milestones.ts`'s `createMilestoneShiftHelpers`). `c2.ts` makes it a fourth copy.
- Its own `buyResearch`, structured like `c1.ts`'s rather than calling
  `milestones.ts::createMilestoneShiftHelpers`.
- Its own `tryUnlockTier` — a hand-rolled cheapest-first tier-unlock heuristic (conceptually the
  same shape as `c1.ts`'s `findTierUnlockCandidate`), **not** a call to
  `computeTierMilestoneChain`/`runTierUnlockMilestone`.
- `buyBestEarningsResearch`, driven by `getBestEarningsRecommendation` from `strategist.ts` — this
  part has no overlap with Phase C at all (Phase C's helpers only cover smart-buy/milestone-chain
  buying, not the best-earnings-research heuristic C2 also needs).
- It does correctly reuse the already-shared `runQuickWins` (`quickWins.ts`) — no new duplication
  there, consistent with Phase B's note.

Re-checking C2's requirements (bullets in "Why" #4 and the doc comment at the top of `c2.ts`)
against Phase C's exports: **nothing research-buying-specific was missed.** C2's actual behavior —
sweep quick wins, unlock a tier cheaply, buy best-ROI earnings research, buy a specific research
(`graviton_coupling`) when affordable within a time budget — maps directly onto
`runSmartBuyForSeconds` / `runTierUnlockMilestone` / `runResearchMilestoneIfWorthwhile`. The gap is
not missing capability; it's that `c2.ts` was never wired to call them, and instead duplicates
patterns from `c1.ts`.

**Swapping `c2.ts` onto the shared `milestones.ts` helpers is explicitly left out of this phase**,
for the same reason Phase K.5 leaves `c3.ts` alone: `tryUnlockTier`'s heuristic and the memoized
`getBestEarningsRecommendation` interleaving are tuned specifically for C2's control flow, and
replacing them would change C2's simulated output — a behavior change needing its own before/after
comparison, not a mechanical substitution. This belongs in "Not in scope" as a future follow-up,
alongside the existing C1/I1/K1/K2 wiring items.

---

## Phase H — R1: hoist "1-Hr Max" silo purchase planner [x]

**Touches**: new file `src/calculations/siloPurchasePlan.ts` (create) and
`src/components/actions/SiloActions.vue` (edit). No behavior change to the manual planner. No
dependency on other phases.

### H.1 — Extract `maxSilosIn1Hour`'s loop

`maxSilosIn1Hour` (`SiloActions.vue:228-259`) already calls the shared, growth-aware
`getTimeToSave` (`src/engine/apply/math.ts:155` — no extraction needed, already pure and already
shared) to compute each purchase's wait time, then hand-advances a virtual snapshot's
population/layRate/elr/offlineEarnings for the next iteration using the standard "population grows
toward habCap at rate IHR" formula (lines 242-249). Extract the whole loop, unchanged, into:

```ts
export interface SiloPurchaseStep { fromCount: number; toCount: number; cost: number; waitSeconds: number; }
export interface SiloPlanResult { steps: SiloPurchaseStep[]; totalSeconds: number; }

export function planSilosWithinBudget(
  startSnapshot: CalculationsSnapshot,
  startSiloCount: number,
  budgetSeconds: number
): SiloPlanResult
```

Direct lift of the `while` loop body (lines 235-256), parameterizing `snapshot`/`siloCount`/budget
instead of reading `actionsStore.effectiveSnapshot`/`siloOutput.value.siloCount`/the hardcoded
`ONE_HOUR_SECONDS`.

### H.2 — Update `SiloActions.vue`

`maxSilosIn1Hour` becomes `planSilosWithinBudget(actionsStore.effectiveSnapshot,
siloOutput.value.siloCount, ONE_HOUR_SECONDS)`. `handleBuyMaxSilos1Hour` (lines 306-315) is
unchanged — it only ever used the *count* of steps, not their individual cost/wait, so it can keep
calling `handleBuySilo()` in a loop `steps.length` times.

### H.3 — New auto-planner helper

Add `src/auto/shifts/silos.ts` with `runSiloBudgetPlan(startState, context, budgetSeconds,
timeLimit): ShiftResult` — compute a `CalculationsSnapshot` from `startState` via `computeSnapshot`,
call `planSilosWithinBudget`, execute `steps` against the pure `EngineState` with the standard
`advanceTime`-credits-`bankValue` pattern, respecting `timeLimit`.

### H.4 — Note (not a fix): flat-rate vs. growth-aware waits

`planSilosWithinBudget`'s math is growth-aware (via `getTimeToSave`/`solveForTime`, which integrate
population growth toward hab capacity over the wait). `auto/shifts/r1.ts`'s current loop (and every
other shift file's `advanceTime`, per `AGENT.md`'s "Known Bugs & Gotchas") instead assumes a
**flat** earnings rate for the whole wait — `(price - bankValue) / offlineEarnings`. This isn't a
bug: `AGENT.md`'s "Key Constraints" section states the auto planner assumes **TE ≥ 100**, at which
point "population = hab capacity, earnings = flat rate" is asserted as a deliberate scope
simplification — habs are assumed already maxed by then, so flat-rate is exactly correct, not an
approximation. Flagging this only so whoever eventually wires `runSiloBudgetPlan` into `r1.ts`
understands why the two waiting-time formulas differ and doesn't "fix" one to match the other
without checking which regime applies. Not part of this phase's acceptance criteria.

### Acceptance check for Phase H

Click "1-Hr Max" in the manual planner from a few different starting silo counts/earnings states;
confirm identical purchase count and total wait time as before the change.

---

## Phase I — H1: confirm/document `equipOptimalELR` overlap (no extraction needed) [x]

**Touches**: nothing required. Optionally `src/auto/shifts/h1.ts` if you decide to close one of the
gaps noted below — that's a design decision, not this phase's job. No dependency on other phases.

`auto/shifts/h1.ts::runH1` (lines 12-89) already calls the exact same `getOptimalELRSet` function
(from `src/lib/artifacts/virtue.ts`) that `ArtifactActions.vue`'s `equipOptimalELR`
(`ArtifactActions.vue:225-260`) calls, and already applies the resulting set via `update_artifact_set`
and `equip_artifact_set` actions — this capability is **already shared**, nothing to hoist. Three
small deltas exist between the two call sites, worth knowing about but not fixing here:

1. **Options**: the manual button passes `assumeMaxHabsVehicles`/`excludeGusset` as user-toggleable
   options (`ArtifactActions.vue:230-237`) and a `currentSet` hint (the previously-saved ELR set,
   used to prefer keeping the same loadout when it's still optimal). `runH1` hardcodes
   `assumeMaxHabsVehicles: true`, no `excludeGusset`, and no `currentSet` hint (`h1.ts:23-28`).
2. **No-op skip**: the manual button checks `isOptimalELR`/`optimized !== savedSet` first and skips
   the save/equip entirely if nothing would change (`ArtifactActions.vue:206-223, 240, 252`). `runH1`
   always emits both actions unconditionally.
3. **Hab capacity safety check**: the manual button calls `checkHabCapacityViolation` before
   equipping, to avoid a new loadout leaving population above the new hab capacity
   (`ArtifactActions.vue:306-333`, called at `353` and `391`). `runH1` has no equivalent check — it
   presumably relies on H1 always running late enough (with habs already maxed) that this can't
   happen, but that assumption isn't verified anywhere in `h1.ts`.

If any of these turn out to matter for the auto planner's correctness, that's a small, targeted fix
to `h1.ts` directly — no shared file needed, since the underlying calculation is already shared.
Re-read this list against `h1.ts`'s current state before deciding whether to act on it, since it may
have changed since this plan was written.

### Resolution (found when this phase was executed)

Re-checked `h1.ts` (lines 12-89) against `ArtifactActions.vue`'s current `equipOptimalELR`/
`isOptimalELR` (lines 206-260) and `checkHabCapacityViolation` (lines 306-333). All three deltas
listed above still hold exactly as described; nothing has drifted since this plan was written:

1. **Options**: `h1.ts:23-28` still calls `getOptimalELRSet` with only `commonResearch`,
   `epicResearchLevels`, `colleggtibleModifiers`, `assumeMaxHabsVehicles: true` — no `excludeGusset`,
   no `currentSet`. Checked `getOptimalELRSet`'s defaults (`src/lib/artifacts/virtue.ts:457`):
   `excludeGusset` defaults to `false`, same as `h1.ts`'s omission — no behavioral gap there, just no
   user-facing toggle (the auto planner has no UI, so this is expected, not a bug). `currentSet` is
   used only as a tie-breaker to keep the currently-equipped set when it's already
   functionally-optimal (`virtue.ts:376-377`); omitting it doesn't change *which* set is optimal,
   only whether `h1.ts` might swap to a functionally-equivalent-but-different set than what's active
   — moot anyway, since point 2 means `h1.ts` always re-equips regardless.
2. **No-op skip**: confirmed — `h1.ts` unconditionally pushes `update_artifact_set` and
   `equip_artifact_set` actions every time it runs, with no `isOptimalELR`/`optimized !== savedSet`
   check. Since H1 runs exactly once per ascension simulation (`ascension.ts:82`), this only costs
   two harmless always-a-no-op-if-already-equipped actions in the output log — not a correctness
   issue, just slightly noisier action lists than the manual planner would produce in the same spot.
3. **Hab capacity safety check**: confirmed absent from `h1.ts`. Traced what `equip_artifact_set`/
   `update_artifact_set` actually do in the engine (`src/engine/apply/actions.ts:179-215`): they
   swap `artifactLoadout`/`artifactSets` only and do **not** touch or clamp `state.population` —
   so if a loadout swap were to lower hab capacity below current population, the resulting
   `EngineState` would silently hold `population > habCapacity` with nothing to catch it, same risk
   the manual planner's check guards against. Whether this is reachable in practice depends on the
   shift order: `H1` runs after `I1` (max habs) and `K2` (max vehicles) (`ascension.ts:74-88`), and
   `AGENT.md`'s "TE ≥ 100 assumed" constraint treats population as pinned to hab capacity for every
   shift from that point on — so in the planner's intended regime, H1's ELR-optimal set would need
   to have *strictly less* hab-capacity effect than whatever set was active going into H1 for this to
   bite, which isn't obviously impossible (e.g. swapping away from a Gusset-containing set) but isn't
   confirmed to happen either.

Per the phase's own framing, this is a documentation phase, not a fix-it phase: none of the three
deltas is a proven bug reachable by the auto planner's actual call sites, so no change to `h1.ts` is
made here. Point 3 is the only one worth carrying forward as a real (if unconfirmed) risk — flagging
it again for whoever eventually revisits `h1.ts` behavior, same "small, targeted fix, not a shared
extraction" scope the plan already anticipated.

---

## Phase J — K3: investigate & reconcile TE-distribution/wait logic (not a mechanical extraction) [x]

**Touches**: TBD, depending on what the investigation below concludes — possibly
`src/auto/te-thresholds.ts`, `src/auto/shifts/te-wait.ts`, or nothing (if the existing auto-planner
logic turns out to already be correct for its scope). **Do not start writing code for this phase
until J.1 and J.2 are done and you have a concrete conclusion.** This phase is different from A–I:
`src/auto/te-thresholds.ts` and `src/auto/shifts/te-wait.ts` already implement a parallel,
independently-built version of "distribute a TE goal across eggs, then wait for it," so the task is
to compare and reconcile, not to extract something that doesn't exist yet on the auto side.

### J.1 — Compare the wait-time math

`BulkWaitForTEActions.vue`'s `eggPlans` computed (lines 262-317) computes each egg's wait duration
in two phases — a hab-fill phase (population below hab capacity, using `IHR`) followed by a
shipping-capped phase — via `integrateRate` (`src/engine/apply/math.ts:45`, already growth-aware
and already shared). `src/auto/te-thresholds.ts`'s `timeToEarnTE`/`computeTEEarned` (lines 6-45)
instead assume a **constant ELR** for the whole wait (see the functions' own doc comments: "at a
constant ELR"). Per `AGENT.md`'s "TE ≥ 100 assumed" constraint, this is deliberate for the auto
planner's regime (population already at hab capacity by TE ≥ 100) — same reasoning as Phase H.4.
Confirm this assumption actually holds everywhere `timeToEarnTE` is called in the auto planner
(`k3.ts`, `te-wait.ts`'s `runTEWaitShift`/`solveTEForTimeBudget`) before concluding no fix is
needed — in particular check whether any caller can run with population below hab capacity (e.g.
right after a shift, before a `wait_for_full_habs`-equivalent step).

### J.2 — Compare the distribution algorithm

`BulkWaitForTEActions.vue`'s `calculateGreedyGains` (lines 204-239) and `te-wait.ts`'s
`distributeTargetTE` (lines 19-51) both greedily assign each additional TE to whichever egg is
"cheapest" next, but compute "cheapest" differently:

- `calculateGreedyGains`: `cost = nextThreshold - currentDelivered` — the eggs *remaining* to lay
  from the egg's actual current delivered count, which may sit strictly between two TE thresholds
  (`eggStartStates`, lines 179-193, explicitly supports this: `te: Math.max(earned, thresholds)`,
  `delivered` tracked separately).
- `distributeTargetTE`: compares raw `TE_BREAKPOINTS[currentTE]` values directly, implicitly
  assuming `currentDelivered` sits exactly at a threshold (no partial progress toward the next one).

These agree exactly when every egg's delivered count sits exactly on a threshold, and may diverge
otherwise. Determine whether the auto planner can ever reach a state where an egg's `eggsDelivered`
is strictly between two TE thresholds when `distributeTargetTE` is called (this seems plausible —
nothing obviously prevents it) — if so, `distributeTargetTE` needs the same `currentDelivered`-based
cost calculation `calculateGreedyGains` already uses.

### J.3 — Vehicle-max duplication in `k3.ts` (independent of J.1/J.2, do regardless)

`k3.ts:137-153` ("2. Buy any remaining vehicles/trains") is a byte-for-byte copy of
`k2.ts:132-157`. Once Phase D's `planMaxVehicles`/`runMaxVehiclesPlan` exists, this is a mechanical
swap in `k3.ts` to call the same shared function K2 uses — see Phase D's note. This part doesn't
depend on how J.1/J.2 resolve.

### Acceptance check for Phase J

This phase's deliverable is a **written conclusion**, not necessarily a diff: does `te-thresholds.ts`
need the same partial-progress fix as J.2 describes? Does any auto-planner caller of `timeToEarnTE`
violate the "population at hab capacity" assumption from J.1? Only write code if the investigation
finds an actual discrepancy reachable by the auto planner's actual call sites — don't "fix" either
implementation to match the other without first confirming which one (if either) is wrong for its
own use case.

### Resolution (found when this phase was executed)

**J.1 — constant-ELR assumption**: holds for the entire normal build → TE-wait path
(`C1`...`H1`, `K3`/`C4`/`I2`/`R2`/`H2`). This isn't a per-call-site coincidence, it's structural:
every `computeSnapshot` call anywhere in `src/auto/` passes `{ skipGrowth: true }` (confirmed
exhaustively across all shift files, `ascension.ts`, `strategist.ts`, `eggs.ts`), which
unconditionally sets `population = habCapacityOutput.totalFinalCapacity` regardless of the real
value (`src/engine/compute.ts:78-79`). `k3.ts`'s `peakELR` (reused by C4/I2/R2/H2 and
`computeLastTEDuration`) additionally comes from `computeRealisticELR` with a hardcoded
`habIds: [18,18,18,18]` (`realisticELR.ts`) — again independent of real fill state. So within the
simulated-ascension path, "population = hab capacity" is a blanket, always-on simplification per
`AGENT.md`'s documented "TE ≥ 100" constraint — not something that needs per-caller verification.

**One real violation found, outside `te-thresholds.ts`/`te-wait.ts`'s own code**:
`src/auto/useAscensionGenerator.ts:365-398` builds `continueState` for the "Continue Current" plan
variant using the player's **real, live** farm population (`farmState.population`, line 387), then
computes `realELR` via `computeSnapshot(continueState, continueContext, { skipGrowth: true })`
(line 397) — the same `skipGrowth` flag, but applied to a live snapshot instead of a simulated one,
which silently discards the real population and substitutes full hab capacity. Unlike the main
build path (population *is* pinned to capacity there, by simulated design), "Continue Current"
models an in-progress live ascension where the real farm can plausibly have `population <
habCapacity` (e.g. right after a hab upgrade, before IHR catches up) — so `realELR`, and every
`timeToEarnTE`/`runTEWaitShift` call downstream of it, can be optimistic, understating wait times.
This is a real, reachable discrepancy, but per the user's direction it's flagged here as a follow-up
rather than fixed in this phase: the correct fix needs the manual planner's hab-fill-phase growth
math (`BulkWaitForTEActions.vue`'s `eggPlans`, which splits into an `IHR`-driven fill phase via
`integrateRate` (`src/engine/apply/math.ts:45`) plus a capped phase), not a one-line option swap —
`freezePopulation: true` would stop discarding the real population but still wouldn't model the
fill-phase ramp the manual planner accounts for. Scope and risk don't match a phase originally
scoped to `te-thresholds.ts`/`te-wait.ts`.

**J.2 — distribution algorithm**: confirmed to diverge, and reachable on essentially every run, not
just an edge case. `distributeTargetTE` (`te-wait.ts`) compared raw `TE_BREAKPOINTS[currentTE]`
values across eggs — since thresholds strictly increase with TE bracket, this doesn't merely
mis-break ties, it ignores partial `eggsDelivered` progress within the current bracket entirely and
degenerates to "advance whichever egg has the lowest TE count" (an equalize-TE-counts heuristic),
never matching the manual planner's true minimum-remaining-cost greedy search
(`BulkWaitForTEActions.vue`'s `calculateGreedyGains`, `cost = nextThreshold - currentDelivered`).
Confirmed this state is reachable at both of `distributeTargetTE`'s call sites
(`ascension.ts:227`, `ascension.ts:406`): build shifts (C1-H1) accumulate passive eggs via waits
that aren't chosen to land on TE breakpoints, so by the time the first TE-wait shift runs, eggs
routinely sit strictly between thresholds; `runContinueCurrent`'s catch-up step
(`ascension.ts:378-388`) does the same thing explicitly for a live backup. **Fixed**:
`distributeTargetTE` now takes `eggsDelivered` (not just TE counts) and computes cost the same way
`calculateGreedyGains` does — see `te-wait.ts` and both call sites in `ascension.ts`. Verified with
`pnpm vue-tsc --noEmit`.

**J.3 — vehicle-max duplication in `k3.ts`**: `planMaxVehicles`/`runMaxVehiclesPlan` now exist
(Phase D), so the mechanical swap this sub-item describes is technically available. Not done here:
per Phase D.4's own note, wiring `runMaxVehiclesPlan` in "should" happen in `k2.ts` and `k3.ts`
together, not one at a time, to avoid the two drifting — but wiring it into `k2.ts` is explicitly
listed under "Not in scope" as a behavior-change decision needing its own before/after comparison.
Swapping only `k3.ts` now would violate the "both together" guidance and reintroduce exactly the
drift risk it warns about, so this stays deferred alongside the `k1.ts`/`k2.ts` wiring item in "Not
in scope" — a future follow-up should do `k2.ts` and `k3.ts` in the same pass.

---

## Phase K — C3: hoist the ROI/ELR ranked-candidate lists (biggest phase — do this one carefully) [x]

**Touches**: new file `src/calculations/researchRanking.ts` (create) and
`src/composables/useResearchViews.ts` (edit). No behavior change to the manual planner in K.1-K.4.
Depends on Phase A (same hoisting pattern, same file family) but not strictly on B/C/D-J.

The user's framing for C3: it needs `handleBuyUntilSaleDeadline`/`handleBuyUntilSaleWarning`
(`ResearchActions.vue:427-469`), but "both of these choose specific subsets of research in specific
orders" — meaning the real thing to extract isn't the two handler functions (which are a thin
"buy the next passing candidate, repeat" loop, see K.3) but the **ranked candidate lists themselves**:
`sortedResearches`'s `roi` branch (`useResearchViews.ts:1119-1313`) and `elr` branch
(`useResearchViews.ts:1315-1546`). These are the largest un-hoisted pieces of logic in
`useResearchViews.ts` — read both branches in full before starting, they're dense.

### K.1 — Hoist the ROI ranking branch

`sortedResearches`'s `roi` branch (lines 1119-1313) does, per candidate research: computes ROI
seconds (via the already-shared `calculateResearchROI`, or a `maxed_vehicles`-mode variant using
`buildMaxVehiclesSnapshot`, lines 1139, 1158-1179), applies `deliveryImpactOnly`/category filtering,
then — for `roiMode === 'immediate'` — checks whether the item is "bottlenecked" (laying/shipping
research with poor solo ROI) and if so searches for a pairing partner whose *combined* ROI is
better, adjusting `showSaleWarning` against the pair's combined payback instead of the item's solo
ROI (lines 1242-1287). Finally sorts by `pairRoiSeconds ?? totalRoiSeconds`, price tiebreak (1304-1312).

Extract into:
```ts
export interface ResearchRankingItem {
  research: CommonResearch;
  price: number;
  currentLevel: number;
  targetLevel: number;
  timeToBuySeconds: number;
  canBuy: boolean;
  roiSeconds: number;
  totalRoiSeconds: number;
  pairRoiSeconds?: number;
  showSaleWarning?: boolean;
  showDeadlineWarning?: boolean;
}

export function rankResearchByROI(
  researchLevels: Record<string, number>,
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  isSale: boolean,
  absoluteSimTime: number,
  researchSaleDeadline: number,
  roiMode: 'immediate' | 'maxed_vehicles',
  deliveryImpactOnly: boolean
): ResearchRankingItem[]
```

converting every closure read (`costModifiers.value`, `isResearchSaleActive.value`,
`actionsStore.effectiveSnapshot`, `roiMode.value`, `deliveryImpactOnly.value`, the inline
`absoluteSimTime`/`nextSaleStart` computation at lines 1125-1132) into explicit params, same as
Phase A.

### K.2 — Hoist the ELR ranking branch

`sortedResearches`'s `elr` branch (lines 1315-1546) has two modes: `realistic` (full pipeline —
`getOptimalELRSet` + `computeRealisticELR`, with a lookahead search for multi-level research where
level+1 alone has no impact, lines 1337-1467) and `potential` (formula-based impact estimate, lines
1468-1511). Both compute `hpp` (hours per impact-percentage-point) and sort by it or by raw impact
depending on `elrSortMode`. Extract into:

```ts
export function rankResearchByELRImpact(
  researchLevels: Record<string, number>,
  rawBackup: unknown,
  startSnapshot: CalculationsSnapshot,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  isSale: boolean,
  absoluteSimTime: number,
  researchSaleDeadline: number,
  viewMode: 'realistic' | 'potential',
  sortMode: 'efficiency' | 'impact'
): ResearchRankingItem[] // reuses the K.1 item shape, plus impact/hpp fields
```

`realistic` mode needs `rawBackup` (from `initialStateStore.rawBackup`) — pass it through as a
param; if `null`/`undefined`, the function should return `[]` same as today (`useResearchViews.ts:1340`).

### K.3 — Extract the "buy until it fails the check" loop shape

`handleBuyUntilSaleWarning` (`ResearchActions.vue:427-439`) and `handleBuyUntilSaleDeadline`
(455-469) share one shape: repeatedly find the top-ranked item that `canBuy && !isMaxed &&
!showWarningField`, buy it, recompute the ranked list (since buying changes the math for
everything else), stop when nothing passes. This loop shape itself doesn't need its own file — it's
three lines wrapped in a `while` with a `maxIterations` guard — but write it once as a small
exported helper (e.g. in `researchRanking.ts` alongside the ranking functions) so both the manual
planner and the new auto-planner helper (K.4) call the identical stopping logic instead of two
independently-written copies of the same loop:

```ts
export function buyWhilePassingCheck(
  getCandidate: () => { researchId: string } | undefined, // re-ranks and picks the next candidate; caller closes over current state
  buyOne: (researchId: string) => boolean, // returns false if the purchase failed (stops the loop)
  maxIterations?: number // default 1000, matching ResearchActions.vue:430, 460
): number // count purchased
```

### K.4 — New auto-planner helpers

Add `src/auto/shifts/researchBuying.ts` (or fold into `milestones.ts` from Phase C, if it exists by
the time this phase runs) with `runBuyUntilSaleWarning(startState, context, timeLimit): ShiftResult`
and `runBuyUntilSaleDeadline(startState, context, timeLimit): ShiftResult`, each: call
`rankResearchByROI`/`rankResearchByELRImpact` (K.1/K.2) against the current `EngineState`, find the
first candidate passing the same check as the manual planner
(`!showSaleWarning`/`!showDeadlineWarning`), buy it via the standard `advanceTime`-credits-`bankValue`
and `applyAction` pattern, and loop via `buyWhilePassingCheck` (K.3) until nothing passes or
`timeLimit` is hit.

### K.5 — Do NOT swap C3's existing loops onto this yet (flag only)

`auto/shifts/c3.ts` already has **its own, independently-built** approximations of both rankings:
Step 1 (lines 214-269) uses `getBestEarningsRecommendation` from `strategist.ts` — a different
algorithm from K.1's ROI ranking (no pairing/bottleneck-partner logic, and it factors in a
`buildPhaseEnd`-aware "Meets A/B" filter that K.1 doesn't have at all). Step 2 (lines 271-431) is
its own inline ELR hpp/lookahead loop, structurally similar to K.2's `realistic` mode but built and
tuned independently (its own memoization via `context.elrMemo`, its own artifact-structure-locking
optimization). Swapping C3 to call K.1/K.2/K.4 instead would be a substantive rewrite of C3's core
logic, not a mechanical substitution — likely to change C3's simulated output, for better or worse,
and C3 is explicitly the most complex/highest-stakes shift in the plan (the user set it aside
initially for exactly this reason). Treat this swap as its own carefully-reviewed follow-up, later
and separately from K.1-K.4, with an explicit before/after comparison on real ascension data —
don't attempt it in the same session as K.1-K.4.

### Acceptance check for Phase K

For K.1-K.4: `pnpm vue-tsc --noEmit`, then in the manual planner switch to the ROI and Delivery
Impact (ELR) research views, toggle `roiMode`/`elrViewMode`/`elrSortMode`/`deliveryImpactOnly`
through their combinations, and confirm the candidate list, sort order, and sale-warning flags are
identical to before the hoist. Also re-click "Buy Until Sale Warning" / "Buy Until Sale Ends" and
confirm identical purchase sequences.

### Resolution (found when this phase was executed)

K.1-K.4 done as scoped; K.5 left untouched (flag-only, as the plan directs).

By the time this phase ran, the file had already shrunk from Phases A-C's earlier hoists — the
`roi`/`elr` branches actually lived at `useResearchViews.ts:708-902`/`904-1135` (pre-edit), not the
stale `1119-1313`/`1315-1546` line numbers this plan was originally written against. Re-located by
branch name per the top-level instructions; logic itself hadn't drifted.

**K.1/K.2 — `rankResearchByROI`/`rankResearchByELRImpact`**: both hoisted into new
`src/calculations/researchRanking.ts`, alongside the module-private constants/helpers they need
(`ROI_EXCLUDED_CATEGORIES`, `ELR_EXCLUDED_CATEGORIES`, `DELIVERY_IMPACT_CATEGORIES`,
`FLEET_RESEARCH_IDS`, `TRAIN_CAR_RESEARCH_ID`, `buildMaxVehiclesSnapshot`) moved out of
`useResearchViews.ts` since nothing else used them. `ResearchRankingItem` ended up broader than
this plan's sketch — it also carries `isLaying`/`isShipping`/`pairPartnerResearch` (ROI) and a
`lookahead` with its full internal shape including `timeRoiSeconds`/`realisticStats`, not just
`{minLevels, impact, hpp}` (ELR) — because trimming those at the calculation layer would have lost
information the view needs to reproduce the original output exactly (the recommendation-note
partner's name; the lookahead swap-in of hpp/timeRoiSeconds/realisticStats/impact used for display
when the item's own impact is non-positive). `timeToBuySeconds` is optional on the shared item
type: `rankResearchByROI` always sets it, `rankResearchByELRImpact` never does — matching the
pre-hoist code exactly, where the elr branch only ever set a `timeToBuy: ''` placeholder and relied
on `ResearchFlatView.vue`'s `item.timeToBuySeconds ?? getResearchTimeToBuySeconds(item.research)`
fallback to a live rate-based estimate. Preserving that (rather than "fixing" it to populate a real
value) was deliberate — this phase is scoped to be behavior-neutral, and this fallback is read
elsewhere as a live-vs-snapshot distinction, not an oversight. `rawBackup` is typed
`ei.IBackup | null | undefined` rather than the plan's suggested `unknown`, since `unknown` would've
forced an unsafe cast at the `getOptimalELRSet(rawBackup, ...)` call site — the precise type costs
nothing extra and type-checks cleanly.

Formatted display fields (`roiLabel`/`totalRoiLabel`/`timeToBuy` string/`extraStats`/`extraLabel`/
`recommendationNote` text) are **not** produced by the calculation functions — following Phase A's
"pure module free of formatDuration/display concerns" convention, they're built by two new mapping
functions in `useResearchViews.ts` (`toResearchViewItemFromROI`, `toResearchViewItemFromELR`,
alongside the existing `toResearchViewItem` for milestones). One consequence: `ResearchViewItem`
gained two fields it was missing (`timeRoiSeconds`, `lookahead`) that `ResearchFlatView.vue`'s own
separate `SortedResearchItem` prop type already expected — the elr branch's return value was never
actually type-checked against `ResearchViewItem` before (the `sortedResearches` computed has no
explicit return-type annotation, so each branch's literal shape flowed through untyped) — and
`timeToBuySeconds` was loosened from required to optional for the reason above.

**K.3 — `buyWhilePassingCheck`**: extracted as specified. Also updated
`ResearchActions.vue`'s `handleBuyUntilSaleWarning`/`handleBuyUntilSaleDeadline` to call it instead
of each keeping its own independently-written copy of the same `while` loop — in scope per the
plan's own framing of K.3 ("write it once ... so both the manual planner and the new auto-planner
helper call the identical stopping logic instead of two independently-written copies").

**K.4 — auto-planner helpers**: folded into `src/auto/shifts/milestones.ts` (it already existed by
the time this phase ran, per the plan's own fallback). Exported the file's existing
`createMilestoneShiftHelpers` (previously module-private) and reused its `buyResearch`/
`getModifiers`/`getAbsTime` rather than writing a fifth copy of the boundary-aware `advanceTime`
plumbing Phase L already flagged as duplicated four times. `runBuyUntilSaleWarning` isn't gated on
a sale being active (matching the manual planner's `canBuyUntilSaleWarning`, which has no such
gate — `showSaleWarning` is structurally always `false` while a sale is active, so the gate would
be redundant); `runBuyUntilSaleDeadline` is gated, matching `canBuyUntilSaleDeadline`. Neither
function has a UI to source `roiMode`/`deliveryImpactOnly` (ROI) or `elrViewMode`/`elrSortMode`
(ELR) from, so they hardcode the manual planner's own defaults (`'immediate'`/`false` and
`'realistic'`/`'efficiency'` respectively) — documented inline in each function's doc comment.
Neither new export is wired into `index.ts` or called from any shift, consistent with how Phase
C's three helpers were left unreferenced too — wiring is a "Not in scope" follow-up either way.

**Bug found, not fixed (out of scope)**: `runTierUnlockMilestone` (Phase C,
`milestones.ts`) computes `researchSaleDeadline = getNextSaleStart(absoluteSimTimeAtStart)`. That
should be `getNextSaleEnd` (the actual sale-end/deadline function, matching the manual planner's own
`researchSaleDeadline` computed and `auto/calendar.ts`'s doc comments) — as written, while a sale is
active, `getNextSaleStart` returns *next week's* sale start (six-ish days out) instead of the
current sale's end (next Saturday 9am), making `showDeadlineWarning` in that code path essentially
never fire correctly. This is pre-existing Phase C code, not something K.1-K.4 touches or needs to
fix — flagging it here (same as Phases H/I/J flag-only findings) so a future pass fixing it doesn't
have to rediscover it. K.4's own new code uses `getNextSaleEnd` correctly.

Verified with `pnpm vue-tsc --noEmit` (clean) and `eslint --fix` on the four touched files (only
pre-existing, unrelated warnings remain — e.g. already-dead imports in `useResearchViews.ts` that
predate this phase, and one pre-existing `any` in `milestones.ts`'s Phase C code). Confirmed the
auto planner's existing behavior is completely unaffected: grepped `ascension.ts`, `shifts/index.ts`,
and `useAscensionGenerator.ts` and confirmed nothing calls `runBuyUntilSaleWarning`/
`runBuyUntilSaleDeadline` (or Phase C's three `milestones.ts` exports) yet, so no currently-generated
plan can change. Per the top-level instructions, live manual-planner verification (switching ROI/ELR
views, toggling modes, re-clicking "Buy Until Sale Warning"/"Buy Until Sale Ends") is left to the
user's own browser check rather than the `run` skill/dev server.

---

## Phase L — C3: wait-for-event actions (confirm coverage, dedupe `advanceTime`) [x]

**Touches**: optionally a new shared `advanceTime` helper file (e.g.
`src/auto/shifts/advanceTime.ts`) if you choose to act on the duplication noted below — not
required for C3 to have this capability, since it already does. No dependency on other phases.

`handleWaitResearchSale`/`handleWaitEarningsBoost` (`WaitForEventActions.vue:100-195`) compute
"seconds until the next Friday/Monday 9am Pacific" via the already-shared `getNextPacificTime`
(`src/lib/events.ts`) and push a `wait_for_research_sale`/`wait_for_earnings_boost` action followed
by a `toggle_sale`/`toggle_earnings_boost` action. **This is already covered for the auto planner**:
`c3.ts`'s (and `c1.ts`'s) boundary-aware `advanceTime` (`c3.ts:76-156`, byte-for-byte identical to
`c1.ts:87-166`) already steps up to the next sale/boost boundary, emits the matching
`wait_for_research_sale`/`wait_for_earnings_boost` action type when it lands exactly on one
(lines 104-106), and toggles `toggle_earnings_boost`/`toggle_sale` right after (134-154) — the same
end result as the manual buttons, just triggered automatically whenever a wait crosses a boundary
rather than as an explicit standalone action. There is nothing new to build here.

What *is* worth doing: `c1.ts:87-166` and `c3.ts:76-156` are **identical copies** of this
boundary-stepping `advanceTime`. Every other shift file (`k1.ts`, `k2.ts`, `i1.ts`, `r1.ts`, `k3.ts`)
uses a simpler, non-boundary-aware version instead (per `AGENT.md`'s documented gotcha). If C3 ever
needs the boundary-aware version's logic changed (e.g. as part of Phase K.5's eventual rewrite),
fix it in one place: hoist the boundary-stepping `advanceTime` out of `c1.ts`/`c3.ts` into one
shared function both files call, parameterized on `currentState`/`actions`/`elapsedSeconds` the same
way `quickWins.ts` already threads mutable loop state through explicit params/return values (see
Phase B's note on that pattern). This is pure deduplication, not a new capability — do it opportunistically,
not as a blocking prerequisite for anything else in this plan.

### Acceptance check for Phase L

If you do the `advanceTime` dedupe: run the full auto planner (generate a plan end-to-end) before
and after, and confirm C1's and C3's simulated purchases/timings are byte-for-byte identical.

### Resolution (found when this phase was executed)

Coverage confirmed as already-complete per the phase's own framing — no new capability needed.

Did the dedupe: added `src/auto/shifts/advanceTime.ts` exporting `advanceTimeWithBoundaries`,
following the same "thread mutable state through explicit params/return values, mutate `actions`
in place" convention `quickWins.ts` already established (referenced directly in its doc comment).
`c1.ts` and `c3.ts` now both define a one-line `advanceTime` wrapper that calls the shared
function and reassigns their own local `currentState`/`elapsedSeconds` from the result; none of
their call sites needed to change (`c1.ts`: 1 call site; `c3.ts`: 6 call sites), only the
`advanceTime` closure's own body. Along the way, dropped a dead local (`nextSaleEnd = ...+ 24 *
3600`, computed but never read — the boundaries array already called `getNextSaleEnd(absTime)`
directly) that existed identically in both copies; not a behavior change, since it was unused.
Removed now-unused imports (`calculateEggsDeliveredForTime` from both files; `getNextSaleEnd` from
`c1.ts` only — `c3.ts` still uses it directly in its own Step 1/Step 2 boundary lists, which are
separate from `advanceTime` and out of this phase's scope). `pnpm vue-tsc --noEmit` passes.

Not folded in: `milestones.ts`'s `createMilestoneShiftHelpers` (Phase C) has its own,
near-identical boundary-aware `advanceTime`, and `c2.ts` (Phase G's Resolution) has a fourth copy
with an extra `offlineEarnings` cache-invalidation line bolted on, making it not byte-for-byte
identical to the other three. Per Phase G's Resolution, unifying `c2.ts`/`milestones.ts` onto one
shared implementation is left for a future pass alongside the other "Not in scope" wiring
follow-ups, rather than expanding this phase's scope beyond its named target (`c1.ts`/`c3.ts`).

No live end-to-end before/after run was done (per the top-level instructions, the `run` skill /
dev server is off-limits during this refactor); verified instead by line-by-line diff against the
pre-edit `advanceTime` bodies in both files (confirmed identical apart from the dead-code removal
above) plus the type check. Per the plan's process, live verification of C1/C3 plan output is left
to the user's manual browser check.

---

## Not in scope (follow-up phases, after A–C are merged)

- **Wiring `runSmartBuyForSeconds` / `runTierUnlockMilestone` / `runResearchMilestoneIfWorthwhile`
  into `c1.ts`'s actual Phase 1–4 control flow**, replacing or supplementing
  `findTierUnlockCandidate` and the interleaved loop. This changes C1's simulated output and needs
  its own before/after comparison (does replacing the heuristic change total simulated ascension
  time?), so treat it as a separate change with its own review, not bundled into this extraction.
- Similarly, **wiring `simulateHabPurchases` into `i1.ts`** (Phase E.3), and **wiring
  `planMaxVehicles`/`planVehiclesWithinBudget` into `k1.ts`/`k2.ts`** (Phases D.4/F.3) in place of
  their existing hand-rolled loops — each is a potential behavior change to that shift's simulated
  output and deserves its own before/after comparison, not a silent swap. **Do `k3.ts`'s identical
  vehicle-buying block (Phase J.3) in the same pass as `k2.ts`**, not separately — swapping only one
  of the two byte-for-byte-identical call sites would make them drift instead of staying in sync.
- **Wiring `c2.ts` onto `milestones.ts`'s `runSmartBuyForSeconds`/`runTierUnlockMilestone`/
  `runResearchMilestoneIfWorthwhile`** in place of its own hand-rolled `buyResearch`/`tryUnlockTier`
  (see Phase G's Resolution) — same behavior-change caveat as the C1/I1/K1/K2 items above. Also
  worth folding into whichever session eventually dedupes the boundary-aware `advanceTime` (Phase
  L): as of Phase G, that logic is now duplicated **four** times (`c1.ts`, `c3.ts`, `c2.ts`,
  `milestones.ts`), not two.
- **"Buy Until Sale Warning" / "Buy Until Sale Ends" logic** (`ResearchActions.vue:427-469`,
  `nextRoiCandidate`/`nextElrCandidate` at `416-418`/`444-446`, and the `showSaleWarning`/
  `showDeadlineWarning` computation inside `sortedResearches`'s `roi`/`elr` branches in
  `useResearchViews.ts`) — these are the two most recent commits' buttons, not part of the C1 list
  the user gave, but likely a future "C2" or "C3" phase in this same style once C1's is done. The
  `showSaleWarning`/`showDeadlineWarning` fields are already computed via the shared
  `calculateResearchROI` (`src/calculations/researchROI.ts`), so this should be a smaller lift than
  Phases A–C once it's tackled — mostly extracting the "repeatedly buy top-ranked-and-passing item,
  recalculating after each purchase" loop shape itself.
- **"Continue Current" ELR uses `skipGrowth: true` on a live farm snapshot** (found during Phase
  J.1, `useAscensionGenerator.ts:397`): this discards the player's real, current population in favor
  of assuming hab capacity is already reached, optimistically understating TE wait times whenever
  the real farm hasn't finished repopulating. A correct fix needs the manual planner's hab-fill-phase
  growth math (`BulkWaitForTEActions.vue`'s `eggPlans`, via `integrateRate`), not a one-line option
  swap — see Phase J's Resolution for detail. Flagged, not fixed, since it's a bigger and more
  delicate change than Phase J's `te-thresholds.ts`/`te-wait.ts` scope anticipated.
- `src/auto/shifts/quickWins.ts` unification with `findSmartBuyCandidate` — explicitly rejected
  above; revisit only if the duplication becomes a maintenance problem.

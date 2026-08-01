# Event-Aware Purchasing (Sale + Earnings Boost) → New ROI-Deadline Button → C3 Rework

> **AGENT INSTRUCTIONS**:
> - This plan is written to be executed **one phase per chat session** — same convention as
>   `REFACTOR_SHARED_LOGIC.md`/`WIRE_SHARED_LOGIC.md` in this same directory.
> - Read this entire file before starting, but only **work on the single next incomplete phase**
>   (first unchecked `## Phase` heading). Do not jump ahead.
> - Line/location references are as of the commit this plan was written against (working tree as of
>   2026-07-31, on top of the uncommitted "shared logic" refactor). Re-locate by function name if
>   lines have drifted.
> - After finishing a phase: run `pnpm vue-tsc --noEmit`, follow that phase's Acceptance section, and
>   mark the phase `[x]` below. Then stop and let the user decide whether to continue in this chat or
>   start a fresh one — do not proceed to the next phase automatically.
> - Do not touch files outside `wasmegg/ascension-planner` unless a phase explicitly says to.
> - Where a phase's acceptance check calls for a manual browser check, per this repo's established
>   convention do **not** use the `run` skill / dev server yourself — leave that verification to the
>   user, and rely on `pnpm vue-tsc --noEmit` plus a throwaway fixture script instead.

## Context

This started as a request to rework `src/auto/shifts/c3.ts` to accept a sale-count parameter and
a "try to unlock Tier 13" parameter (Phase 6 below). While designing that, a bigger, more
foundational problem surfaced: the **research sale** (70% off, 24h from Friday 9AM Pacific) and
**earnings boost** (2x earnings, 24h from Monday 9AM Pacific) events are handled inconsistently
across the codebase — some code paths correctly track them as simulated time crosses a boundary,
others silently freeze whatever the state was at the *start* of a calculation and never revisit it,
even when the calculation's own simulated clock advances past a Monday/Friday 9am boundary. Fixing
this first, for **both** the manual and auto planners, directly simplifies the C3 rework (C3's
current hand-rolled Step 1/Step 2 loops exist partly *because* the shared "smart buy" primitives
weren't reliably boundary-aware) and sets up a new button (Phase 5) that C3's Step 1 can eventually
delegate to.

Six phases, meant to be executed roughly in order (dependencies noted per phase).

## Investigation findings (what's already correct vs. silently wrong)

**Already boundary-aware** (correctly re-derives sale/boost state as simulated time advances):
- `advanceTimeWithBoundaries` (`src/auto/shifts/helpers/advanceTime.ts:92-179`) — steps to the
  nearest boundary, credits earnings at the live rate per sub-interval, toggles
  `state.earningsBoost.active`/`state.activeSales.research` and emits `toggle_earnings_boost`/
  `toggle_sale` actions when crossed.
- `createMilestoneShiftHelpers.buyResearch`, `runBuyUntilSaleWarning`, `runBuyUntilSaleDeadline`
  (`src/auto/shifts/helpers/milestones.ts`) — re-derive `isResearchSaleActive(getAbsTime())` fresh
  every loop iteration and advance via the boundary-aware helper above.
- `calculateEarningsForTime` (`src/engine/apply/math.ts:73-136`) — but only **one direction**: an
  *active* boost *expiring* mid-window is modeled (splits the integral); a boost *starting* mid-window
  while currently inactive is not.

**Silently assumes a flat/frozen rate** (the actual bug):
- `applyTime` (`src/engine/apply/time.ts:35`) calls `calculateEarningsForTime(seconds, prevSnapshot)`
  with **no boundary info at all** — worse than the one-directional case above. This is the generic
  "advance time" primitive used throughout `milestoneChain.ts` and elsewhere.
- All five functions in `src/calculations/milestoneChain.ts` (`computeResearchMilestoneChain`,
  `simulateCheapestFirstTierChain`/`computeCheapestFirstTierChain`, `computeTierMilestoneChain`,
  `computeMilestoneBaseline`) take one fixed `isSale: boolean`, applied to every purchase in the
  simulated chain regardless of how much time the chain itself advances — a chain crossing a
  Monday/Friday 9am boundary silently mis-prices and mis-rates every purchase after it. Execution
  (`runTierUnlockMilestone` et al.) *does* advance/toggle state correctly, but blindly trusts these
  stale precomputed prices/waits — a real plan-vs-execution divergence bug.
- `rankResearchByROI`/`rankResearchByELRImpact` (`src/calculations/researchRanking.ts`) and
  `calculateResearchROI` (`src/calculations/researchROI.ts`) take one fixed `isSale` per call and
  only have the one-directional boost handling noted above.
- Manual planner: `handleBuyMilestoneChain`/`handleBuyUntilSaleWarning`/`handleBuyUntilSaleDeadline`
  (`src/components/actions/ResearchActions.vue`) execute purchases against whatever
  `activeSales.research`/`earningsBoost` the snapshot has *at click time* and **never** insert a
  toggle/wait action — even though the exact data model and working executors for this already
  exist (`toggle_sale`/`toggle_earnings_boost`/`wait_for_research_sale`/`wait_for_earnings_boost`
  action types, `toggleSale.ts`/`toggleEarningsBoost.ts`/`waitForResearchSale.ts`/
  `waitForEarningsBoost.ts` executors) and are already used successfully by a *different* component,
  `WaitForEventActions.vue`. This is purely a "button never calls the existing machinery" gap, not a
  missing-feature gap.
- `MilestoneChainItem`/`ResearchRankingItem` have `showSaleWarning`/`showDeadlineWarning`, but these
  mean "you should hold off" (70%-payback-before-next-sale / finishes-after-sale-ends) — **not**
  "this purchase happens during a sale." There is no equivalent field at all for earnings boost.

**Reusable, planner-neutral calendar math already exists**: `src/auto/calendar.ts`'s
`getNextSaleStart`/`getNextSaleEnd`/`isResearchSaleActive`/`getNextEarningsBoostStart`/
`getNextEarningsBoostEnd`/`isEarningsBoostActive` are thin, dependency-free wrappers around
`src/lib/events.ts`'s shared `getNextPacificTime` (already imported by `milestoneChain.ts` directly
for its ROI-timing calc) — nothing about them is auto-planner-specific.

## Phase 0 — Relocate calendar predicates to a planner-neutral home [x]

**Touches**: `src/auto/calendar.ts`, its call sites, possibly `src/composables/useResearchViews.ts`.

Move (or re-export) `getNextSaleStart`/`getNextSaleEnd`/`isResearchSaleActive`/
`getNextEarningsBoostStart`/`getNextEarningsBoostEnd`/`isEarningsBoostActive` to a
planner-neutral home — simplest option: keep them in `src/auto/calendar.ts` but confirm nothing
stops manual-planner code from importing directly from there (there's no Vue/Pinia dependency in
that file, so this may not require moving anything, just importing across the current `auto/`
boundary); if that feels wrong stylistically, relocate to `src/lib/events.ts` alongside
`getNextPacificTime` and have `auto/calendar.ts` re-export for its existing call sites.

**Verify before assuming reuse**: `useResearchViews.ts:254` defines its own `isResearchSaleActive`.
Check whether it's a duplicate reimplementation of the same calendar math (in which case delete it
and import the shared one) or whether it reads a different, present-tense concept (e.g. sale state
as reported by the imported game backup rather than predicted from Pacific time) — if the latter,
keep both concepts distinct: "is a sale active right now, per the backup" (t=0 only) vs. "will a
sale be active at future simulated time T" (needed by every phase below).

### Resolution (found when this phase was executed)

Relocated all six functions (`getNextSaleStart`/`getNextSaleEnd`/`isResearchSaleActive`/
`getNextEarningsBoostStart`/`getNextEarningsBoostEnd`/`isEarningsBoostActive`) from
`src/auto/calendar.ts` into `src/lib/events.ts` (next to `getNextPacificTime`, which they already
wrapped), and **deleted** `src/auto/calendar.ts` rather than leaving a re-export shim — matches this
repo's stated convention (see `REFACTOR_SHARED_LOGIC.md` Phase A.3) of updating call sites directly
instead of adding backwards-compat shims. Seven call sites updated to import from `@/lib/events`:
`auto/ascension.ts`, `auto/useAscensionGenerator.ts`, `auto/shifts/c1.ts`, `auto/shifts/c3.ts`,
`auto/shifts/helpers/advanceTime.ts`, `auto/shifts/helpers/milestones.ts`,
`auto/shifts/helpers/vehicles.ts`. `pnpm vue-tsc --noEmit` is clean.

Checked `useResearchViews.ts:254`'s `isResearchSaleActive` — it is **not** a duplicate: it's a
`computed(() => actionsStore.effectiveSnapshot.activeSales.research)`, reading the present-tense
sale flag off the current simulated `EngineState` (whatever the backup import / prior actions left
it as), not a calendar-time prediction. This is the same kind of present-tense flag the auto
planner's own `startState.activeSales.research` is — legitimately different from `@/lib/events`'s
new `isResearchSaleActive(timestampSeconds)`, which predicts sale status at an arbitrary *future*
absolute time. Both are needed and both stay as-is; no change made here. Note the naming collision
for later phases: any manual-planner file that needs both concepts (the composable's present-tense
ref and the calendar function for future-time prediction, e.g. Phase 4's toggle-action logic) will
need to import the calendar version under an alias (e.g. `isResearchSaleActiveAt`).

## Phase 1 — Boundary-aware earnings math (shared engine layer) [x]

**Touches**: `src/engine/apply/math.ts`, `src/engine/apply/time.ts`, callers in
`src/calculations/researchROI.ts`. **Depends on Phase 0** for the calendar predicates callers need.

Key insight: egg-delivery physics (population growth toward hab cap, shipping cap) are completely
independent of the earnings boost — the boost is a pure post-hoc multiplier on the dollar value of
delivered eggs. So a boost-boundary crossing only ever changes the **$-per-egg conversion factor**
(today's `V1`/`V2` in `calculateEarningsForTime`), never the underlying egg-integral. That means
generalizing from "one active-boost-expires split" to "N boost transitions" is a mechanical
extension of the existing split-integral pattern, and the inverse problem (`getTimeToSave`) can
reuse `solveForTime` unchanged per regime by **re-anchoring `P0`** to the population already reached
at that regime's start time (`min(P0 + I*t_transition, HabCap)`) — no new closed-form math needed.

1a. Generalize `calculateEarningsForTime` (`math.ts:73`) to accept a sorted list of transitions
    (e.g. `{ atSeconds: number; boostActive: boolean }[]`) instead of a single `expirationSeconds`,
    walking as many segments as fall within `[0, seconds]` and summing
    `V_segment * (eggs_at_segment_end - eggs_at_segment_start)` per segment via the existing
    `integrateRate`. Keep it backward compatible: today's single-expiration callers become a
    one-element transitions array.
1b. Add a boundary-aware `getTimeToSave` (or a new variant alongside it) accepting the same
    transitions shape, walking regimes in order, checking whether the target is reached within the
    current regime (via `solveForTime` with `P0` re-anchored at the regime's start), else
    accumulating dollars earned in that regime and moving to the next.
1c. `applyTime` (`time.ts:35`) currently calls `calculateEarningsForTime` with **no** transitions —
    fix this call site to pass them through (this single line is the most-used flat-rate bug in the
    codebase, since `applyTime` backs nearly every wait in `milestoneChain.ts`).
1d. Callers that have absolute-time context (`researchROI.ts`, and Phase 2's `milestoneChain.ts`)
    build the transitions list from Phase 0's calendar predicates relative to their own current
    simulated absolute time.

**Acceptance**: `pnpm vue-tsc --noEmit` clean; write a throwaway script computing
`calculateEarningsForTime`/`getTimeToSave` across a synthetic boundary crossing (boost starts
partway through a wait) and confirm the credited amount matches manual step-by-step integration
(split into pre-boost and boosted segments) rather than the old flat (wrong) answer.

### Resolution (found when this phase was executed)

Implemented as designed, with signatures matching this section exactly: `EarningsRateTransition {
atSeconds, boostActive }` exported from `math.ts`; `calculateEarningsForTime`/`getTimeToSave` both
take `transitions: EarningsRateTransition[] = []` as their new 3rd param (fully backward compatible
— every other call site in the codebase calls with 2 args, so `[]` is substituted and behavior is
unchanged); `applyTime` threads `options.transitions` through to `calculateEarningsForTime`
(previously called with no boundary info at all). `researchROI.ts` gets a small
`boostTransitionFor(snapshot, atSeconds)` helper that builds the one-element transition array from
a snapshot's current `earningsBoost.active` and a relative seconds-until-flip value, replacing both
of its old flat calls (the `getTimeToSave` wait-time call, and the `calculateEarningsForTime`-based
ROI-horizon `getExtra` calls).

One extra generalization beyond the original one-directional case: `getTimeToSave` had **zero**
boost awareness before this phase (not even the one-directional case
`calculateEarningsForTime` already had) — it's now fully regime-aware, walking each transition and
re-anchoring `solveForTime`'s `P0` at each regime boundary (`popAt(t) = min(HabCap, P0 + I*t)`,
proven equivalent to letting the original growth curve continue, since restarting the same linear-
capped growth formula from an already-reached population gives an identical curve).

Verified with a throwaway script (`node --experimental-strip-types`, importing `math.ts` directly by
disk path — no test runner exists yet in this workspace) against a synthetic flat-population
snapshot (`offlineIHR: 0`, population pinned at hab cap, so egg delivery is a simple linear rate and
every number can be hand-verified): (1) boost **starting** mid-window — the new case — matches
manual segment-by-segment integration; (2) boost **ending** mid-window — the pre-existing case —
still matches, confirming no regression; (3) a transition at `atSeconds <= 0` (stale-flag
correction) applies the post-transition rate to the whole window, matching the old "already
expired" branch; (4) no transitions at all matches a flat computation; (5)/(6) `getTimeToSave`
across a boost-start boundary and with no transitions both match hand-computed values. All 6 checks
passed. `pnpm vue-tsc --noEmit` is clean.

Also fixed, while reviewing this area (found by the user, not part of the original phase scope, but
same "wrong sale flag" class of bug): `src/auto/shifts/helpers/vehicles.ts`'s `runMaxVehiclesPlan`
was passing the **research** sale's calendar-predicted value into `planMaxVehicles`'s vehicle-price
`isSaleActive` parameter — vehicle sales are a fully independent, manual-toggle-only event
(`EngineState.activeSales.vehicle`, no calendar schedule), same as habs. Fixed to read
`currentState.activeSales.vehicle` directly (matching how the manual planner's `VehicleActions.vue`
already does it correctly). Since K1/K2/K3 all delegate to this one function, the fix applies
everywhere vehicles are purchased in the auto planner. Separately noted but **not** fixed:
`runHabPurchasePlan` (`helpers/habs.ts:17-19`) hardcodes hab sale as always inactive — this one is an
explicitly documented, deliberate simplification, not a silent wrong-flag bug, so left as-is.

## Phase 2 — `milestoneChain.ts`: boundary-aware chains + sale/boost annotations [x]

**Touches**: `src/calculations/milestoneChain.ts`, its callers (`useResearchViews.ts`,
`src/auto/shifts/helpers/milestones.ts`). **Depends on Phase 1.**

2a. Thread `absoluteSimTimeAtStart` into all five exported functions (today only
    `computeTierMilestoneChain`/`reorderTierChainByROI` have it). Drop the frozen `isSale: boolean`
    parameter in favor of deriving it live at each loop iteration:
    `isResearchSaleActive(absoluteSimTimeAtStart + totalSeconds)`.
2b. Replace every `applyTime`/`getTimeToSave` call in this file with Phase 1's boundary-aware
    versions, feeding them transitions computed from the current point in the chain's simulated
    timeline (not from a value frozen at the top of the function).
2c. Add `duringSale: boolean` and `duringEarningsBoost: boolean` to `MilestoneChainItem`, set from
    live calendar state at each item's actual purchase moment
    (`absoluteSimTimeAtStart + buyToHereSeconds`) — distinct from the existing `showSaleWarning`/
    `showDeadlineWarning` ("you should wait") semantics, which stay unchanged.
2d. No code changes expected in `runTierUnlockMilestone`/`runResearchMilestoneIfWorthwhile`
    (`src/auto/shifts/helpers/milestones.ts`) — they already execute via boundary-aware
    `advanceTime`; this phase just makes the upfront plan they execute stop silently diverging from
    that correct execution. Confirm this with a before/after comparison on a fixture chain that
    spans a boundary.

**Acceptance**: `pnpm vue-tsc --noEmit` clean; throwaway script building a milestone chain that
provably spans a Friday-9am and/or Monday-9am boundary (pick a fixture start time close to one),
confirm per-item prices/waits change appropriately after the boundary and `duringSale`/
`duringEarningsBoost` flip correctly.

### Resolution (found when this phase was executed)

Implemented largely as designed, with one refinement to the "no calendar-schedule dependency"
framing: rather than syncing `state.earningsBoost.active`/`activeSales.research` to calendar truth
at every step (which would have meant touching every `computeSnapshot` call site in the file), added
a single private helper, `boostTransitionsFrom(snapshot, absTime)`, that always derives the transition
list from calendar truth at `absTime` and — when the snapshot's own (possibly stale, never-toggled)
`earningsBoost.active` flag disagrees with that truth — includes an `atSeconds <= 0` past-correction
transition. This is provably correct without needing to touch `state.earningsBoost.active` at all:
the snapshot's own rate (`V1`) always correctly represents "the rate for whichever state the flag
reflects," and the boundary-aware math (Phase 1) derives the *other* state's rate by multiplying/
dividing by the boost multiplier — so only the segment assignment needs correcting, never `V1`
itself. All five exported functions (`computeResearchMilestoneChain`,
`simulateCheapestFirstTierChain`/`computeCheapestFirstTierChain`, `computeTierMilestoneChain`,
`computeMilestoneBaseline`) plus the private `reorderTierChainByROI` now take
`absoluteSimTimeAtStart: number` instead of a frozen `isSale: boolean`, deriving `isSale` fresh via
`isResearchSaleActive(currentAbsoluteTime)` at the top of each loop iteration (matching the
already-correct pattern in `helpers/milestones.ts`'s `createMilestoneShiftHelpers.buyResearch`: price
is locked in at decision time, before the wait — not re-priced if a sale starts/ends mid-wait,
consistent with that established convention) — and passing `boostTransitionsFrom(...)`'s output into
every `getTimeToSave`/`applyTime` call in the file.

`duringSale` is set to the same `isSale` value used to price that item (decision-time truth, so it
reflects what was actually charged); `duringEarningsBoost` is evaluated at the purchase-completion
moment (`currentAbsoluteTime + secondsToBuy`), since boost never affects price — only the earning
rate while saving up — so purchase-completion time is the more meaningful reading for a list UI.

Both caller files updated: `useResearchViews.ts`'s `milestoneChainResult`/`milestoneBaselineResult`
computeds now compute `absoluteSimTime` once (hoisted out of the tier-only branch, since the research
branch needs it too now) and pass it through; `helpers/milestones.ts`'s `runTierUnlockMilestone`/
`runResearchMilestoneIfWorthwhile` simply pass their already-computed `absoluteSimTimeAtStart`
directly instead of a derived `isSale` local.

Verification: no test runner exists in this workspace (confirmed again this phase), and the full
chain functions transitively depend on `computeSnapshot`/`createBaseEngineState`, which pull in
Pinia-store-backed modules (`@/stores/silos`, etc.) — not practical to exercise standalone without
mocking a Pinia app context, so this wasn't attempted. Instead verified the piece that's genuinely
new this phase — the calendar-boundary derivation `boostTransitionsFrom` relies on — with a
throwaway script (`node --experimental-strip-types`) against **real** Monday-9am/Friday-9am Pacific
boundaries (not synthetic timestamps): confirms `isEarningsBoostActive`/`isResearchSaleActive` flip
at the exact boundary, and that `boostTransitionsFrom`'s three cases (far from any boundary; snapshot
stale and truth has already flipped since; snapshot already matches truth) each produce the right
transition list. 13/13 checks passed. This was cross-checked by eye against the real (non-exported)
function in `milestoneChain.ts` rather than executed against it directly. Combined with a full manual
re-read of every edited call site (confirming `transitions`/`isSale`/`currentAbsoluteTime` are
threaded consistently) and a clean `pnpm vue-tsc --noEmit` across the whole workspace (which does
verify every signature change lines up at every call site), this is the practical ceiling for
verification depth without adding test infrastructure to the workspace — flagging this as something
to exercise for real once the manual browser check happens in Phase 4 (chain output will visibly
change if this phase has a bug).

### Follow-up fix (found by the user immediately after this phase): severe performance regression

The user reported the manual planner freezing for several seconds on **every** purchase click
(Smart Buy included, not just milestone buttons) right after this phase landed. Root cause: this
phase's live `isSale`/`boostTransitionsFrom` derivation calls `getNextPacificTime` (`src/lib/
events.ts`) inside every simulated purchase step — that function does a brute-force hour-by-hour
search (up to ~200 `Intl.DateTimeFormat` calls per lookup). Before this phase, `milestoneChain.ts`'s
inner loops called zero calendar functions (`isSale` was a frozen boolean; boost wasn't checked at
all); this phase added roughly 5 such lookups per step. Combined with `computeTierMilestoneChain`'s
pre-existing pattern of re-running a full `simulateCheapestFirstTierChain` sub-simulation every
outer iteration (already effectively quadratic in purchase count), a tier-unlock chain needing
hundreds of purchases could hit hundreds of thousands of these expensive lookups.

Separately, this explains why Smart Buy (unrelated code) also appeared to freeze:
`ResearchActions.vue`'s template reads `milestoneSummary`/`milestoneChainResult` directly inside a
`v-if` condition, so Vue evaluates that computed on **every** re-render — which happens after any
purchase anywhere in the view, not just ones made from the Milestones tab. With a milestone target
selected, every buy action anywhere now re-ran the slow computation.

Fix: rather than touching the DST-sensitive brute-force search itself (risky), added a memoizing
cache in front of it in `src/lib/events.ts`. `getNextPacificTime`'s answer for a given
`(targetDayOfWeek, targetHour)` only changes once `fromTimestampSeconds` actually crosses the
previously-found boundary, so the last `{from, result}` pair is cached per (day, hour) and reused
whenever the new query is `>= from` and still `< result` — provably correct (not an approximation):
if `result` is the smallest match `> from`, and the new query is `>= from` and `< result`, there
cannot be an earlier match being missed. Verified with a throwaway script: cached results are
byte-identical to fresh computation across 500+ repeated nearby queries, correctly advance once a
boundary is crossed, and a synthetic workload matching the milestone-chain call pattern (200,000
calendar calls) now completes in ~11ms instead of what would have been tens of millions of
`Intl.DateTimeFormat` operations. `pnpm vue-tsc --noEmit` clean.

## Phase 3 — `researchRanking.ts`: same annotations + `earningsDelta` exposure [x]

**Touches**: `src/calculations/researchRanking.ts`. **Depends on Phase 1** (not Phase 2 — this file
doesn't call `milestoneChain.ts`).

3a. Add `duringSale`/`duringEarningsBoost` to `ResearchRankingItem`, same live-derivation approach
    as 2c, computed at `absoluteSimTime + timeToBuySeconds`.
3b. Expose `earningsDelta` on `ResearchRankingItem` (already computed internally via
    `calculateResearchROI`'s result, just not currently surfaced) — needed by Phase 5's deadline
    check.

### Resolution (found when this phase was executed)

Simpler than Phase 2: unlike `milestoneChain.ts`, this file has no internal purchase loop — each
call to `rankResearchByROI`/`rankResearchByELRImpact` represents a single "right now" ranking, and
callers (`runBuyUntilSaleWarning`/`runBuyUntilSaleDeadline` in the auto planner) already re-call it
fresh every loop iteration with a freshly-derived `isSale`/`absoluteSimTime` (confirmed back in
Phase 1's investigation). So no live-derivation change was needed inside this file — `duringSale` is
just set to the same `isSale` value already passed in (decision-time truth, matching what would
actually be charged), and `duringEarningsBoost` to
`isEarningsBoostActive(absoluteSimTime + <that candidate's own timeToBuySeconds>)` — purchase-
completion time, same convention as Phase 2's `MilestoneChainItem` fields.

`earningsDelta` needed two sources depending on branch: `rankResearchByROI`'s default ("immediate")
mode already gets it for free from `calculateResearchROI`'s return (just wasn't destructured before);
the `'maxed_vehicles'` mode does its own custom binary-search ROI calc with no `calculateResearchROI`
call, so it derives an equivalent value the same way `strategist.ts`/`researchROI.ts` already do
elsewhere in this codebase (`price / roiSeconds` when `roiSeconds` is finite and positive, else `0`)
— consistent with the existing convention rather than inventing a new one. `rankResearchByELRImpact`
leaves `earningsDelta` unset in both its branches — a lay-rate/shipping-impact ranking has no $/sec
concept, matching this interface's existing pattern of ROI-only and ELR-only fields.

One subtlety preserved deliberately: when the "bottleneck pairing" logic finds a better combined ROI
for a laying/shipping candidate paired with its bottleneck partner, the final returned item still
carries the item's own **solo** `earningsDelta`/`price`/`roiSeconds` (only `pairRoiSeconds` is added
as an extra hint) — matching how `price`/`roiSeconds` themselves already work in that branch. The
pairing only ever affects display/ranking order, never what's actually charged for a single-item
purchase, so `earningsDelta` staying solo is consistent with that.

Verification: this phase only plumbs through additional read-only fields via functions already
validated in Phases 1–2 (`isEarningsBoostActive`, the established `price/roiSeconds` formula) — no
new boundary-crossing math, so the risk profile is much lower than Phase 1/2. `pnpm vue-tsc --noEmit`
is clean, confirming every `ResearchRankingItem` construction site (both ranking functions, both
branches of `rankResearchByROI`, both branches of `rankResearchByELRImpact`) supplies the two new
required fields with correct types.

## Phase 4 — Manual planner: display annotations + real toggle-action creation [x]

**Touches**: `src/components/actions/ResearchActions.vue`, whatever renders the milestone/ROI/
delivery-impact lists (likely via `useResearchViews.ts`'s `ResearchViewItem`, plus
`MilestoneTargetPicker.vue`). **Depends on Phases 2-3** for the data fields.

4a. Render "during sale" / "during 2x earnings" indicators wherever ranked/chain lists show —
    driven entirely by Phase 2/3's new fields, pure display work.
4b. Rewrite `handleBuyMilestoneChain`, `handleBuyUntilSaleWarning`, `handleBuyUntilSaleDeadline` to
    insert `wait_for_research_sale`+`toggle_sale` / `wait_for_earnings_boost`+`toggle_earnings_boost`
    action pairs at the right points in the purchase sequence, whenever the live state needs to flip
    before the next purchase in the (now-correctly-computed) plan. **Reuse the exact executors
    `WaitForEventActions.vue` already calls successfully** (`toggleSale.ts`, `toggleEarningsBoost.ts`,
    `waitForResearchSale.ts`, `waitForEarningsBoost.ts`) — no new action types, no new executors,
    just the same calls from a new call site.
4c. Add help text/tooltips to these three buttons (and Phase 5's new one) explaining their actual
    behavior in plain language — the current semantics are genuinely non-obvious (e.g. "sale
    warning" means "you should wait," not "this buys during a sale" — exactly the confusion 4a's
    annotations are meant to resolve).

**Acceptance**: manual browser check (per this repo's convention, the user does this pass
themselves) — click each button from a state a few hours before a Friday/Monday 9am boundary and
confirm: (1) the resulting action list contains the right toggle/wait actions at the right times,
(2) the list displayed beforehand correctly flagged which purchases would land during the event,
(3) tooltips read clearly.

### Resolution (found when this phase was executed)

**Discovered a pre-existing, separate mechanism first** (`src/composables/useEventExpiry.ts` +
`EventExpiryDialog.vue`): every buy handler except the three named above already wraps its callback
in `withExpiryCheck(duration, isResearch, action)`, which checks whether the *currently active*
event would expire before `duration` elapses and — if so — shows a confirmation dialog (cancel /
deactivate-and-cancel / deactivate-and-continue) before inserting a single toggle-off action. This
is a coarse, single up-front, user-confirmed check for one direction only (active event ending);
it has no equivalent for "an inactive event starts partway through," and doesn't retoggle an event
back on later even if warranted. Left this mechanism **untouched** — it's a deliberate, pre-existing
UX choice (ask before deactivating something), not in this phase's scope to alter, and it doesn't
conflict with the new per-item mechanism below (if a user picks "deactivate and continue," the new
logic simply won't find a mismatch to correct until state should legitimately change again).

**Design decision — toggle only, no `wait_for_*` action needed**: the plan's wording anticipated
inserting `wait_for_research_sale`/`wait_for_earnings_boost` alongside the toggles, mirroring
`WaitForEventActions.vue`'s pattern. On investigation this turned out to be unnecessary and would
have double-counted time: by the time a purchase loop reaches item N, the natural passage of real
elapsed time — from items 1..N-1's own money-waits, computed via the same `getTimeToSave` formula
the chain itself used — has already carried the plan to (approximately) the absolute time item N's
`duringSale`/`duringEarningsBoost` were computed against. So the fix at each item is just: read
`actionsStore.effectiveSnapshot.activeSales.research`/`.earningsBoost.active`, compare against the
item's `duringSale`/`duringEarningsBoost`, and if they disagree, insert **one** `toggle_sale`/
`toggle_earnings_boost` action (no wait) — a correction, not a jump forward in time. New shared
helper: `syncEventStateForItem(item)` in `ResearchActions.vue`, called before `buyOneLevel` in all
three handlers (for the two `buyWhilePassingCheck`-based handlers, re-reading the same
`nextRoiCandidate`/`nextElrCandidate` computed inside the `buyOne` callback gives the full item with
its annotations, not just the `researchId` the loop shape passes around).

This reasoning is **exact for the research sale** (price is a discrete value at time of purchase;
sale never appears in the wait-time formula at all, so real elapsed time cannot drift from the
chain's own internal timeline because of it) but only **approximately correct for the earnings
boost** — see the residual gap below.

**Residual gap found, not fixed this phase**: the manual planner's core action-replay engine
(`getActionDuration` in `src/engine/apply/duration.ts`, called from `calculateActionResult` in
`src/stores/actions/simulation.ts`) computes each `buy_research`/`buy_hab`/`buy_vehicle`/
`buy_train_car`/`buy_silo` action's wait time via `getTimeToSave(action.cost, prevSnapshot)` with
**no transitions** — i.e. it doesn't yet benefit from Phase 1's boundary-aware generalization. This
predates this whole effort (Phase 1 was scoped to `math.ts`/`time.ts`/`researchROI.ts` only) and is
a separate, adjacent gap: if a single purchase's own wait happens to span a boost transition, its
bank-crediting is still flat/approximate, which can make the *real* elapsed time drift slightly from
what the chain's boundary-aware internal computation assumed — the toggle-insertion logic above is
still correct in *direction* (it'll still flip the flag when needed) but the *exact moment* it fires
could be off by the size of that single purchase's residual timing error. This has no bearing on the
research sale (confirmed above) and is bounded in practice (the boost is active ~24 of every 168
hours, and only affects the wait-time side, not price) — flagging it here rather than silently
expanding this phase to also fix `duration.ts`/`simulation.ts`, since that's a materially different,
higher-blast-radius change (the core replay engine, used by every action type) than what was asked.
Recommend as an explicit follow-up phase if you want it closed.

Also added tooltips: enhanced the two existing "Buy Until Sale Warning"/"Buy Until Sale Ends"
tooltips to mention the new automatic toggle behavior, and added one to "Buy Entire Chain" (which
previously had none at all).

`pnpm vue-tsc --noEmit` is clean. Per this repo's convention, the manual browser check itself
(click each button a few hours before a Friday/Monday 9am boundary, confirm toggle actions land at
the right point and badges match) is left to the user rather than attempted via the `run` skill.

## Phase 5 — Shared ROI-by-deadline helper + new "Buy Until ROI Deadline" button [x]

**Touches**: `src/calculations/researchROI.ts` (or `researchRanking.ts`),
`src/auto/shifts/helpers/milestones.ts`, `src/components/actions/ResearchActions.vue`. **Depends on
Phase 3** (`earningsDelta` on ranking items) and **Phase 4** (toggle-action creation, help text
pattern) for the manual-planner button.

A companion to "Buy Until Sale Warning" for the Earnings ROI view — "buy until the research won't
hit 100% ROI before the start of the next sale" — generalized so the same helper takes an arbitrary
target timestamp and ROI percentage (not hardcoded to "100%" / "next sale"), since this is exactly
the shape needed later for C3's Step 1 ("buy everything that hits 100% ROI before the *final* sale
in the build phase").

5a. New shared predicate (naming/location TBD at implementation time, likely next to
    `calculateResearchROI` in `researchROI.ts`), generalizing the two ad hoc checks that already
    exist under different hardcoded pairs — `showSaleWarning`'s "70% by next sale start"
    (`researchROI.ts`) and `strategist.ts`'s `meetsB` ("100% by buildPhaseEnd"):
    ```ts
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
    ```
    (Flat-rate check, same convention as the existing `meetsA`/`meetsB`/`showSaleWarning` — not the
    nonlinear boundary-crossing math from Phase 1, since this is a buy/no-buy heuristic threshold,
    not a wait-time/earnings calculation.)
5b. Auto planner: new `runBuyUntilROIDeadline(startState, context, targetTimestamp, targetPercent,
    timeLimit): ShiftResult` in `src/auto/shifts/helpers/milestones.ts`, same loop shape as
    `runBuyUntilSaleWarning`/`runBuyUntilSaleDeadline` — rank via `rankResearchByROI(..., 'immediate',
    false)`, filter candidates with `meetsROIByDeadline`, `buyWhilePassingCheck` to execute.
5c. Manual planner: new button on the Earnings ROI view in `ResearchActions.vue`, same
    live-recompute-every-iteration loop shape as `handleBuyUntilSaleWarning`, defaulting
    `targetTimestamp = nextSaleStart` and `targetPercent = 100`; wired through Phase 4's
    toggle-action creation and given help text.

**Acceptance**: `pnpm vue-tsc --noEmit` clean for 5a/5b; manual browser check for 5c (per this
repo's convention) confirming the button stops buying exactly when the next candidate wouldn't
reach 100% ROI before the next sale starts.

### Resolution (found when this phase was executed)

5a landed exactly as specced, in `researchROI.ts` right above `calculateResearchROI`. Went one step
further than "new function alongside the old checks": refactored `showSaleWarning` in this same file
to call `meetsROIByDeadline(earningsDelta, price, absoluteSimTime + timeToBuySeconds, nextSaleStart,
70)` instead of its old inlined boolean expression, and refactored `strategist.ts`'s `meetsA`/`meetsB`
the same way (`meetsB` → `meetsROIByDeadline(..., buildPhaseEnd, 100)`, `meetsA` →
`meetsROIByDeadline(..., nextSaleStart, 70)`) — both are provably equivalent to the old inline math
(De Morgan's on the "should-warn"/negated-conditions), so this was pure dedup, not a behavior change.
This also means Phase 6b's C3 rewrite inherits the shared function "for free" at both of its existing
call sites, with only the new step 4b filter actually needing fresh code.

5b landed as specced — `runBuyUntilROIDeadline(startState, context, targetTimestamp, targetPercent,
timeLimit)` in `milestones.ts`, same `createMilestoneShiftHelpers` + `rankResearchByROI('immediate',
false)` + `buyWhilePassingCheck` shape as `runBuyUntilSaleWarning`, just swapping the `!showSaleWarning`
filter for `meetsROIByDeadline(item.earningsDelta, item.price, absTime + item.timeToBuySeconds,
targetTimestamp, targetPercent)`.

5c needed one piece of new plumbing beyond the plan's text: the manual planner's `ResearchViewItem`
(`useResearchViews.ts`) didn't carry `earningsDelta` at all, and had no equivalent of "the absolute
timestamp this purchase would complete at" (the auto planner gets this for free by recomputing
`absTime` live each loop iteration; the manual planner instead reads off a precomputed, already-
ranked `sortedResearches` list). Added both as new optional fields on `ResearchViewItem` — `earningsDelta`
copied straight from `ResearchRankingItem`, and a new `purchaseTimestamp` (`absoluteSimTime +
timeToBuySeconds`, computed once at the `rankResearchByROI` call site in `useResearchViews.ts` and
threaded through `toResearchViewItemFromROI`) — both only populated on the ROI branch, matching this
interface's existing "only some branches populate some fields" convention. Also added a sibling
`nextSaleStart` computed to `useResearchViews.ts` (same `getNextPacificTime(5, 9, absoluteSimTime)`
pattern as the existing `researchSaleDeadline`, which is actually the sale *end*), exposed alongside
it, for the button's default target. The button itself (`nextRoiDeadlineCandidate` /
`canBuyUntilROIDeadline` / `handleBuyUntilROIDeadline`) is a straight copy of
`handleBuyUntilSaleWarning`'s shape with the filter swapped, `syncEventStateForItem` wired in the same
way, and its own tooltip contrasting the 100%/next-sale bar against the existing button's 70%.

Verification: `pnpm vue-tsc --noEmit` clean across all five touched files; `eslint --fix` on the same
five surfaced only pre-existing warnings unrelated to this phase's lines (unused imports/vars already
present in `useResearchViews.ts`, an unrelated `vue/require-explicit-emits` warning). 5c's live-browser
check is left to the user per this repo's convention.

## Phase 6 — C3 rework: sale-count + Tier 13 parameters, and C3's own logic replaced entirely [x]

**Touches**: `@/lib/events` (Phase 0's landing spot for the calendar helpers), `src/auto/shifts/c3.ts`,
`src/auto/useAscensionGenerator.ts` (one-line dedup only). **Depends on Phase 0** (calendar helper)
and **Phase 5** (`runBuyUntilROIDeadline`/`meetsROIByDeadline`) for 6b.

> **Revision note**: this replaces the document's original 6b, which deferred C3's actual algorithm
> rewrite as an optional, separately-reviewed follow-up. The user has since specified the exact
> replacement algorithm directly (given verbatim, with annotations, below) — so 6b is no longer
> optional or deferred, it's part of this phase alongside 6a. 6a itself is unchanged except one
> addition to Step 0 (the "return early on impossibility" behavior, below), driven by the same
> message.

### 6a. Worker + driver (mechanical, low risk)

New calendar helper generalizing the inline `buildPhaseEnd1`/`buildPhaseEnd2` computation
(`useAscensionGenerator.ts:299-300`):
```ts
export function getBuildPhaseEndForSaleCount(ascensionStartTime: number, saleCount: number): number {
  let end = getNextSaleEnd(ascensionStartTime);
  for (let i = 1; i < saleCount; i++) end = getNextSaleEnd(end + 1);
  return end;
}
```
Apply the same one-line substitution in `useAscensionGenerator.ts` for `buildPhaseEnd1`/
`buildPhaseEnd2` (pure dedup, no behavior change) — the only edit to that file in this phase.

`runC3` keeps its existing signature/behavior (still called unmodified by `ascension.ts`'s
`allShifts` loop and by both existing `useAscensionGenerator.ts` call sites); add one new optional
5th parameter:
```ts
export interface C3Params { attemptTier13Unlock?: boolean; } // default false

export function runC3(
  startState: EngineState, context: SimulationContext,
  buildPhaseEnd: number = 0, _reserved?: number, params: C3Params = {}
): ShiftResult
```
New **Step 0**, right after the existing "shift to Curiosity" block and before Step 1, only when
`params.attemptTier13Unlock`:
```ts
if (params.attemptTier13Unlock) {
  const maxTier = Math.max(...getTiers());
  if (!isTierUnlocked(currentState.researchLevels, maxTier)) {
    const timeLimit = Math.max(0, buildPhaseEnd - getAbsTime());
    const tier13Result = runTierUnlockMilestone(currentState, context, maxTier, timeLimit);
    actions.push(...tier13Result.actions);
    currentState = tier13Result.endState;
    elapsedSeconds += tier13Result.elapsedSeconds;

    // Tier 13 was requested but the whole time budget got spent on it without finishing — this
    // variant is impossible. Return now with just this partial attempt rather than continuing into
    // steps 2-5 against a state that doesn't have what was asked for. `runC3Variants` (the
    // "runner") is responsible for recognizing this from the returned state and excluding/flagging
    // the variant — deliberately not a new field on `ShiftResult` itself, to keep that type's shape
    // identical for every other shift that returns it.
    if (!isTierUnlocked(currentState.researchLevels, maxTier)) {
      return { actions, elapsedSeconds, endState: currentState };
    }
  }
}
```
Reuses `runTierUnlockMilestone` (`src/auto/shifts/helpers/milestones.ts`, already built — and, after
Phase 2, boundary-aware and plan/execution-consistent). **Must run at `elapsedSeconds === 0`** —
`runTierUnlockMilestone` derives its absolute-time baseline from `currentState.lastStepTime`, which
C3 doesn't update as its own local `elapsedSeconds` advances; calling this before any other step runs
sidesteps needing to correct for that. Document this as a code comment (matches this file's existing
gotcha-documentation convention).

New driver, same file:
```ts
export interface C3Variant {
  saleCount: number;
  attemptTier13Unlock: boolean;
  buildPhaseEnd: number;
  result: ShiftResult;
  // True when attemptTier13Unlock was requested but the returned state still doesn't have it.
  // Computed here, not carried on ShiftResult (see Step 0's comment above).
  impossible: boolean;
}

export function runC3Variants(
  startState: EngineState, context: SimulationContext, maxSaleCount: number = 2
): C3Variant[] {
  const maxTier = Math.max(...getTiers());
  const tier13Options = isTierUnlocked(startState.researchLevels, maxTier) ? [false] : [false, true];
  const variants: C3Variant[] = [];
  for (let saleCount = 1; saleCount <= maxSaleCount; saleCount++) {
    const buildPhaseEnd = getBuildPhaseEndForSaleCount(context.ascensionStartTime, saleCount);
    for (const attemptTier13Unlock of tier13Options) {
      const result = runC3(startState, context, buildPhaseEnd, undefined, { attemptTier13Unlock });
      const impossible = attemptTier13Unlock && !isTierUnlocked(result.endState.researchLevels, maxTier);
      variants.push({ saleCount, attemptTier13Unlock, buildPhaseEnd, result, impossible });
    }
  }
  return variants;
}
```
Confirmed safe to call the worker N times against the same `startState`: `runC3` takes its own
shallow copy and every `applyAction` case does its own immutable `{ ...state, ... }` update
(confirmed in `engine/apply/actions.ts`), so no cross-variant mutation. All variants share the same
`context`, so `context.elrMemo` is naturally reused across every variant automatically — simpler
than today's manual `context`/`context2` memo-copying in `useAscensionGenerator.ts`. (`elrMemo` may
end up entirely unused after 6b removes C3's own ELR memoization — check when 6b lands.)

**Not wired into `ascension.ts` or `useAscensionGenerator.ts` yet** — `runC3Variants` is new,
additional capability, same as how Phase C's helpers in `REFACTOR_SHARED_LOGIC.md` were built and
left unwired. Picking the true winner among variants requires completing each one through the rest
of the ascension (K3–H2) and comparing total duration — replacing `useAscensionGenerator.ts`'s
`result1`/`result2`/`result3` mechanism with something driven by this array is an explicit, larger,
separately-reviewed follow-up, not part of this plan (confirmed with the user). Whoever does that
follow-up should filter out `impossible` variants before comparing durations.

### 6b. C3's own logic — full replacement

The user's own description of the target algorithm (verbatim, numbered), with each step annotated
with the primitive it maps to:

1. If Tier 13 is wanted, first try to unlock Tier 13. If it can't be done before the end of C3,
   return early so the runner knows it's impossible. — **This is 6a's Step 0**, already covered
   above; listed here only because it's the algorithm's actual first step.
2. Buy earnings research until it won't have 70% ROI before the next research sale. — **This is
   `runBuyUntilSaleWarning`** (`src/auto/shifts/helpers/milestones.ts`), verbatim, already built. No
   new code.
3. Wait for the research sale. — A plain time-advance to the next sale's start, no purchases:
   `advanceTime(getNextSaleStart(absTime) - absTime)` using C3's own boundary-aware `advanceTime`.
4. If it's the final research sale, buy as much delivery research as possible until the end of the
   sale. If it's not the final research sale, buy earnings research until it won't have 100% ROI
   before the start of the final research sale — but if any of them won't hit 70% before the start
   of the *next* research sale, wait to buy those until that sale.
5. Continue steps 2-4 until you can't buy any more delivery research before the end of the final
   research sale, then end the shift.

Step 4 splits into two branches, using this file's existing `finalSaleStart = buildPhaseEnd - 86400`
to tell which sale we just entered:

**4a — final sale**: buy delivery-impact research until the next candidate wouldn't finish before
the sale ends. **This is `runBuyUntilSaleDeadline`**, verbatim, already built. No new code.

**4b — not the final sale**: buy earnings research toward the *final* sale's 100% ROI deadline —
`runBuyUntilROIDeadline(state, context, finalSaleStart, 100, timeLimit)` from Phase 5b — **with one
extra condition, word-for-word from the user's description**: skip any candidate that wouldn't *also*
hit 70% ROI before the *next* sale starts. This second condition is not something 5b's single-deadline
`runBuyUntilROIDeadline` provides on its own, and isn't just a restatement of the Phase 1-4 sale-aware
pricing fix either — that fix makes a *single* purchase's price/wait correctly account for waiting
for *the next* sale; it has no concept of *which* sale in a longer sequence is most efficient to wait
for. A candidate that clears the 100%-by-final-sale bar but not the 70%-by-next-sale bar is one
that's more efficiently bought once a *nearer* sale discounts it — buying it now, mid-way through the
final sale's runway, would be strictly worse. Build this as C3-local logic, not a new shared helper
(it's a composite of two existing primitives, specific to this shift's loop structure): rank via
`rankResearchByROI(..., 'immediate', false)`, keep only candidates passing *both*
`meetsROIByDeadline(earningsDelta, price, purchaseTime, finalSaleStart, 100)` and
`meetsROIByDeadline(earningsDelta, price, purchaseTime, nextSaleStart, 70)`, `buyWhilePassingCheck`
to execute — same loop shape `runBuyUntilSaleWarning`/`runBuyUntilROIDeadline` already use.

**Verify this interpretation before implementing**: the "but if any of them won't hit 70%..." clause
is the one piece of the user's description without a direct 1:1 existing primitive, so re-confirm
this reading (compound AND-filter, skip and revisit next cycle) matches intent before writing code —
everything else in 4a/4b, and steps 2/3, are direct calls to already-built functions with no new
design decisions.

**What this replaces and deletes**: C3's entire current Step 1 ("Earnings ROI matrix," driven by
`getBestEarningsRecommendation`) and Step 2 ("ELR Impact," the hand-rolled hpp/lookahead loop with
its own `elrPool`/`bestELRStructure`/`elrMemo` machinery) — this is the core-logic rewrite that
`REFACTOR_SHARED_LOGIC.md`'s Phase G and Phase K.5, and this document's original 6b, all deferred as
"C3 is the most complex/highest-stakes shift, don't touch without dedicated review." This *is* that
dedicated review. Once this lands, grep for remaining callers of `getBestEarningsRecommendation`
(`src/auto/engine/strategist.ts`) — C1 and C2 already stopped using it during the earlier
`WIRE_SHARED_LOGIC.md` pass, so C3 may have been its last caller; delete the file if genuinely
orphaned, same convention as `quickWins.ts`'s deletion once it lost its last caller. Same check for
`buildELRCandidatePool`/`evaluateELRWithPool`/`evaluateELRForStructure` (`src/lib/artifacts/virtue.ts`)
— confirm whether anything outside C3 still uses them before removing.

**Acceptance (6a)**: `pnpm vue-tsc --noEmit` clean; throwaway script calling `runC3Variants` on a
fixture, asserting variant count (4 normally, 2 once Tier 13 is unlocked in the fixture),
monotonically increasing `buildPhaseEnd` per `saleCount`, and that an `attemptTier13Unlock: true`
variant against a fixture where Tier 13 is unreachable within `buildPhaseEnd` comes back with
`impossible: true` and a truncated action list (just the Step 0 attempt, nothing past it).

**Acceptance (6b)**: `pnpm vue-tsc --noEmit` clean. Unlike 6a, this is **not** a mechanical swap —
it's a full algorithm replacement, so `runC3(...)`'s output is *expected* to differ from before this
phase, not match byte-for-byte. Needs the same before/after ascension-time comparison flagged
throughout this document and `WIRE_SHARED_LOGIC.md`: generate a handful of real ascension plans with
the old vs. new C3 and compare total simulated ascension time (not action-list equality) — per this
repo's convention, that live comparison is the user's own pass, not something to attempt via the
`run` skill.

### Resolution (found when this phase was executed)

6a landed exactly as specced: `getBuildPhaseEndForSaleCount` added to `lib/events.ts`, and
`useAscensionGenerator.ts`'s `buildPhaseEnd1`/`buildPhaseEnd2` swapped to call it (`saleCount` 1 and
2) — pure dedup, no behavior change (`saleCount === 1` is exactly the old `getNextSaleEnd(...)` call,
and `saleCount === 2` is exactly the old `getNextSaleEnd(buildPhaseEnd1 + 1)`). `C3Params`, Step 0
(the Tier 13 attempt with early-return-on-impossibility), and `runC3Variants`/`C3Variant` were added
to `c3.ts` verbatim per the plan.

6b replaced C3's entire body (the old "Step 1: Earnings ROI matrix" / "Step 2: ELR Impact" pair,
~230 lines of hand-rolled ROI-matrix and ELR-pool-memoization logic) with the user's 5-step algorithm,
implemented as a single `while` loop alternating three already-built helpers
(`runBuyUntilSaleWarning`, `runBuyUntilSaleDeadline`, and a new C3-local `runBuyEarningsTowardFinalSale`)
plus a plain `advanceTime` wait for step 3. Step 4's final-vs-not-final branch is decided by comparing
`getNextSaleEnd(...)` against `buildPhaseEnd` (they're equal exactly for the sale that ends the build
phase, by construction of `getBuildPhaseEndForSaleCount`), and the loop's own natural `break`s after
either 4a branch (mid-sale-start or post-wait) implement step 5 ("once the final sale is spent, stop")
without needing a separate termination check.

The one piece flagged in the plan as needing verification before implementing — step 4b's compound
filter ("100% by final sale AND 70% by next sale, else defer") — was implemented as specced:
`runBuyEarningsTowardFinalSale` ranks via `rankResearchByROI` and keeps only candidates passing both
`meetsROIByDeadline(..., finalSaleStart, 100)` and `meetsROIByDeadline(..., nextSaleStart, 70)`,
recomputing `nextSaleStart` fresh from the current loop iteration's `absTime` each time (same
convention `runBuyUntilSaleWarning` already uses internally).

**Follow-up fix**: the initial implementation always evaluated both conditions. On review (after this
phase's initial commit, prompted by the user re-opening `c3.ts` and asking whether 4b needed more
work), this was inconsistent with `showSaleWarning` elsewhere in the codebase, which skips the
70%-by-next-sale check entirely once a candidate is already `duringSale` — nothing to defer if it's
already at the discount. This mattered concretely here: 4b is only ever entered right after step 3
waits for a (non-final) sale to start, so for as long as that sale stays active, essentially every
candidate 4b evaluates has `duringSale: true` — without the short-circuit, the 70% condition would
still technically run (against a whole week's runway to the *next* sale, since "next" excludes the
sale already active), which is usually easy to clear but not meaningfully equivalent to "already
buyable at the best available price, nothing to gain by waiting." Asked the user directly which
reading was intended; they confirmed the short-circuit should be added, matching `showSaleWarning`'s
convention exactly: `meetsROIByDeadline(..., finalSaleStart, 100)` is still required unconditionally,
but the 70% check is now skipped (auto-pass) whenever `item.duringSale` is true.

Cleanup: `getBestEarningsRecommendation` (`strategist.ts`) had zero remaining callers once C3 stopped
using it — confirmed via repo-wide grep, C3 was its last caller as this phase's plan text predicted —
so the whole file was deleted (`EventTiming`, `EarningsRecommendation`, `DEFAULT_EARNINGS_CATEGORIES`
went with it; none had callers elsewhere either). Same check for `buildELRCandidatePool`/
`evaluateELRWithPool`/`evaluateELRForStructure` (`lib/artifacts/virtue.ts`) found zero remaining
callers — deleted, along with the module-private `Candidate` type and `_evalStones` helper that only
those three functions used (confirmed `getOptimalELRSet`, the file's other ELR-related export, has its
own independent inline implementation and doesn't touch any of this). `researchROI.ts`'s doc comment
on `meetsROIByDeadline` (added in Phase 5) referenced `strategist.ts`'s `meetsB` by name; updated to
drop the now-dangling reference.

Verification: `pnpm vue-tsc --noEmit` clean. `eslint` (without `--fix`) on every touched file reported
zero issues on any line this phase actually added or changed — all pre-existing warnings/errors
surfaced belong to code untouched by this phase (confirmed by cross-referencing line numbers against
the diff). Note on process: an initial `eslint --fix` pass reformatted entire files (not just changed
lines) due to pre-existing prettier debt in `useAscensionGenerator.ts`/`virtue.ts`/`events.ts` predating
this phase; that collateral reformatting was reverted (restoring each file to its pre-`--fix` content
and reapplying only this phase's actual logical edits) to keep the diff scoped to this phase's changes.
6a's own throwaway-script acceptance check (asserting `runC3Variants`' variant count/monotonic
`buildPhaseEnd`/`impossible` flagging against a fixture) was not run — `runC3Variants` transitively
depends on `commonResearch.ts`'s `allResearches` (via the `lib` workspace package), which this
session's established throwaway-script method (plain `node --experimental-strip-types`) cannot resolve
under Node's ESM rules, a limitation already hit and documented earlier in this plan. Both 6a and 6b's
real acceptance — comparing actual generated ascension plans before/after — is the live browser check
left to the user per this repo's convention, same as every other phase's UI-facing acceptance criteria.

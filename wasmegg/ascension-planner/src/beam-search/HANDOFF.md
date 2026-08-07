# Beam Search — Handoff / Status Document

**Last updated:** 2026-08-07, end of the implementation session that built Phase C (manual planner UI).
**Read this first** if you're picking this work up in a new chat. It links everything else you need.

## Context

This feature is a beam-search research-purchase optimizer for the Curiosity egg (Virtue Egg /
Prophecy system), built in `wasmegg/ascension-planner`. Design came from a chatbot conversation with
no visibility into this codebase — five docs (`01-overview.md` through `05-design-decisions.md`) in
this directory capture that game-agnostic design. `06-egg-codebase-integration.md` (written in this
same overall effort, before implementation started) maps that design onto this actual codebase:
what to reuse, what's genuinely new, and the architecture decisions. **Read `06-...md` before writing
any more code** — it's the source of truth for *why* things are built the way they are.

Goal: a new "Beam Search" tab in the manual planner's research views. User picks a deadline
(date+time) and a beam width, the search runs in a Web Worker with live progress, previews the
result, and applies it to the live plan in one shot. Does **not** touch `SmartBuyView.vue`,
`ResearchActions.vue`'s existing buttons, or `auto/shifts/c3.ts` in this pass — `c3.ts` is a
documented *future* consumer of the same engine (see §6 of the integration doc), not touched yet.

## Status: Phase A, B, and C all complete. Feature is fully wired up and live-tested.

The original execution plan had three phases:
- **Phase A — pure engine, verified in isolation.** ✅ Done, an earlier session.
- **Phase B — Web Worker.** ✅ Done, an earlier session (same overall effort, one session before this one).
- **Phase C — manual planner UI wiring.** ✅ Done, this session.

**Nothing has been committed.** All of this exists only in the working tree. Recommend reviewing the
full diff and committing now — several existing production files were touched (see "Files touched"
below), not just new beam-search files, and this is a natural checkpoint: the feature is complete and
has been exercised end-to-end in a real browser (see "Phase C" below), not just unit-tested.

---

## What exists right now

### New pure engine — `src/beam-search/engine/`

| File | Purpose |
|---|---|
| `types.ts` | `BeamSearchState`, `BeamPurchase` (research/tierMacro/phase3Macro/phaseTransition edges), `BeamFrozenContext`, `BeamTerminalResult`, `BeamSearchOptions`/`Progress`/`Result`, `absoluteSimTimeOf`, `splitEngineState`/`toEngineState` |
| `candidates.ts` | `getLightweightPhaseCandidates` — Phase 1/2 candidate generation, purpose-built (NOT `rankResearchByROI`, see integration doc §4 for why) |
| `macros.ts` | `runTierMacro` (wraps `runTierUnlockMilestone` unchanged), `runPhase3Macro` (wraps `runDeliveryBuyLoop` unchanged + scores via `computeRealisticELR`/`getOptimalELRSet`), plus the two perf caches (`Phase3ScoreCache`, `Phase3ArtifactFamilyCache`) |
| `dedupe.ts` | `researchLevelsKey`, `researchStateKey`, `dedupeByEarliestTime` — "earliest identical research-state wins" pruning |
| `search.ts` | The outer beam loop: `runSearchLoop`. Also exports `selectCandidates`, `applyResearchPurchase`, `phaseTransitionChild` for the oracle test's reuse |
| `reconstruct.ts` | `reconstructPlan` — walks parent pointers, flattens macro edges into one ordered purchase list |
| `index.ts` | **The only export a caller needs**: `runBeamSearch(startState: EngineState, context: SimulationContext, options) → BeamSearchResult` |
| `testFixtures.ts` | `makeTestEngineState`, `makeTestContext`, `makeBareTestContext`, `makeAutoProgressedTestState` — see "Test fixtures" below |

### New Web Worker — `src/workers/`

| File | Purpose |
|---|---|
| `beamSearch.worker.ts` | The Web Worker entry point. Thin wrapper only — imports `runBeamSearch` from `beam-search/engine` and wires its synchronous call + `onProgress` callback to `postMessage`, throttling progress to one message per `PROGRESS_THROTTLE_MS` (200ms). Also sanitizes `context.rawBackup` on receipt (see next file) before calling `runBeamSearch`. Accepts a `cancel` message for protocol completeness, but see "Live verification" below — it's not actually reachable in practice while a run is busy; `useBeamSearch.ts` cancels by terminating the worker instead. Wired up for real in Phase C (`useBeamSearch.ts` constructs it) and live-tested in a real browser this session. |
| `beamSearch.protocol.ts` | Message types shared between main thread and worker (`MainToWorkerMessage` = `start`\|`cancel`, `WorkerToMainMessage` = `progress`\|`result`\|`cancelled`\|`error`, both carrying a `runId` per the design doc's stale-message guard), plus `sanitizeLongsForWorker` — see "rawBackup and postMessage" below and "Live verification"'s Bug 1 for its second job (stripping Vue reactivity), found this session. |

### New manual planner UI

| File | Purpose |
|---|---|
| `composables/useBeamSearch.ts` | Owns the worker instance + one run's lifecycle: `status`/`progress`/`result`/`errorMessage` refs, `start(deadline, beamWidth, maxDepth?)`, `cancel()`. Builds `startState`/`context` from live Pinia state and sanitizes both before `postMessage` (see "Live verification" Bug 1). `cancel()` terminates and respawns the worker rather than posting a message (see Bug 2) — read this file's own doc comments before touching cancellation again. |
| `components/actions/BeamSearchView.vue` | The tab's UI — deadline (date/time/timezone, defaulting to the next research sale's end) + beam-width inputs, Run/Cancel, live progress, result preview + Apply button. Shaped like `SmartBuyView.vue`; emits `apply` with the `BeamSearchResult` rather than applying it itself. |
| `components/actions/ResearchActions.vue` (modified) | Renders `BeamSearchView` when `currentView === 'beam_search'`; `handleApplyBeamSearchPlan` (new) replays `result.researchIds` through the exact same `syncEventStateForItem`/`buyOneLevel`/`batch`/`withExpiryCheck` pattern `handleBuyMilestoneChain` already used — no new replay logic. |
| `composables/useResearchViews.ts` (modified) | `'beam_search'` added to `ViewType`/`VIEWS`/`viewDescription`'s switch — same registration every other view already has. |

### Tests

| File | What it covers |
|---|---|
| `index.spec.ts` | Smoke test: valid research IDs, correct level ordering, deadline respected, clean error when `rawBackup` missing |
| `dedupe.spec.ts` | `researchLevelsKey`/`researchStateKey`/`dedupeByEarliestTime` unit tests |
| `candidates.spec.ts` | Category filtering (phase 1 excludes non-ROI, phase 2 restricts to delivery-impact), tier-lock filtering, phase2 ⊆ phase1 |
| `reconstruct.spec.ts` | Parent-chain walking + macro-edge flattening, hand-built synthetic chains |
| `search.spec.ts` | **New, Phase B.** `runSearchLoop`'s `isCancelled` hook: stops before any generation when already true, stops within a generation or two of flipping true mid-run, reports `metrics.cancelled: false` on an ordinary uncancelled stop |
| `oracle/beam-oracle.spec.ts` | **Exact small-case validation** — beam matches true exhaustive-search optimum bit-for-bit; beam-width monotonicity |
| `convergence.spec.ts` | NOT a correctness test — timing/quality benchmark across beam widths and deadlines. Gated behind `RUN_CONVERGENCE=1` (see "How to run things" below) |
| `../../workers/beamSearch.protocol.spec.ts` | **New, Phase B.** Documents the `structuredClone`+Long risk with a direct experiment (a Long-shaped instance survives cloning but silently loses its prototype/methods), then verifies `sanitizeLongsForWorker` fixes it: converts Long-shaped values to numbers (signed and unsigned), recurses through nested objects/arrays, deep-clones (doesn't mutate input), and the sanitized output survives a real `structuredClone` with correct numbers intact |

All of the above (except `convergence.spec.ts`, correctly gated) pass under plain `pnpm test`:
**7 test files passed (1 skipped), 32 tests passed (1 skipped), ~55s.**

### Files touched outside `src/beam-search/` (existing production code)

These are real, reviewed, backward-compatible changes — not accidental. Each has an in-code comment
explaining why.

- **`src/engine/adapter.ts`** — real bug fix. `createBaseEngineState` called `useVirtueStore()` etc.
  *unconditionally*, even on the branch that takes a snapshot and never reads those stores. Broke
  immediately outside a Pinia context (tests, and critically, a future Worker). Fixed by moving the
  four store calls into the branch that actually needs them. Zero behavior change for existing
  callers (verified via `vue-tsc`).
- **`src/calculations/smartBuyPreview.ts`**:
  - Real bug fix: `runDeliveryBuyLoop`'s deadline enforcement only applies while a sale is
    *currently active* (matches its real callers — `c3.ts`, "Buy Until Sale Ends" — where the
    deadline genuinely is a sale's end). This engine's deadline may not coincide with any sale, so
    outside a sale window it enforced no deadline at all. Confirmed by testing, not just reading
    code — an early version returned a `lastPurchaseTime` days past the deadline. Fixed
    independently in `macros.ts` (the delivery-loop result is trimmed to the real deadline after
    the fact) — `smartBuyPreview.ts` itself wasn't touched for *this* bug.
  - Exported `MAX_SIMULATED_PURCHASES` (was private) so `macros.ts` can pass it explicitly.
  - Added optional `fixedArtifactFamilies?: string[]` param to `runDeliveryBuyLoop` (11th param,
    backward-compatible — omitted, existing callers get identical behavior).
- **`src/calculations/researchRanking.ts`**:
  - Exported `ROI_EXCLUDED_CATEGORIES`, `ELR_EXCLUDED_CATEGORIES`, `DELIVERY_IMPACT_CATEGORIES`,
    `filterByCategories` (were all private) — beam search's `candidates.ts` reuses these instead of
    re-declaring the category lists.
  - Added optional `fixedArtifactFamilies?: string[]` param (11th param) to `rankResearchByELRImpact`,
    threaded through its three internal `getOptimalELRSet` call sites (baseline, per-candidate,
    lookahead loop). Backward-compatible.
- **`src/lib/artifacts/virtue.ts`**:
  - Added optional `fixedArtifactFamilies?: string[]` option to `getOptimalELRSet`. When present,
    skips the expensive 1-4-artifact combination search (up to 495 combos) and re-optimizes stones
    for exactly that family selection instead. See that function's own doc comment for the full
    correctness argument (candidate-gathering is inventory-only, doesn't depend on research levels
    — confirmed by reading the code, not guessed). Falls back to the full search if the requested
    families don't match current inventory.
- **`package.json`** / **`vitest.config.ts`** (new) — added `vitest`, test scripts
  (`test`, `test:oracle`, `test:convergence`, `coverage`, `test:watch`), 20s default test timeout.

**Note:** `auto/shifts/c3.ts`, `calculations/researchRanking.ts`, and `calculations/smartBuyPreview.ts`
already had *other*, unrelated uncommitted changes in the working tree before this session started
(from prior work — see `git log`, most recent commit "stop waiting for the end of the research sale
at the end of C3"). This session's edits to `researchRanking.ts`/`smartBuyPreview.ts` are layered on
top of those pre-existing changes. `c3.ts` itself was **not** touched by this session.

---

## Key decisions already made (don't re-litigate these)

From the integration-doc discussion and implementation session, in one place:

1. Non-ROI research categories (`hatchery_capacity`, `internal_hatchery_rate`,
   `running_chicken_bonus`, `hatchery_refill_rate`) are **permanently excluded** from the candidate
   set — matches every other optimizer in this app.
2. **Web Worker from day one** for Phase B — no main-thread-yielding fallback phase.
3. Beam width: plain integer input for v1 (next to the deadline picker), Fast/Normal/Thorough
   dropdown later, deferred.
4. Hab/vehicle/artifact loadout are frozen for the whole Curiosity build window — confirmed, this is
   why they live in `BeamFrozenContext` (passed once) instead of varying per `BeamSearchState`.
5. Dedup key is `phase + researchLevels` — confirmed sufficient (sale/boost state is a pure function
   of `absoluteSimTime`, doesn't need to be in the key).
6. Apply (Phase C) is **all-or-nothing**: the whole winning plan in one shot, with macro edges
   pre-flattened into individual purchases, replayed against the live plan by re-deriving real
   price/wait at each step (same pattern as `c3.ts`'s `executePlanToLevels` / `ResearchActions.vue`'s
   buy flow) — not blindly trusting the beam's own scratch-simulation prices.
7. `c3.ts` is **not** touched in this pass or the next. A *future* pass (after this ships and proves
   out) replaces `c3.ts`'s heuristic — including retiring its bespoke Tier-13-forcing two-variant
   comparison (`runC3Variants`) — with a direct call into this same beam engine.
8. Non-terminal beam states (everything except a Phase 3 terminal result) have no real score to rank
   by. This integration's own interpretation (the design docs don't specify one): rank by **offline
   earnings rate** as a proxy for "future purchasing power." Documented, defensible, but an
   interpretation — see `search.ts`'s `rankByEarnings` doc comment.
9. Tier-macro and Phase-3-macro attempts are **throttled** to the top 3 (by that same earnings
   heuristic) beam members per generation, not offered to every member every generation as the
   design docs literally specify — found by direct measurement to be necessary (see "Performance
   journey" below). `TIER_MACRO_ATTEMPTS_PER_GENERATION` / `PHASE3_MACRO_ATTEMPTS_PER_GENERATION` in
   `search.ts`, both currently `3`. **Known caveat**: the Phase-3 throttle uses an earnings-based
   heuristic, but earnings and delivery-readiness aren't the same signal — a lower-earning branch
   with more delivery-relevant research already bought could plausibly score higher and get missed.
   Flagged, not fixed — see `search.ts`'s doc comment at that throttle's usage site.

---

## Performance journey (why the code looks the way it does)

Worth understanding before touching `search.ts`/`macros.ts` again — several non-obvious things were
learned by *measuring*, not by reading code:

1. **First benchmark (33.57s at beam width 250) was measuring almost nothing real.** It used a bare,
   zero-research start state and an empty `rawBackup`, which makes `getOptimalELRSet` short-circuit
   instantly (`if (!backup.artifactsDb) return createEmptyLoadout()`). Real users have real
   inventories; this number was an accident of an unrealistic fixture.
2. **Tier/Phase-3 macro cost, unthrottled, dominates.** Both macros recompute a full lookahead from
   scratch on every attempt, and the design docs call for offering them to *every* beam member,
   *every* generation. At any real beam width this exploded. Fixed by throttling both to the top-3
   earners per generation (decision #9 above).
3. **Even throttled, Phase 3 was still slow with a real artifact inventory** — `getOptimalELRSet`'s
   own combinatorial search (up to 495 artifact/rarity combinations) is expensive, and it's called
   from **inside** `rankResearchByELRImpact`'s `'realistic'` mode three different ways (baseline +
   once per unpurchased candidate + once per lookahead level), which `runDeliveryBuyLoop` then calls
   once per purchase it makes. Simply memoizing the *final* scoring call (by `researchLevelsKey`)
   only got a ~50% hit rate and barely moved runtime, because most of the cost was buried in those
   inner calls, not the outer one.
4. **The actual fix (the user's idea):** candidate-*family* selection in `getOptimalELRSet` only
   depends on the owned inventory, never on research levels — confirmed by reading the code. So the
   expensive combination search only needs to happen **once** per run: prime it directly against the
   starting research levels, cache the winning family set, and pass `fixedArtifactFamilies` through
   `getOptimalELRSet` → `rankResearchByELRImpact` → `runDeliveryBuyLoop` for every subsequent call.
   Result: beam width 50 went from 88.7s (16 generations, still running) to **27.67s for the full
   71-generation run to natural termination** — roughly a 17x speedup at the same point.
5. **Final convergence numbers**, realistic fixture (see "Test fixtures" below), deadline = 1st/2nd/3rd
   Saturday-9am-Pacific sale end (the only realistic deadlines, per the user):

   | Beam width | Score | Runtime |
   |---|---|---|
   | 250 | 272,920,049,325.0000 | ~27-30s |
   | 500 | 272,920,049,325.0000 | ~29s |
   | 1000 | 272,920,049,325.0000 | ~34s |

   Score is **bit-for-bit identical** across every beam width (10/50/250/500/1000) and all three
   sale-count deadlines tested. This is real convergence, not a bug — confirmed via the oracle test
   that this is the true optimum, and the deliberately maxed-out fixture (T4 legendary everything,
   max epic research, max colleggtibles) saturates the delivery ceiling almost immediately (within
   under 4 days), so more time/beam width genuinely can't do better. A less extreme fixture would
   likely show real score differentiation across beam widths — hasn't been tested, see "Open
   questions" below.

### A real bug found but NOT fixed (separate, pre-existing, unrelated to beam search)

While building a realistic test fixture, `auto/shifts/i1.ts` (and `k2.ts`) — via
`calculations/habPurchasePlan.ts`'s `simulateHabPurchases` — was found to produce nonsensical
elapsed-time values (up to `1e30` seconds) when population/earnings are near-zero right after a
shift (every `'shift'` action resets `population: 1`) while other economic ratios (already-leveled
common research) are large. Root cause: the function derives fixed `layRatePerChicken`/
`earningsPerEgg` ratios from that tiny starting population, then reapplies them as its own virtual
population grows back up over many simulated hab-tier purchases — the ratios can compound into
nonsense. **This is existing, shipped code** (the real I1 auto-shift, and the manual planner's own
hab-buying UI go through the same function) — not something fixed here, deliberately, since it
needed proper isolated investigation, not a fix bundled into an unrelated feature under time
pressure. Worked around for this fixture's purposes by not routing through I1/K1/K2 at all (see
`makeAutoProgressedTestState`'s doc comment) — habs/vehicles are set to a maxed config directly
instead, which is simply correct anyway since every "realistic Curiosity" calculation elsewhere in
this codebase already assumes maxed habs/vehicles. **Worth a dedicated look separately.**

---

## Test fixtures (`testFixtures.ts`) — what "realistic" means here

Built up over several rounds of user feedback — read the file's own doc comments for full reasoning,
but in short, `makeAutoProgressedTestState(context)`:

1. Starts from a bare, zero-research, zero-hab/vehicle state (matching `auto/ascension.ts`'s own
   `deriveNextStartState` convention).
2. Runs the real production shifts `runC1`, `runC2`, `runR1` (auto/shifts/*.ts, unchanged) for
   authentic research progression — **deliberately skips I1/K1/K2** (see the bug above).
3. Runs a real Quick Buy sweep (`simulateThresholdBuy`, threshold 60s) to clear trivially-cheap
   research — per the user: this feature isn't meant to be used when hundreds of sub-minute
   purchases are still on the table.
4. Habs/vehicles set to a maxed config directly (matches this codebase's own "assume max
   habs/vehicles" convention for Curiosity-realistic calculations everywhere else).

`makeTestEngineState`/`makeTestContext` (the base fixtures `makeAutoProgressedTestState` builds on)
default to: `te: 100`, `soulEggs: 20e21` (both per the user's explicit steer — near-zero values
triggered the habPurchasePlan bug above and aren't realistic for someone using this feature anyway),
maxed epic research (`lib/epicResearch.ts`'s own `maxLevel` table), maxed colleggtibles (top tier,
`lib/collegtibles.ts`), and a synthetic `rawBackup` with one T4 Legendary of every artifact family
plus 20x T4 lunar/tachyon/quantum stones (per the user's explicit spec) — built from real game data
catalogs (`lib/artifacts/data.ts`), not invented numbers. `makeBareTestContext` is kept for tests that
specifically want the "nothing owned" path.

---

## How to run things

All commands from `wasmegg/ascension-planner/`:

```sh
pnpm test                    # default suite incl. engine tests + oracle — ~55s, should be all green
pnpm vue-tsc --noEmit        # type check
pnpm exec eslint --ext .ts src/beam-search/engine --fix   # lint the engine

# Convergence/timing benchmark — NOT part of default test, deliberately slow, prints per-generation
# progress. Env vars configure it:
RUN_CONVERGENCE=1 CONVERGENCE_BEAM_WIDTHS=250,500,1000 CONVERGENCE_SALE_COUNTS=1,2,3 \
  pnpm exec vitest run src/beam-search/engine/convergence.spec.ts --disable-console-intercept

# or via the script (same thing, default widths/sale counts):
pnpm test:convergence
```

Note: `pnpm test:oracle` currently just re-runs the same (already-passing, always-on)
`oracle/beam-oracle.spec.ts` with `RUN_ORACLE=1` set — that env var isn't actually checked by
anything yet. Unlike `artifact-explorer`'s oracle (which this one's structure/doc-comments were
modeled on), no "deep fuzz campaign" tier was built — only the smoke-tier equivalent (one exact
small-case check + one monotonicity check). Scope decision, not an oversight; see "Open questions."

---

## Remaining work

### Phase B — Web Worker ✅ Done, this session

What was built, against the original integration doc §5 / execution plan:

1. `src/workers/beamSearch.worker.ts` — not wired up to anything yet (that's Phase C), but it exists,
   type-checks, and was verified to bundle cleanly as a standalone Vite entry (294 modules, no errors
   — see its own file header). Loaded, once Phase C constructs it, via
   `new Worker(new URL('./beamSearch.worker.ts', import.meta.url), { type: 'module' })` (Vite native
   support, no config changes needed — confirmed, nothing added to `vite.config.ts`).
2. Message protocol, typed both directions, in `src/workers/beamSearch.protocol.ts` — matches the
   planned shape with one deliberate simplification: `progress`/`result` carry their payload as a
   nested `progress`/`result` field (`{ type: 'progress', runId, progress: BeamSearchProgress }`)
   rather than spread inline, so the message types can be plain discriminated-union interfaces
   without an intersection/spread trick. `runId` on every message, as planned, so a stale message
   from a superseded run (deadline/beam-width changed and rerun before the old run finished) can be
   ignored — enforced on the worker side (a `cancel` for anything but the currently active `runId` is
   ignored) and left for Phase C to also enforce on the main-thread receiving end.
3. Progress throttled inside the worker wrapper (`PROGRESS_THROTTLE_MS = 200`), not in
   `runSearchLoop` itself — the engine has no business knowing about UI update rates. Thin wrapper
   confirmed: the worker file's only real logic is the message switch, progress throttling,
   cancellation bookkeeping, and rawBackup sanitization (next point) — all search logic stays in
   `engine/*`.
4. **Cancellation — implemented.** `runSearchLoop` (`engine/search.ts`) now takes an optional
   `isCancelled?: () => boolean`, checked once at the top of the while loop (i.e. "poll between
   generations", per the original plan) — `search.spec.ts` verifies both "cancelled before the first
   generation" (zero generations run) and "cancelled mid-run" (stops within a generation or two, well
   short of `maxDepth`). Threaded through `BeamSearchOptions.isCancelled` → `runBeamSearch` →
   `BeamSearchResult.metrics.cancelled`. The worker owns the actual cancel *policy*, not just the
   plumbing: a `cancel` message sets a local flag; once set, the worker reports `{ type: 'cancelled' }`
   regardless of whether `runBeamSearch` still managed to return a usable result before next checking
   the flag — a Cancel click is treated as "stop and discard", not "give me whatever you have so
   far". (If Phase C's UX wants "keep the partial result" instead, that's a one-line change at the
   worker's two `cancelledRunId === runId ? ... : ...` call sites — the plumbing already returns a
   real result in that case, it's just discarded by policy.)
5. **`rawBackup` vs. `structuredClone`/`postMessage` — verified, and it does NOT survive cleanly.**
   Confirmed directly (not guessed) with a real `structuredClone` experiment, documented in
   `src/workers/beamSearch.protocol.spec.ts`: a protobufjs-decoded Long instance (used for every
   `ei.IBackup` int64 field — concretely, `ArtifactInventoryItem.itemId`/`ArtifactsDB.itemSequence`
   inside `backup.artifactsDb`, which `getOptimalELRSet` (`lib/artifacts/virtue.ts`) reads directly to
   resolve which artifact occupies which loadout slot) does **not** throw when cloned, but silently
   loses its prototype, becoming a bare `{ low, high, unsigned }` object with none of Long's methods
   — a silent-corruption failure mode, worse than a loud one. The doc's suggested fallback
   (`JSON.parse(JSON.stringify(...))`) turns out **not** to fix this — `JSON.stringify` has no special
   handling for Long either, so it produces the exact same stripped shape. The actual fix:
   `sanitizeLongsForWorker` (`beamSearch.protocol.ts`) deep-clones a value, duck-typing any
   `{low,high,unsigned}`-shaped object (whether still a live Long instance, or the clone's
   already-stripped equivalent — both share the shape) and converting it to a plain number via the
   same bit math `Long.prototype.toNumber()` uses. Applied **inside the worker**, on receipt of a
   `start` message (not on the main thread before sending, as the doc originally suggested) —
   deliberately, so correctness doesn't depend on a future caller (Phase C's composable, or `auto`
   later) remembering a pre-send step; the sanitizer works identically before or after the clone
   boundary, so doing it worker-side is strictly safer with no downside.
6. `engine/compute.ts`/`engine/apply/*`/`calculations/*` — reconfirmed Pinia-free this session (no
   changes needed); the worker imports `runBeamSearch` from `engine/index.ts` directly, never
   `engine/adapter.ts`. Also reconfirmed: `vue-tsc --noEmit` passes project-wide, so no tsconfig
   changes were needed for the worker file's types — see `beamSearch.worker.ts`'s own doc comment on
   why it types `self` as `Worker` (the DOM-lib interface, from the main-thread side) rather than
   pulling in the `webworker` lib (which would conflict with this project's shared `dom` lib).

### Phase C — Manual planner UI ✅ Done, this session

What was built, against the original plan:

1. Added `'beam_search'` to `ViewType`/`VIEWS` in `composables/useResearchViews.ts`, plus a
   `viewDescription` case — matches every other view's registration exactly, no surprises.
2. New component `components/actions/BeamSearchView.vue` (shaped like `SmartBuyView.vue`/`QuickBuy.vue`,
   reusing `SmartBuyCard`/`ResearchPurchasePreview`): deadline date/time/timezone inputs (defaults to
   the **next research sale's end** — `getNextPacificTime(6, 9, ...)`, the same "next Saturday 9am
   Pacific" HANDOFF's own convergence testing called "the only realistic deadlines" — via a "Use next
   sale end" quick-set link, freely editable underneath) + a plain beam-width integer input
   (default 50), Run/Cancel, live progress (generation/beam size/best delivery rate/elapsed, straight
   off `BeamSearchProgress`), and on completion: the research-level-changes preview
   (`summarizeResearchLevelChanges`), achieved delivery rate/purchase count/last-purchase time/search
   time, and an Apply Plan button. Renders its own `SORT RESEARCH BY` entry the same as every other
   view; `ResearchActions.vue`'s `ResearchFlatView` `v-else-if` was updated to also exclude
   `'beam_search'` (it already excluded `'smart_buy'` the same way) so it doesn't render underneath.
3. New composable `composables/useBeamSearch.ts` — owns the worker instance + run lifecycle
   (`status`/`progress`/`result`/`errorMessage` refs, `start()`/`cancel()`), independent of
   `useResearchViews`, instantiated directly inside `BeamSearchView.vue` (not lifted to
   `ResearchActions.vue`) — a live search is tied to the tab being open; switching away unmounts the
   component and tears the worker down via `onUnmounted`, rather than leaving an orphaned run with
   nowhere for its messages to go. `start()` builds `startState`/`context` via
   `createBaseEngineState(actionsStore.effectiveSnapshot)`/`getSimulationContext()`, exactly as
   `06-egg-codebase-integration.md` §7 specified.
4. Apply adapter: **not** a new function reusing `c3.ts`'s `executePlanToLevels` (that's `auto`'s own
   simulate-only replay, not wired to real store actions) — instead, `BeamSearchView.vue` emits
   `apply` with the whole `BeamSearchResult` up to `ResearchActions.vue`, which owns a new
   `handleApplyBeamSearchPlan` following the *exact* pattern its own `handleBuyMilestoneChain` already
   uses: `withExpiryCheck(...) { batch(() => { for (const researchId of result.researchIds) { ...
   syncEventStateForItem(...); buyOneLevel(...); } }) }`. `result.researchIds` is already flat,
   ordered, and macro-expanded (reconstructPlan's job, Phase A) — indistinguishable from an ordinary
   purchase chain by the time it gets here, so no beam-specific replay logic was needed at all, only
   one new handler function reusing everything `ResearchActions.vue` already had. `result.lastPurchaseTime`
   (the engine's own computed absolute finish time) is used directly for the expiry-check duration
   estimate, more accurate than the `getTimeToBuySeconds`-summing fallbacks other handlers there need.

**Live-tested end-to-end in a real browser** (Playwright + Chromium, not just `pnpm test`) — see
"Live verification" below. This found and fixed **two real bugs** that no amount of unit testing
would have caught, both now fixed:

- `postMessage` throwing synchronously ("could not be cloned") because `startState`/`context` were
  live Vue-reactive Pinia objects, not plain data.
- The Cancel button not actually cancelling a busy run — JS workers are single-threaded, so a
  `cancel` postMessage physically cannot be processed while `runBeamSearch`'s one big synchronous
  call is still running.

See both bugs' full writeups under "Live verification" — they change the mental model for this
feature's cancellation story, worth reading before touching `useBeamSearch.ts` or
`beamSearch.worker.ts` again.

---

## Live verification (this session)

`beamSearch.worker.ts` had never run as a real Worker before this session (flagged as an open
question in an earlier version of this doc) — `pnpm test`, `vue-tsc`, and a standalone `vite build`
probe are all real checks, but none of them actually click a button in a browser. This session did:
Playwright + a locally-installed Chromium (not a project dependency — installed into an isolated
scratch npm project outside the repo, purely for this session's own testing, nothing added to
`package.json`), driving the real dev server (`pnpm dev`), through "Start from Scratch" → Research
tab → Beam Search view → Run → (Cancel or Apply). Both bugs below were found this way, not by reading
code more carefully — they're specifically the class of bug that only shows up with a real
single-threaded browser Worker and real Vue reactivity, which nothing else in this project's test
suite exercises.

### Bug 1 (fixed): `postMessage` throws on live Pinia state

`createBaseEngineState(actionsStore.effectiveSnapshot)` and `getSimulationContext()` (both called in
`useBeamSearch.ts`'s `start()`) return **live Vue-reactive Pinia state**, not plain data. The very
first real Run click threw, synchronously, on the main thread, before the message ever reached the
worker: `Failed to execute 'postMessage' on 'Worker': #<Object> could not be cloned`. This was a gap
neither Phase A (pure functions, no Pinia in scope) nor Phase B's own rawBackup-focused verification
(which only checked `structuredClone` against a *plain* Long-shaped object) would ever have surfaced.

Fix: `sanitizeLongsForWorker` (already built in Phase B for the Long problem) turns out to fix this
too, as a side effect — its recursive `Object.entries`-based rebuild is transparent to Vue's reactive
Proxy traps, so walking a reactive object through it produces a genuinely plain, structured-clone-safe
copy. `useBeamSearch.ts`'s `start()` now wraps both `startState` and `context` through it before
`post()`. `beamSearch.protocol.ts`'s doc comment on `sanitizeLongsForWorker` was rewritten to describe
both jobs it does now (Long-safety AND reactivity-stripping), not just the original one. `post()` also
gained a `try/catch` around `postMessage` itself, reporting a clean `status: 'error'` instead of an
unhandled exception if anything new ever slips past sanitization later.

### Bug 2 (fixed): Cancel didn't actually cancel a busy run

Confirmed directly: started a wide/slow run (beam width 4000, ~5-week deadline), clicked Cancel after
~400ms, then polled for 30+ seconds — the generation counter kept climbing the whole time, completely
unaffected by the click. Root cause: `runBeamSearch` runs as **one big synchronous call** with no
`await`/yield point anywhere inside `runSearchLoop`'s while loop, and JS Web Workers are
single-threaded — so the queued `{ type: 'cancel' }` postMessage physically cannot be dequeued and
handled by the worker's `onmessage` until that synchronous call already returns *on its own* (having
already posted its own `result`/`error` by then). The `isCancelled` polling hook in `runSearchLoop`
itself is correctly implemented and passes its own unit tests (`engine/search.spec.ts`) — those tests
call `isCancelled` directly, bypassing the message-passing layer entirely, so they couldn't have
caught this. This is purely a Phase B/C integration gap, not an engine bug.

Fix: `useBeamSearch.ts`'s `cancel()` no longer posts a `cancel` message — it calls `worker.terminate()`
and immediately spawns a replacement worker (`spawnWorker()`, re-wiring `onmessage`/`onerror`), then
sets `status.value = 'cancelled'` directly. This lines up with the "Cancel discards any partial
result" policy already decided in Phase B (there's nothing to gracefully preserve either way) and
needs no cooperation from the worker at all. Verified: Cancel now takes effect within one Playwright
poll interval (~2s, likely near-instant), and the replacement worker was confirmed to still handle a
subsequent Run correctly. The worker's own `cancel`-message handling code was **left in place**
(harmless, and correct *if* something ever reaches it — e.g. a future restructuring that makes
`runSearchLoop` yield once per generation, noted as a follow-up below) but its doc comments, and
`BeamSearchOptions.isCancelled`'s own doc comment in `engine/types.ts`, were updated to say plainly
that the message-based path is currently unreachable in practice, so nobody re-discovers this the
hard way.

### What was NOT hit

The success path (Run → live progress → result → Apply) was also verified end-to-end, using a
synthetic empty `rawBackup` (`{}`) injected directly into the `initialState` Pinia store for the test
session only (via a one-line `window.__pinia` exposure temporarily added to `main.ts`, reverted
before this session ended — `git diff main.ts` is clean) — a real player backup wasn't available in
this sandboxed environment. A beam-width-3 run against a bare "Start from Scratch" state completed in
2s, found a 177-purchase plan reaching a 72.000B/hr delivery rate, and clicking Apply correctly
inserted every purchase into the real action history with correctly re-derived prices/sale timing
(confirmed visually — a "SAVE 22M 385" annotation appeared on one purchase, meaning the sale-aware
timing logic actually engaged). No console errors at any point across every path tested (error,
success, Apply, Cancel, re-run after Cancel).

---

## Open questions / follow-ups for whoever picks this up

1. ~~Not yet tested: does `rawBackup` survive the Worker postMessage boundary?~~ **Resolved in the
   Phase B session** — tested directly, confirmed it does NOT survive cleanly (Long fields silently
   corrupt), and fixed via `sanitizeLongsForWorker`. See Phase B's writeup above. (Turned out there
   was a second, bigger postMessage problem — live Vue reactivity — only found once Phase C actually
   ran the worker for real; see "Live verification" above.)
2. ~~Not yet implemented: cancellation.~~ **`runSearchLoop`'s hook was implemented in the Phase B
   session** — but turned out to be unreachable via the worker's message protocol in practice; **the
   Cancel button itself was fixed this session** via terminate+respawn instead. See "Live
   verification" above. Real follow-up now: make `runSearchLoop` yield once per generation (e.g.
   `await` a resolved microtask right where `onProgress` already fires) so the message-based path
   could work too — not done, since terminate+respawn already fully satisfies the UI's actual need.
3. **The `habPurchasePlan.ts` numerical bug** (see above) — real, pre-existing, affects production
   I1/K2 shifts under certain inputs. Worth its own investigation; not touched here.
4. **Convergence was only validated against a maxed-out fixture** where the score plateaus almost
   immediately. Worth also benchmarking a "mid-progression, not fully maxed" scenario to see the
   search actually differentiate quality across beam widths — the current numbers can't distinguish
   "beam search is genuinely finding the same optimal answer every time" from "beam search would
   also plateau on a less saturated fixture" (though the oracle test does independently confirm
   correctness on its own tiny scenario, so this is a quality-signal question, not a correctness one).
5. **Phase 3 throttle's earnings-based heuristic caveat** (decision #9) — a real, documented
   approximation gap, not fixed.
6. **No "deep fuzz" oracle campaign** was built (unlike `artifact-explorer`'s), only a smoke-tier
   equivalent (one exact-match check, one monotonicity check). Could be extended with more scenario
   variety (Part 3's own suggested benchmark scenarios: early/mid/late progression, phase-transition
   stress test, duplicate-state stress test) if more confidence is wanted.
7. ~~`beamSearch.worker.ts` has never actually run as a real Worker.~~ **Resolved this session** — see
   "Live verification" above. Run/error/Apply/Cancel/re-run-after-cancel were all exercised in a real
   browser against the real dev server.
8. **Cancel-discards-partial-result is a policy choice, not a constraint** — still true, but the
   *mechanism* changed this session (terminate+respawn, not a graceful worker message — see "Live
   verification"). If a future UX wants "keep the best-so-far result on cancel" instead, that's a
   `useBeamSearch.ts` change (skip the terminate, post a real cancel and wait for the worker's own
   `cancelled`/`result` message) that would first need the yield-per-generation follow-up (open
   question #2) to actually be reachable in time — terminate+respawn can't offer a partial result by
   its very nature.
9. **Realistic-fixture edge cases with `rawBackup: {}` weren't stress-tested** beyond the one live
   run described above (which used a genuinely bare "Start from Scratch" state deliberately, to keep
   the manual test fast). A real player's populated `rawBackup` — with a large `virtueAfxDb`
   inventory — hasn't been run through the live worker at all this session; Phase A's own test suite
   (`testFixtures.ts`'s `MAXED_RAW_BACKUP`) is the closest existing coverage for that shape, just not
   through the actual postMessage/worker path. Worth doing once a real backup is available to test
   with.
10. **Nothing has been committed.** Recommend reviewing the full diff and committing now — the
    working tree mixes this session's and the Phase A/B sessions' changes with pre-existing unrelated
    uncommitted changes to `c3.ts`/`researchRanking.ts`/`smartBuyPreview.ts` (see "Files touched"
    above), so `git diff` on those three needs a careful read to separate the two. The feature itself
    is complete and live-tested — this is a natural point to commit and open a PR.

---

## Where to find the full reasoning

- `01-overview.md` – `05-design-decisions.md`: the original game-agnostic design (chatbot-authored).
- `06-egg-codebase-integration.md`: how that design maps onto this codebase, written before any code
  existed. Still accurate — nothing in Phase A contradicted it, only refined a few specifics (see
  "Key decisions" above, several of which update/resolve that doc's own open questions).
- This file: what's actually been built, what was learned by doing it, what's left.
- In-code doc comments throughout `src/beam-search/engine/*` and the four touched production files:
  the detailed "why," inline where the reasoning is most useful.

# Beam Search — Handoff / Status Document

**Last updated:** 2026-08-10. Builds on top of the already-shipped Phase A/B/C feature, across
several efforts on the same branch: diagnostics tooling (generation-history panel + winning-path
trace export + a per-shift "Copy Log" button), then — using that tooling on real runs — algorithm
fixes to the search itself (payback-cap exclusion, fast-forward-to-sale, a correction to the
payback-cap exclusion after a real regression report, a performance optimization for
`getOptimalELRSet`, a fix — confirmed necessary via a real re-run, not just a raised cap — for a biased
Phase 3 eligibility throttle (now user-configurable next to Beam Width, and earnings/stratified split;
confirmed via real re-runs to have fully saturated the eligibility question), and then — once that
saturation *also* confirmed the same earnings-only bias existed one level up, in the main beam-width
trim itself, permanently discarding branches rather than just under-sampling them — an earnings/elr
dual-axis fix for that trim too (`selectBeamSurvivors`). See "Diagnostics tooling" and "Algorithm
improvements" below.
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

## Status: Phase A/B/C shipped and committed. Diagnostics tooling + two algorithm fixes on top.

The original execution plan had three phases, all committed (`git log --oneline -- src/beam-search
src/workers`: "initial beam search work" = Phase A, "beam search phase 2" = Phase B+C together):
- **Phase A — pure engine, verified in isolation.** ✅ Done and committed.
- **Phase B — Web Worker.** ✅ Done and committed.
- **Phase C — manual planner UI wiring.** ✅ Done and committed, live-tested in a real browser.

**This session's work (diagnostics tooling, see below) is on a feature branch
(`beam-search-diagnostics`), not yet committed to `main`.** The user asked for it directly — not part
of the original three-phase plan — after using the shipped feature and finding the results "not
great" with no way to see *why*: no visibility into pruning, plan comparisons, or the search's own
reasoning. See "Diagnostics tooling" below for what was built in response and how to use it.

---

## What exists right now

### New pure engine — `src/beam-search/engine/`

| File | Purpose |
|---|---|
| `types.ts` | `BeamSearchState`, `BeamPurchase` (research/tierMacro/phase3Macro/phaseTransition edges), `BeamFrozenContext`, `BeamTerminalResult`, `BeamSearchOptions`/`Progress`/`Result`, `absoluteSimTimeOf`, `splitEngineState`/`toEngineState`. Also (this session, diagnostics tooling) `BeamSearchOptions.trace`, `BeamSearchProgress`'s new counters, and the trace output types `WinningPathTrace`/`WinningPathStepTrace`/`FinalStepTrace`/`BeamMemberSummary` — see "Diagnostics tooling" below |
| `candidates.ts` | `getLightweightPhaseCandidates` — Phase 1/2 candidate generation, purpose-built (NOT `rankResearchByROI`, see integration doc §4 for why) |
| `macros.ts` | `runTierMacro` (wraps `runTierUnlockMilestone` unchanged), `runPhase3Macro` (wraps `runDeliveryBuyLoop` unchanged + scores via `computeRealisticELR`/`getOptimalELRSet`), plus the two perf caches (`Phase3ScoreCache`, `Phase3ArtifactFamilyCache`) |
| `dedupe.ts` | `researchLevelsKey`, `researchStateKey`, `dedupeByEarliestTime` — "earliest identical research-state wins" pruning |
| `search.ts` | The outer beam loop: `runSearchLoop`. Also exports `selectCandidates`, `applyResearchPurchase`, `phaseTransitionChild` for the oracle test's reuse, and (this session) `RankedState` — `rankByEarnings`'s return type, reused by the diagnostics trace capture |
| `reconstruct.ts` | `reconstructPlan` — walks parent pointers, flattens macro edges into one ordered purchase list. Also (this session) builds the optional winning-path trace when given `generationTraces`/`finished` — see `buildWinningPathTrace` and `TRACE_ALTERNATIVES_LIMIT` |
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
| `composables/useBeamSearch.ts` | Owns the worker instance + one run's lifecycle: `status`/`progress`/`result`/`errorMessage` refs, `start(deadline, beamWidth, maxDepth?, trace?)`, `cancel()`. Builds `startState`/`context` from live Pinia state and sanitizes both before `postMessage` (see "Live verification" Bug 1). `cancel()` terminates and respawns the worker rather than posting a message (see Bug 2) — read this file's own doc comments before touching cancellation again. Also (this session) `generationHistory` — per-generation diagnostics derived by diffing consecutive `progress` messages, see `GenerationSummary`/`diffProgress`. |
| `components/actions/BeamSearchView.vue` | The tab's UI — deadline (date/time/timezone, defaulting to the next research sale's end) + beam-width inputs, Run/Cancel, live progress, result preview + Apply button. Shaped like `SmartBuyView.vue`; emits `apply` with the `BeamSearchResult` rather than applying it itself. Also (this session) the "Detailed diagnostics" checkbox, the collapsible generation-history table, and the "Export Trace" button — see "Diagnostics tooling" below. Also (later session) a "Fetch Player Data" button on the error state, specifically for `runBeamSearch`'s "requires context.rawBackup" error (hit for real: a plan loaded from the library omits `rawBackup` by design, same situation `ResearchFlatView.vue`'s "Artifact Data Required" panel already handles for the ELR view) — calls `fetchPlayerBackup` and sets `initialStateStore.rawBackup` only, deliberately NOT App.vue's `handleRefreshReconcile`/`refreshReconcile` (that path also resyncs Virtue/FuelTank state via `loadAndSyncBackup`, which overwrites the live plan's `shiftCount`/`te` with the backup's values — wrong for a plan that's deliberately diverged from the live backup). Resets `status` to `idle` on success so the ordinary Run button reappears; doesn't auto-rerun. Which player ID to fetch needed a second pass, also found live: `initialStateStore.playerId` itself is redacted to the literal placeholder `'xxxxxxxxxx'` for a plan loaded from the library, same privacy reason as `rawBackup` — passing that straight through didn't fail cleanly, it reached the proxy and came back as a cryptic "invalid literal for int() with base 10: 'xxxxxxxxxx'" 500. Fixed by `fetchablePlayerId`: use the store's `playerId` only if it passes `PlayerIdSchema`, else fall back to `getSavedPlayerID()` (`lib/storage.ts`) — the same site-wide "last used player ID" `the-player-id-form` itself reads/writes, populated independently of whatever plan is loaded. |
| `components/actions/ResearchActions.vue` (modified) | Renders `BeamSearchView` when `currentView === 'beam_search'`; `handleApplyBeamSearchPlan` (new) replays `result.researchIds` through the exact same `syncEventStateForItem`/`buyOneLevel`/`batch`/`withExpiryCheck` pattern `handleBuyMilestoneChain` already used — no new replay logic. |
| `composables/useResearchViews.ts` (modified) | `'beam_search'` added to `ViewType`/`VIEWS`/`viewDescription`'s switch — same registration every other view already has. |
| `lib/actionLog.ts` (new, this session) | `buildActionHistoryLog` — plain-text, one-line-per-action, absolute-timestamped log of a given `Action[]` slice, for pasting into a chat message. Not scoped itself (takes whatever actions it's given); `CuriositySummary.vue` is what scopes it to one shift group. |
| `composables/useCopyActionLog.ts` (new, this session) | `useCopyActionLog(getActions: () => Action[])` — same Clipboard-API-with-manual-select-fallback shape as the pre-existing `useCopyDiagnosticReport.ts`, parameterized by which actions to log rather than a fixed source. |
| `components/summaries/CuriositySummary.vue` (modified, this session) | New "Copy Log" button, scoped to just that shift group's own actions (`headerAction` + `actions`) — deliberately NOT a whole-plan export; see the button's own doc comment for why (a 1656-action whole-plan export silently truncated past a chat message size limit, found by direct testing). |

### Tests

| File | What it covers |
|---|---|
| `index.spec.ts` | Smoke test: valid research IDs, correct level ordering, deadline respected, clean error when `rawBackup` missing. Also (this session) `result.trace` end-to-end: absent by default, populated with `trace: true`, same plan either way, step depths strictly increasing, `chosenRank`/`beamSizeThisGeneration`/`finalStep` internally consistent |
| `dedupe.spec.ts` | `researchLevelsKey`/`researchStateKey`/`dedupeByEarliestTime` unit tests |
| `candidates.spec.ts` | Category filtering (phase 1 excludes non-ROI, phase 2 restricts to delivery-impact), tier-lock filtering, phase2 ⊆ phase1. Also the negligible-relative-earnings-impact exclusion: a shipping-capacity candidate disappears once laying rate is the clear bottleneck (`habIds: [14, null, null, null]` override), a control test confirming it's offered normally without that override, and (later session, regression test) `multi_layering` confirmed present despite its enormous absolute price — see "Algorithm improvements" §3 |
| `../../lib/artifacts/virtue.spec.ts` (later session) | `getOptimalELRSet`'s stone-swap fast path: every scenario asserts `withHint` equals `withoutHint` bit-for-bit rather than a hardcoded loadout. Covers all three of `tryStoneSwapFastPath`'s decision branches (confirmed via throwaway instrumentation during development, not just inferred) — trusts an already-balanced hint unchanged, corrects a deliberately-mixed hint via a single swap, and falls back to the full search (large jump, stone-pool exhaustion, wrong-length/stale hint) — see "Algorithm improvements" §4 |
| `reconstruct.spec.ts` | Parent-chain walking + macro-edge flattening, hand-built synthetic chains. Also (this session) the trace: `chosenRank`/`alternatives`/`beamSizeThisGeneration` against a synthetic two-generation chain with decoys, the alternatives cap, and a regression test locking in the `winnerRank`-vs-`pickWinner` tiebreak fix (see "Diagnostics tooling" below). Also (this session) the `waitForSale` edge: adds nothing to `researchIds` but populates `saleWaitTimes`; `saleWaitTimes` stays empty when unused |
| `search.spec.ts` | `runSearchLoop`'s `isCancelled` hook: stops before any generation when already true, stops within a generation or two of flipping true mid-run, reports `metrics.cancelled: false` on an ordinary uncancelled stop. Also (this session) the new cumulative counters (monotonic, successes ≤ attempts, `finishedCount` matches `finished.length`) and `generationTraces` (absent by default, one entry per generation when `trace: true`, doesn't change the search outcome). Also (this session) `selectCandidates` (only-meets-70% filtering, empty array — not a fallback to the unfiltered input — when nothing clears 70%, empty input stays empty) and `fastForwardToSale` (lands exactly at `nextSaleStart` with `activeSales.research` flipped on, accrues gems over the wait, correctly reflects `earningsBoost` at the arrival time rather than the departure time). Also (later session) `selectPhase3Eligible` — see "Algorithm improvements" §6 — and `selectBeamSurvivors` — see §7 |
| `oracle/beam-oracle.spec.ts` | **Exact small-case validation** — beam matches true exhaustive-search optimum bit-for-bit; beam-width monotonicity. Also (this session) the oracle's own exhaustive walk was updated to offer the same `fastForwardToSale` move the real beam can take, so it keeps testing the actual move set rather than a strictly weaker approximation of it |
| `convergence.spec.ts` | NOT a correctness test — timing/quality benchmark across beam widths and deadlines. Gated behind `RUN_CONVERGENCE=1` (see "How to run things" below) |
| `../../workers/beamSearch.protocol.spec.ts` | Documents the `structuredClone`+Long risk with a direct experiment (a Long-shaped instance survives cloning but silently loses its prototype/methods), then verifies `sanitizeLongsForWorker` fixes it: converts Long-shaped values to numbers (signed and unsigned), recurses through nested objects/arrays, deep-clones (doesn't mutate input), and the sanitized output survives a real `structuredClone` with correct numbers intact |

All of the above (except `convergence.spec.ts`, correctly gated) pass under plain `pnpm test`:
**8 test files passed (1 skipped), 72 tests passed (1 skipped).**

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
  - Later session: also threads a `previousStoneAssignment` hint (derived from the baseline's own
    stones) through the same three call sites — see "Algorithm improvements" §4 below.
- **`src/lib/artifacts/virtue.ts`**:
  - Added optional `fixedArtifactFamilies?: string[]` option to `getOptimalELRSet`. When present,
    skips the expensive 1-4-artifact combination search (up to 495 combos) and re-optimizes stones
    for exactly that family selection instead. See that function's own doc comment for the full
    correctness argument (candidate-gathering is inventory-only, doesn't depend on research levels
    — confirmed by reading the code, not guessed). Falls back to the full search if the requested
    families don't match current inventory.
  - Later session: added `previousStoneAssignment` option + `tryStoneSwapFastPath` — see "Algorithm
    improvements" §4 below.
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

## Diagnostics tooling (this session)

**Why:** after using the shipped feature for real, the user reported the results weren't great, but
had no way to see *why* — no visibility into what the search pruned, how it compared plans against
each other, or its own reasoning at each decision point. Explicitly wanted something anchored on the
UI (pick a real start/end state, run it, then investigate "how did you get here") rather than an
overwhelming stream of console logs. Discussed several options (a live stats panel, an exportable
"explain the winning plan" trace, a scenario-export + convergence-test harness, A/B trace diffing);
user picked the first two to build now — the other two remain good follow-ups, not done here.

### What was built

1. **A live, always-on generation-by-generation diagnostics panel** in `BeamSearchView.vue` — a
   collapsible table (collapsed by default, per the "not overwhelming" requirement), one row per
   progress message, showing candidates generated → deduped → kept, tier-macro and Phase 3 attempts
   vs. successes, cumulative complete-plans-found, best score so far, and how long that row's
   generation(s) took. Immediately useful on its own for spotting the kind of thing that would explain
   "not great" results — e.g. dedup wiping out most of a generation, or Phase 3 rarely actually being
   attempted.
2. **An exportable winning-path trace** (`WinningPathTrace` in `engine/types.ts`) — a JSON download
   (via the existing `utils/export.ts#downloadFile`, same one `PlanLibrary.vue` uses) covering every
   generation the *winning plan itself* passed through: what was chosen, its earnings and rank within
   that generation's beam, and the top handful of other beam members that were competitive at that
   same fork but not chosen. Plus a final step showing how the winning Phase 3 attempt ranked among
   every other complete plan the search found. Bounded by construction (steps ≈ generation count, a
   few dozen to ~200, not the hundreds of individual purchases `researchIds` might list; alternatives
   per step capped at `TRACE_ALTERNATIVES_LIMIT = 5` in `reconstruct.ts`) — this is the part that keeps
   it from becoming "an overwhelming swarm of logs" despite covering the whole run.

Both are opt-in-adjacent: the generation panel is always populated, but only gets one row per
*generation* precisely (rather than occasionally coalescing a few together under the worker's
progress-message throttle) when the new "Detailed diagnostics" checkbox is on; that same checkbox is
what enables the trace capture at all (`BeamSearchOptions.trace`), since retaining a beam-sized
snapshot every generation for the whole run is a real, if bounded, memory cost not worth paying by
default.

### How the pieces fit together (engine → worker → UI)

- `engine/search.ts`: `rankByEarnings` now returns `{state, earnings}[]` (a new `RankedState` type)
  instead of just reordered states, so its already-computed earnings values can be reused for
  diagnostics without recomputing `computeSnapshot`. New cumulative counters on `BeamSearchProgress`
  (`candidatesGenerated`, `tierMacroSuccesses`, `phase3MacroSuccesses`, `finishedCount`) — cumulative
  like every other counter there (not per-generation), for the same reason those already are: progress
  messages can be throttled/coalesced, so a "per generation" field would sometimes lie. When
  `options.trace` is true, `runSearchLoop` also retains each generation's post-trim,
  earnings-ranked beam (`RunSearchLoopResult.generationTraces: Map<number, RankedState[]>`) — cheap to
  capture (the ranking was already being computed; capturing is just holding onto the array instead of
  discarding it), but a real memory cost across a whole run (see `BeamSearchOptions.trace`'s doc
  comment).
- `engine/reconstruct.ts`: `reconstructPlan` optionally takes `{ finished, generationTraces }` and, if
  given, cross-references the winning parent chain against those snapshots **by object reference**
  (a state that's part of the winning path was, by construction, part of the beam `runSearchLoop` kept
  for its own generation) to build the trace — no new capture logic needed here, just consuming what
  search.ts already retained.
- `engine/index.ts`: threads `options.trace` down to `runSearchLoop` and the captured data into
  `reconstructPlan`; `BeamSearchResult.trace` is present only when requested.
- `workers/beamSearch.protocol.ts` / `beamSearch.worker.ts`: `trace` added to the `start` message;
  the worker also uses it to decide whether to keep throttling `progress` posts for that run (see
  above).
- `composables/useBeamSearch.ts`: new `GenerationSummary` type + `generationHistory` ref, built by
  diffing each incoming (cumulative) `BeamSearchProgress` against the previous one — deliberately done
  here, not upstream, since "how do we want to present this" is a UI-layer concern, matching this
  file's own established scope. `start()` gained a `trace` parameter, threaded straight through.
- `components/actions/BeamSearchView.vue`: the "Detailed diagnostics" checkbox, the generation-history
  table, and the "Export Trace" button (visible once `result.trace` exists) that bundles the result +
  trace + full generation history into one downloaded JSON file.

### A real bug this caught (fixed)

Live-tested the same way the Phase C work was (Playwright + Chromium against the real dev server —
see "Live verification" above for the setup, reused as-is this session). A real exported trace showed
`finalStep.winnerRank: 11` even though the exported plan was unambiguously the one `runBeamSearch`
actually returned. Root cause: `buildWinningPathTrace` (reconstruct.ts) ranked `finished` by
`finalScore` alone, but `engine/index.ts`'s `pickWinner` breaks ties by earliest `lastPurchaseTime` —
and score ties turn out to be common in practice (the score plateaus once the delivery ceiling is hit,
same behavior the Phase A convergence notes above already documented), so the two rankings routinely
disagreed. Fixed by sorting with the exact same comparator `pickWinner` uses; `winnerRank` is now
provably always 1 (kept as an explicit field anyway, as a visible consistency check rather than
assumed and removed — see its doc comment in `types.ts`). Regression test added in
`reconstruct.spec.ts` with a deliberate tie scenario.

### Verified live (this session)

Using the same synthetic-`rawBackup: {}` + `window.__pinia` probe technique as the Phase C
verification (temporarily added to `main.ts`, reverted before this session ended — clean `git diff
main.ts`): ran a real search with "Detailed diagnostics" on, confirmed the generation-history table
populated correctly generation-by-generation (candidates/dedup/kept/tier/Phase 3/best-score/timing all
sane), expanded it, clicked Export Trace, and inspected the downloaded JSON directly — confirmed
`steps`/`alternatives`/`chosenRank`/`beamSizeThisGeneration`/`finalStep` all structurally correct
against a real 27-generation run (12 winning-path steps, 74 total Phase 3 attempts found). This is
also where the `winnerRank` bug above was actually found — by reading the real exported file, not by
reasoning about the code.

One genuinely interesting finding from that same real trace, worth following up on: at one step the
winning path's chosen state was ranked **17th of 20** in its generation's beam by the earnings
heuristic — i.e., far from what `rankByEarnings` would have called "most promising" at the time, yet
it's what the actual winning plan went through. Either the earnings proxy is (correctly) valuing
something the immediate number doesn't show, or the winning path only survived because beam width gave
it enough slack, not because the heuristic favored it — exactly the kind of question this tooling was
built to let the user chase down themselves.

**Update: chased down, this session (see "Algorithm improvements" below) — not the actual cause.**
The 17th-of-20 finding, and a follow-up "does beam width 1000 do any better" test (identical score,
identical `endLevels`, only purchase *order* differed — width was never the bottleneck), both turned
out to be dead ends. What the user's own manual plan actually diverged on, found by having the user
export a real action-history log (see the new "Copy Log" button, `CuriositySummary.vue`) and diffing
its real purchase sequence against a beam-search trace covering the identical window: beam search
bought 5 more shipping-capacity purchases (`dark_containment`/`neural_net_refine`) than the human did,
paid for by 5 fewer earnings-side ones. Root cause found and fixed — see below.

---

## Algorithm improvements (this session)

Two real changes to `runSearchLoop`'s own decision-making, both suggested directly by the user after
reviewing the diffed purchase sequence above, not just diagnostics this time — the actual search
algorithm changed as a result of using the tooling built earlier this session.

### 1. Hard-exclude candidates with an effectively-infinite ROI payback

**The finding:** `getLightweightPhaseCandidates` (candidates.ts) had no equivalent of the "real" ROI
ranking function's (`researchRanking.ts`) `MAX_ROI_PAYBACK_SEARCH_SECONDS` (999 days) cap or its
`isBottlenecked`/partner-pairing logic for laying/shipping research. Concretely: `effectiveLayRate.ts`
caps earnings at `min(layRate, shippingCapacity)`, so buying more shipping capacity while laying rate
is the real constraint (or vice versa) shows ~zero marginal `earningsDelta` — genuinely worthless, not
just weak — but nothing was hard-excluding it. Combined with `selectCandidates`'s old fallback (see
below), a near-worthless candidate could still slip back into consideration during a lean stretch.

**The fix:** `getLightweightPhaseCandidates` now computes an approximate `roiSeconds` (the same
lightweight `price / earningsDelta` shape the rest of the function already uses, not
`calculateResearchROI`'s exact compounding binary search) and excludes the candidate outright —
before `meets70` is even computed, so it can never re-enter via any fallback — when that's `Infinity`
or exceeds the existing `MAX_ROI_PAYBACK_SEARCH_SECONDS` constant (imported from `researchROI.ts`,
not redefined).

### 2. Fast-forward to the next sale instead of settling for a weak purchase

**The finding:** `selectCandidates` used to fall back to the *entire unfiltered* candidate list
whenever nothing cleared the 70%-by-next-sale bar — meaning the search could end up buying something
it had already judged not worth buying yet, rather than doing what a human naturally would: wait.

**The fix:** `selectCandidates` no longer falls back — it just returns whatever clears 70% (possibly
empty). `runSearchLoop`'s main loop now checks for exactly that case (real candidates existed, none
were good enough) and generates one new kind of successor instead: `fastForwardToSale` (search.ts), a
pure time-advance to the next research sale's start, no purchase. Explicitly modeled on the manual
planner's own "Wait for Research Sale" wait action (`lib/actions/executors/waitForResearchSale.ts` /
`ResearchActions.vue`'s `insertEventCrossingWaits`) per the user's own instruction — reuses
`applyTime` + `boostTransitionsFrom` exactly the way `applyResearchPurchase` already does for its own
(usually shorter) waits, so a 2x earnings boost starting or ending *during* the wait is correctly
integrated piecewise (`calculateEarningsForTime`'s own transition handling — verified by reading it,
not assumed) and gems accrue throughout, landing with `activeSales.research` explicitly flipped on
(confirmed by direct inspection that this doesn't happen automatically anywhere in this codebase —
`engine/apply/actions.ts`'s `toggle_sale`/`toggle_earnings_boost` handlers are the *only* things that
ever change these fields, so a multi-day simulated wait has to set them explicitly rather than
inherit whatever was true when the wait started).

New `WaitForSaleEdge` (`types.ts`) and `BeamSearchResult.saleWaitTimes: number[]` (reconstruct.ts)
give this the same visibility `tierUnlockTimes`/`phaseTransitionTime` already have.

**The oracle had to change too** (`oracle/beam-oracle.spec.ts`): since it's meant to be an unlimited,
unthrottled version of the *same* move set the beam has (see that file's own header comment), its
exhaustive walk now offers the identical `fastForwardToSale` branch — otherwise it would silently be
testing a strictly weaker search space than the real beam has, and the "beam matches oracle exactly"
assertion could break the moment the new move ever mattered in the tiny test scenario.

**Testing note, worth knowing before touching this again:** getting `selectCandidates` to naturally
return empty against a *real* fixture turned out to be surprisingly hard — `getSaleAwareTimeToSave`'s
own sale-aware pricing routinely pulls a candidate into `meets70` via `duringSale` the moment a sale
falls within its wait window, and several attempts at engineering a "nothing clears 70%" scenario
(shrinking habs, maxing out tiers 1-12, positioning right before a sale, a bare/unbonused economy)
all still cleared the bar. That's actually a reassuring sign — it suggests this really is a rare edge
case in practice, not a common one — but it meant the two pieces (`selectCandidates`'s new no-fallback
contract, `fastForwardToSale`'s own state-transition correctness) ended up tested in isolation with
hand-built inputs (`search.spec.ts`) rather than via one clean end-to-end `runSearchLoop` trigger. The
full existing suite, including the oracle's exact-match test, continues to pass unchanged with both
new behaviors wired in — that's the integration-level confidence this change has, short of a
dedicated end-to-end trigger.

Not yet verified: whether these two changes actually close the ~1.1% gap to the user's own Smart Buy
result on a *real* run (only unit/oracle-level correctness has been confirmed so far, on synthetic
fixtures) — worth the user re-running the same beam-search-vs-Smart-Buy comparison against their real
backup once they're back at it, and checking whether `dark_containment`/`neural_net_refine` purchase
counts (or `saleWaitTimes`) look different.

**Update, later session — the two changes above were live-tested on real data and matched/beat manual
play convincingly** (a longer-horizon real run: beam width 50 hit 4.471q/hr vs. the user's manual
1.961q/hr; width 1000 hit 5.685q/hr). That surfaced a real regression from change #1 above, described
next.

### 3. Fix #1's exclusion wrongly caught genuinely great research, not just worthless research

**The bug report:** real testers found the beam search's winning plans never bought Multiversal
Layering level 2 (10x earnings, one of the best purchases available at this game stage) — one tester
specifically noted it was the fastest-ROI item for their *entire* C3 window in real play.

**Root cause, confirmed directly (not guessed) via a throwaway script against the realistic test
fixture:** `getLightweightPhaseCandidates` computed `roiSeconds = price / earningsDelta` and excluded
anything over `MAX_ROI_PAYBACK_SEARCH_SECONDS` (999 days) — an **absolute**, flat-current-earnings-rate
payback projection. For `multi_layering`, `earningsDelta` was a full ~9x of current earnings (its
level 0→1 is a flat 10x multiplier — nowhere near negligible), but its price is so large that
`roiSeconds`, computed against the fixture's still-comparatively-small current earnings, came out to
**~387 million days**. That's not a "this research is worthless" signal — it's an artifact of
comparing an enormous fixed price against a CURRENT earnings snapshot that's expected to grow
enormously over however much ascension remains, which the flat-rate framing has no way to represent.

The shipping/laying bottleneck case exclusion #1 actually exists for (see above) has a categorically
different signature, also confirmed directly: `earningsDelta` for a shipping purchase while
laying-bottlenecked is **exactly 0**, not merely small — `effectiveLayRate.ts`'s
`min(layRate, shippingCapacity)` means the increased side genuinely doesn't move anything, regardless
of how much ascension time remains for it to "grow into."

**The fix:** replaced the absolute `roiSeconds`-vs-999-days cutoff with a **relative** floor —
`earningsDelta / currentOfflineEarnings <= NEGLIGIBLE_RELATIVE_EARNINGS_DELTA` (1e-9). This still
excludes the bottleneck case (0 / anything = 0, always at the floor) without excluding expensive-but-
genuinely-valuable research like ML2 (~9.0 relative, nowhere near the floor). "Positive impact but slow
given the time actually remaining" is left to the already-existing, already-correct mechanisms for that
concern (`meets70`/`fastForwardToSale`) — this exclusion is now scoped to exactly what it was meant for:
purchases with no real effect at all, not merely expensive ones.

**Regression test** (`candidates.spec.ts`): `multi_layering` is confirmed present in phase-1 candidates
against the unmodified realistic fixture, with both an enormous price (>1e40) and a positive
`earningsDelta` — the exact shape the bug report described. The existing shipping-bottleneck exclusion
test (and its control) both still pass unchanged, confirming the relative-floor rewrite didn't
reintroduce the original problem while fixing this one. Full suite: still green, oracle included (the
oracle imports `getLightweightPhaseCandidates` directly rather than reimplementing it, so it stays in
sync with this change automatically).

### 4. Stone-swap fast path for `getOptimalELRSet` (performance, not a correctness fix)

**The problem, from a live cost discussion:** `rankResearchByELRImpact`'s `'realistic'` mode calls
`getOptimalELRSet` once for a baseline, once per unpurchased candidate, and again per lookahead level
for zero-impact candidates — and `runDeliveryBuyLoop` calls that whole ranking function once per
purchase. Even with `fixedArtifactFamilies` already skipping the expensive 495-combo family search
(prior session), what's left — the per-slot greedy stone fill (`evaluateStones`, called
`totalStoneSlots + 1` times, each a fresh `JSON.parse(JSON.stringify(...))` clone plus a full
hab/lay/ship/elr recompute) — still refills every slot from empty on every single call, even though
consecutive calls almost always differ by exactly one research level.

**The fix, the user's own idea, refined through discussion:** `getOptimalELRSet` gained a
`previousStoneAssignment?: (string | null)[]` option. When set (and `fixedArtifactFamilies` narrowed
the search to one combo), a new `tryStoneSwapFastPath` tries the hint unchanged first, and if
`layRate`/`shipRate` aren't within `STONE_FAST_PATH_TRUST_RATIO` (0.98) of each other, tries exactly
one stone swap (Tachyon feeds `eggLayingRateMultiplier`, Quantum feeds `shippingCapacityMultiplier` —
confirmed directly in `lib/artifacts/effects.ts`, not assumed) before deciding whether to trust the
result. Falls back to the existing full from-scratch fill — unconditionally correct, just slower —
whenever no swap is possible (pool exhausted, nothing of the over-represented type to remove) or even
the best single swap is still meaningfully imbalanced. Every trusted result still runs through the
exact same `evaluateStones`/`isGlobalBetter` comparison the full search uses, so a hint can only ever
change *how cheaply* an answer is reached, never *what* the answer is.

`rankResearchByELRImpact` threads a `baselineStones` hint (the baseline's own flattened stone
assignment) through both its per-candidate and lookahead `getOptimalELRSet` calls — exactly the shape
those calls have (each one research-level-or-few away from the same baseline).

**Testing note, worth knowing before touching this again:** building a fixture where lay/ship actually
land close to balanced took real trial and error — an arbitrary research-level pick (e.g. just
`comfy_nests`) reliably produced a state so lopsided (shipping capacity swings enormously per level
once maxed vehicles are in play) that no single swap — or even the full search's own best effort —
could balance it, which isn't representative of the common "one purchase since last call" case these
tests exist to cover. `virtue.spec.ts`'s `baseResearch` levels were found by an empirical sweep script
(not guessed), landing at ~99.3% lay/ship balance. A second gotcha: `assumeMaxHabsVehicles: true` only
takes effect when `backup.farms?.[0]` exists at all (regardless of `assumeMax`) — an empty/absent
`farms` array silently falls back to a single starter vehicle, an easy way to accidentally build an
unfixable fixture without realizing why. All three of `tryStoneSwapFastPath`'s decision branches are
directly confirmed exercised (not just inferred from passing tests) via a throwaway instrumented
build during development: the "already balanced, trust unchanged" branch, the "single swap succeeds"
branch (needed a hand-built, deliberately-mixed hint — a real `getOptimalELRSet` call against this
fixture never organically produces a hint with both stone types present when leaning hard toward one
side), and the "falls back" branch (four different scenarios). Every test asserts `withHint` equals
`withoutHint` bit-for-bit rather than a hardcoded expected loadout, so they stay correct even if game
data changes.

**Not yet done:** `macros.ts`'s own two direct `getOptimalELRSet` calls (the family-cache priming call,
and the final post-`runDeliveryBuyLoop` scoring call) don't receive a stone hint — both are one-per-
branch, not one-per-candidate, so lower value, and threading a hint through would need
`runDeliveryBuyLoop` to expose its own evolving stone assignment, which it doesn't today. Left as a
smaller, separate follow-up if profiling ever shows it matters.

### 5. `PHASE3_MACRO_ATTEMPTS_PER_GENERATION` raised 3 → 10, and a real bias found in the eligibility heuristic

**The trigger:** a real width-1000 run (deadline ≈16 days out) scored 4.968q/hr; the user's manual
sequence over roughly the same window (Unlock Tier 13 → Unlock Multiversal Layering 2 → 70% ROI buy →
delivery-research buy) scored 5.379q/hr, an ~8% gap. `multi_layering` *did* reach level 2 in the beam's
plan (confirming §3's fix works) — this gap is something else.

**What the exported trace (`trace: true`) showed, read directly, not guessed:** the winning path is
only **11 generations deep** (depth 1 = the Tier 13 macro, depths 2-10 = individual phase-1 research
purchases, depth 11 = the phase transition) despite `statesExpanded: 138993` over the full run — most
of the search's breadth never shows up on the winning path at all. Two things stand out:

1. **`phaseTransitionTime` was 12h13m before the deadline** (`Fri Oct 9, 10:57 PM` vs. a `Sat Oct 10,
   11:00 AM` deadline) — the winning branch spent essentially the *entire* ~16-day window in Phase 1,
   leaving Phase 3 (the actual delivery-research spending) only half a day to work with. The user's
   manual sequence budgeted a full day for delivery buying, on top of ML2 (which the auto-throttled
   beam also eventually bought, just very late) — that difference alone plausibly accounts for a real
   chunk of the score gap.
2. **The winning branch's own `chosenRank` (by the same earnings heuristic the Phase 3 throttle uses)
   was 6, then 29, then 54** at depths 7-9, out of a beam that grew to 1000. `phase3Eligible` is built
   from `rankByEarnings(...).slice(0, PHASE3_MACRO_ATTEMPTS_PER_GENERATION)` — the top-N *by current
   earnings*. A branch ranked 54th by earnings at generation 9 would not have received a real Phase 3
   score at that point under either the old (3) or new (10) cap. It only got evaluated at all because
   it happened to still be alive when the search reached the deadline.

**The mechanism this points to, not just this one run:** delivery research and broad earnings research
are in real tension (the whole reason Phase 2 exists as a narrower phase). A branch that invests more
in delivery-relevant research earlier necessarily earns *less* in the short term than a sibling that
keeps maximizing pure earnings — so it ranks lower by `rankByEarnings`, so it's less likely to receive
a Phase 3 attempt, so the search never learns its true (possibly superior) terminal score. That's a
systematic bias toward "stay in Phase 1 as long as possible," not just noise — and it would produce
exactly the symptom seen here: a phase transition pushed right up against the deadline, discovered only
because every surviving branch finally gets swept up when the search runs out of generations.

**Done this session:** `PHASE3_MACRO_ATTEMPTS_PER_GENERATION` raised 3 → 10 as the default. Full suite
still green; total `pnpm test` runtime went from ~57s to ~94s.

**Confirmed this alone wasn't the fix** — the user re-ran the same width-1000 scenario with the cap at
10: 28s runtime, **identical** 4.968q/hr score to the cap-3 run. Exactly as predicted above: raising a
flat cap doesn't touch the underlying bias, since `rankByEarnings` was still the sole ranking signal
either way. This is what motivated actually building the stratified approach below, same session.

### 6. The stratified eligibility fix, built — plus making the cap user-configurable

**User-configurable cap:** `BeamSearchOptions.phase3AttemptsPerGeneration?: number` (types.ts), threaded
through `runSearchLoop` → `runBeamSearch` → the worker protocol (`BeamSearchStartMessage`) → the worker
→ `useBeamSearch.ts`'s `start()` → a new "Phase 3 Attempts" number input next to Beam Width in
`BeamSearchView.vue`. Defaults to `PHASE3_MACRO_ATTEMPTS_PER_GENERATION` (now exported from `search.ts`
and re-exported from `engine/index.ts`) when omitted, so a from-code caller (a future `c3.ts`
integration, tests) never has to know or care about the UI's default. Echoed back on
`BeamSearchResult.metrics.phase3AttemptsPerGeneration` (mirrors how `beamWidth` is already echoed)
and in the exported trace JSON's top-level payload, so an exported trace records what it was actually
run with.

**The stratified fix itself:** `selectPhase3Eligible` (search.ts, exported) replaces the old
`rankByEarnings(...).slice(0, N)` one-liner. It splits the total budget roughly in half:

- An **earnings-ranked half** — same as before, `rankByEarnings(...).slice(0, earnersBudget)`.
- A **stratified half** that rotates a fixed-size window through the current phase-2 members' *array
  positions*, advancing by the window size every generation (`generation` is `depth`, already
  incrementing once per generation in the caller). Over `ceil(phase2Members.length / diverseBudget)`
  generations, every member present in an unchanged-size beam gets covered at least once, independent
  of how it ranks by earnings in any single generation.

No persistent per-branch identity needed (there still isn't one — states are recreated fresh each
generation) since the window is keyed purely off array position + generation number, not branch
history. This is deliberately the simple version discussed, not the "track which branches haven't been
tried in K generations" version — that one would still need a stable ID scheme this codebase doesn't
have; the rotating-window version gets the same eventual-coverage guarantee without it.

**Tests** (`search.spec.ts`, `describe('selectPhase3Eligible')`, 7 tests): empty input, non-positive
budget, budget covering everyone, earnings-ranked half correctly includes the top earner the stratified
half wouldn't reach yet, stratified half correctly includes the lowest earner the earnings-ranked half
would never include, the stratified half's *union* across `phase2Members.length` generations covers
every member (explicitly contrasted against a `diverseBudget: 0` run over the same generations, which
covers only the single top earner — proving the stratified half is what closes that gap, not
incidental overlap), and the window advances by `diverseBudget` each generation, not by a fixed step of
one. Needed a real debugging detour to build: the fixture initially varied `comfy_nests`
(egg_laying_rate) to get a controllable earnings ordering, following the same pattern used elsewhere in
this file — but a direct check showed `comfy_nests` leaves `offlineEarnings` completely unchanged
across every level tried (`rankByEarnings` ranks by `offlineEarnings`, which isn't driven by laying
rate the way `elr`/delivery rate is). Switched to `genetic_purification` (egg_value category), confirmed
directly to move `offlineEarnings` cleanly.

**Verified on real data, same session:** the user re-ran the exact width-1000 scenario with the
stratified split live. Score went from 4.968q/hr (cap 3 *and* cap 10, pre-fix — confirming the old
throttle really was blind to this branch) to **5.021q/hr at cap 10**, and stayed **exactly** 5.021q/hr
all the way through cap 1000 (attempts 10/20/50/100/500/1000 all identical, runtime 33s → 155s). Two
real conclusions from that: the stratified fix genuinely closed part of the gap, and — since going
fully unthrottled (cap 1000 ≈ every phase-2 branch, every generation) changed nothing further —
Phase 3 eligibility is now **fully saturated**. It is no longer the bottleneck. See §7 for where the
investigation went next.

### 7. `selectBeamSurvivors` — the same earnings-only bias, one level up, fixed

**Where the investigation went once §6 was saturated:** the user widened the beam instead (still at
the same real deadline/scenario). Width 1000 → 5000 raised score 5.021q/hr → 5.094q/hr — real
improvement, so branches genuinely were being lost. But `chosenRank` in the exported trace showed the
*same* signature at both widths: the eventual winning branch sat at earnings-rank 900-999 of 1000, then
4200-4900 of 5000 — the same *relative* position (85-98th percentile from the bottom) at two different
widths, for the entire back half of a 100+ generation search. That rules out "just needs a wider beam"
as a real fix: widening didn't improve the branch's *rank*, it just gave a bad rank more room to
survive in. Diffing final research levels against the user's manual run pinned the actual score gap
down further — nearly every research was tied or ahead; the only real shortfall was `matter_reconfig`
(-33 levels at width 1000, -19 at width 5000) and `hyper_portalling` (-2/-1) — both explained by
`phaseTransitionTime` still landing very late (2-4 hours of Phase 3 runway vs. the user's full day),
which is itself a symptom of the same bias: a branch that would transition earlier necessarily earns
less near-term than one that doesn't, so it ranks worse under `rankByEarnings` and is exactly the kind
of branch a pure earnings trim is biased against keeping alive long enough to prove itself.

**The fix — `selectBeamSurvivors` (search.ts, exported):** the main beam trim (step 4 of
`runSearchLoop`, `rankByEarnings(survivors, ...).slice(0, beamWidth)`) is no longer a bare earnings
slice. It now guarantees a `ceil(beamWidth / 2)` earnings-ranked slice survives, then fills the rest of
`beamWidth` by **elr rank** — `RankedState.elr`, the current-loadout `min(layRate, shippingCapacity)`,
now computed alongside `earnings` on the exact same `computeSnapshot` call `rankByEarnings` already
made (free — no new `computeSnapshot` calls anywhere in this change, just one extra field read off an
object already being built, plus one extra `.sort()` over the same array).

This is a **different fix from §6's `selectPhase3Eligible`**, not the same one reused, and for a real
reason: `selectPhase3Eligible` only decides whether a *survivor* gets scored this generation — missing
out there just means "try again next generation," a soft, recoverable miss. This trim decides whether a
branch survives to have a next generation *at all* — missing out here is permanent. That's a more
consequential decision, so it gets a more targeted strategy (top-K-by-elr, using a signal now confirmed
cheap and honest) rather than `selectPhase3Eligible`'s blind stratified rotation. `selectPhase3Eligible`
itself was deliberately left untouched — it's confirmed working (§6's saturation result), so there's no
upside to risking a regression there for architectural symmetry; worth unifying later only if it
becomes the constraint again.

**An implementation subtlety worth knowing before touching this again:** the first version of this
function split the budget into two genuinely fixed-size slices (earnings half ∪ elr half) with a
separate "top up from earnings order if the union came up short from overlap" fallback path. That
fallback turned out to be **dead code** — since `byElr` is the same pool as `earningsRanked` just
reordered, and this function only ever runs when `earningsRanked.length > beamWidth`, the elr-fill loop
is *always* able to reach exactly `beamWidth` survivors on its own before exhausting the pool, however
much it overlaps with the earnings slice. Removed in favor of a single elr-fill loop that just keeps
walking past the overlap — simpler, and correctly means overlap between the two slices no longer
quietly shrinks how much real elr-based protection the trim provides (a fixed-size-second-half version
would have handed the leftover seats back to earnings instead, defeating the point).

**Trace/diagnostics kept in sync:** `RankedState.elr` and `BeamMemberSummary.elr` (types.ts) mean an
exported trace now shows *why* a low-earnings survivor is still in the beam, directly — no more
externally recomputing it by hand the way this whole investigation had to. `chosenRank`'s doc comment
(types.ts) was updated: a high number no longer implies "barely survived the earnings cut" the way it
used to, since a survivor's presence may now owe entirely to elr — check the sibling `elr` field on the
same member to tell which case you're looking at.

**Tests** (`search.spec.ts`, `describe('selectBeamSurvivors')`, 7 tests): no-op when input is already
at/under `beamWidth`, top earner survives via the earnings slice, a worst-by-earnings/best-by-elr
member survives via the elr fill, the elr fill correctly reaches past an earnings/elr overlap instead
of shrinking (the specific case that proved the dead-code fallback was in fact dead), output stays
earnings-sorted (so `chosenRank` stays meaningful), never returns more than the available pool, and a
monotonicity check (wider `beamWidth` only ever adds survivors, deterministic pseudo-random input, not
`Math.random()` — keeps the test reproducible). Unlike `selectPhase3Eligible`'s tests, no real engine
fixture or fixture-tuning was needed — `selectBeamSurvivors` takes plain `RankedState[]`, so
earnings/elr values are just made up per test case. Full suite green (72 tests), oracle unaffected
(confirmed by running it directly — it never calls this function, doesn't do beam-width trimming at
all by design) and still bit-for-bit exact.

**Not yet verified:** whether this closes the remaining gap on the user's own real scenario (only
unit-level correctness of `selectBeamSurvivors` itself has been confirmed so far) — worth re-running
the same width-1000/width-5000 comparisons now that this is live, and checking whether
`phaseTransitionTime` lands meaningfully earlier and the `matter_reconfig` shortfall closes further.

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
7. ~~`beamSearch.worker.ts` has never actually run as a real Worker.~~ **Resolved in the Phase C
   session** — see "Live verification" above. Run/error/Apply/Cancel/re-run-after-cancel were all
   exercised in a real browser against the real dev server. (The diagnostics tooling session reused
   the same technique for its own new UI — see "Diagnostics tooling"'s "Verified live" above.)
8. **Cancel-discards-partial-result is a policy choice, not a constraint** — still true, and the
   *mechanism* (terminate+respawn, not a graceful worker message — see "Live verification", Phase C
   session) hasn't changed since. If a future UX wants "keep the best-so-far result on cancel"
   instead, that's a `useBeamSearch.ts` change (skip the terminate, post a real cancel and wait for
   the worker's own `cancelled`/`result` message) that would first need the yield-per-generation
   follow-up (open question #2) to actually be reachable in time — terminate+respawn can't offer a
   partial result by its very nature.
9. **Realistic-fixture edge cases with `rawBackup: {}` weren't stress-tested** beyond the live runs
   described above (both the Phase C and diagnostics-tooling sessions deliberately used a genuinely
   bare "Start from Scratch" state, to keep the manual tests fast). A real player's populated
   `rawBackup` — with a large `virtueAfxDb` inventory — still hasn't been run through the live worker
   at all; Phase A's own test suite (`testFixtures.ts`'s `MAXED_RAW_BACKUP`) is the closest existing
   coverage for that shape, just not through the actual postMessage/worker path. Worth doing once a
   real backup is available to test with — and now doubly useful, since a real inventory's search
   would also be a much more interesting subject for the new diagnostics tooling than a bare-backup
   toy run.
10. **The "chosen ranked 17th of 20" finding** (see "Diagnostics tooling"'s "Verified live" above) is
    flagged, not investigated. First real thing to look at with the new tooling: pull a full trace
    from a realistic (non-bare) run and see whether low-ranked-but-winning steps are common, and
    whether they cluster around a particular cause (e.g. right after a tier unlock or phase
    transition, where the earnings snapshot might be temporarily misleading).
11. **Two of the four diagnostics options discussed with the user weren't built this session** — only
    the live generation-history panel and the winning-path trace export were. Still on the table if
    the two built this session don't turn out to be enough:
    - **Scenario export + a convergence-style test.** Export the exact live starting state/context to
      a file, drop it in as a new test fixture, run it at several beam widths (mirroring
      `convergence.spec.ts`). Answers "is beam width the bottleneck, or is it the ranking
      heuristic/macro throttling" — a different question than either tool built this session answers.
    - **A/B trace diffing.** Run the trace export twice (e.g. different beam widths, or a locally
      tweaked throttle constant) and diff the two — where do the winning paths first diverge. Most
      powerful of the four, but only worth building once there's a specific comparison in mind.
12. **Nothing from this session has been committed.** It's on the `beam-search-diagnostics` branch,
    not `main` — Phase A/B/C are already committed (see "Status" above). Recommend reviewing the diff
    and committing/opening a PR now; the tooling is complete and live-tested the same way Phase C was.

---

## Where to find the full reasoning

- `01-overview.md` – `05-design-decisions.md`: the original game-agnostic design (chatbot-authored).
- `06-egg-codebase-integration.md`: how that design maps onto this codebase, written before any code
  existed. Still accurate — nothing in Phase A contradicted it, only refined a few specifics (see
  "Key decisions" above, several of which update/resolve that doc's own open questions).
- This file: what's actually been built, what was learned by doing it, what's left.
- In-code doc comments throughout `src/beam-search/engine/*` and the four touched production files:
  the detailed "why," inline where the reasoning is most useful.

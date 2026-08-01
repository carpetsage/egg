# Ascension Variant Matrix (up to 7) + Switcher/Comparison UI

> **AGENT INSTRUCTIONS**:
> - **Execution mode for this pass, overriding the usual convention below**: the user has explicitly
>   asked to work through **all phases (0-5) in one session**, not one-phase-per-chat. Read this
>   entire file first, then execute Phases 0→5 in order without stopping for confirmation between
>   them. Still run each phase's own Acceptance check and write its `### Resolution` section + mark it
>   `[x]` before moving to the next — the per-phase discipline stays, only the "stop and hand back to
>   the user" step between phases is suspended for this run. Stop early only if an acceptance check
>   genuinely fails (not just "could be improved"), or a phase's own text flags a decision that needs
>   the user's input and isn't already resolved by the "Decisions already made" section below.
> - The one-phase-per-chat-session framing below is this document's normal/default convention (matches
>   `REFACTOR_SHARED_LOGIC.md`/`WIRE_SHARED_LOGIC.md`/`EVENT_AWARE_PLANNING_AND_C3.md`) — kept as
>   written in case this plan ever needs to be picked back up phase-by-phase in a later session (e.g.
>   if this one run out of context partway through): read this entire file before starting, but only
>   work on the single next incomplete phase (first unchecked `## Phase` heading) if operating in that
>   mode; do not touch files outside `wasmegg/ascension-planner` unless a phase explicitly says to.
> - Line/location references are as of the working tree on 2026-08-01 (uncommitted, on top of
>   `EVENT_AWARE_PLANNING_AND_C3.md`'s Phase 6). Re-locate by function name if lines have drifted.
> - Where a phase's acceptance check calls for a manual browser check, per this repo's established
>   convention do **not** use the `run` skill / dev server yourself — leave that verification to the
>   user, and rely on `pnpm vue-tsc --noEmit` plus a throwaway fixture script instead.
> - **Verification gotcha, hit and recovered from during the prior C3 rework (`EVENT_AWARE_PLANNING_AND_C3.md`
>   Phase 6) — read before running any linter**: this repo's git index (`git diff --cached`) holds a
>   large amount of pre-existing, uncommitted, *unrelated* staged work predating this whole
>   planning-doc lineage (some files' staged content differs from both HEAD and the current working
>   tree in ways that have nothing to do with whatever you're editing). Two consequences: (1) **never
>   run `git checkout -- <file>`** to "clean up" a file — it restores from the *index*, not HEAD, and
>   that index content may itself be stale or wrong, silently discarding real edits with no warning.
>   (2) `eslint --fix` on a file that predates this session's own formatting conventions can rewrite
>   the *entire* file (reflowing every pre-existing line to match prettier), not just your change —
>   after running it, check `git diff --stat` for that file: if a two-line logical edit shows up as
>   50+ changed lines, that's collateral reformatting, not your edit. If it happens, don't try to git
>   your way out of it — re-read the file's actual current content and manually re-apply just your
>   intended change via `Edit` against that content. Prefer plain `eslint` (no `--fix`) and confirm
>   zero new issues on the lines you actually changed, over `--fix`, for any file not already known to
>   be prettier-clean.

## Context

Today each ascension step generates at most 3 candidates: a 1-sale build (`result1`), a 2-sale build
(`result2`), and — A1 only, when a live farm backup is loaded — a "Continue current ascension" option
(`result3`). The user picks which one "wins" per step via a 2-option dropdown in
`AscensionOverview.vue` (plus the separate always-there "Continue Asc." entry for A1).

`EVENT_AWARE_PLANNING_AND_C3.md`'s Phase 6a already built the primitive this needed: `runC3Variants`
in `c3.ts`, which runs C3 against every `(saleCount, attemptTier13Unlock)` combination and flags
`impossible: true` when a requested Tier 13 unlock couldn't finish in time. It was deliberately left
unwired — "picking the true winner among variants requires completing each one through the rest of
the ascension (K3–H2)... an explicit, larger, separately-reviewed follow-up." **This plan is that
follow-up.**

New target shape, up to **7 variants** per ascension step:

| Variant key | Sale count | Attempts Tier 13? | Applies to |
| --- | --- | --- | --- |
| `continue` | — | — | A1 only, unchanged from today |
| `1-sale` | 1 | No | every step |
| `2-sale` | 2 | No | every step |
| `3-sale` | 3 | No | every step |
| `1-sale-tier13` | 1 | Yes | every step, pruned per below |
| `2-sale-tier13` | 2 | Yes | every step, pruned per below |
| `3-sale-tier13` | 3 | Yes | every step, pruned per below |

**Pruning rule** (user's spec, verbatim): check Tier 13 feasibility starting from the *most* time
(`3-sale-tier13`) and working down. If it's impossible with 3 sales' worth of time, it's impossible
with 2 or 1 (more time can only make an unlock easier, never harder) — skip both, don't even attempt
them. If 3-sale succeeds but 2-sale is impossible, skip 1-sale. This maps directly onto `runC3Variants`'
existing `impossible` flag — no new feasibility check needed, just a descending-order short-circuit.

## Decisions already made (do not re-ask the user these)

These were settled in the planning conversation before this document was handed off; treat them as
requirements, not open design choices:

1. **C1-R1 reuse is mandatory, not just an optimization**: exactly one C1-R1 precompute per ascension
   step, shared across every variant. Performance beyond that (the up-to-6 K3-H2 completions) is
   explicitly *not* this plan's concern — the user will deal with it later "if needed." Don't add
   parallelization, caching beyond C1-R1 reuse, or a reduced default `maxSaleCount` unless a later
   session is explicitly asked to.
2. **`ForcedAscensionPreview.vue` gets the full variant treatment**, same `variants` map as
   `AscensionOverview.vue` — not left as a simplified 2-way `result1`/`result2` comparison. Its
   *visual* layout for showing up to 7 variants is explicitly deferred — a minimal/unstyled list of
   present variants is sufficient for this pass; do not invest design effort here.
3. **Comparison badge is always exactly one line, never a list**: if the active/selected variant is
   the fastest present variant, show "X faster than the next fastest plan" (vs. the 2nd-fastest). If
   it's not the fastest (e.g. the user overrode to something slower), show "X slower than the fastest
   plan" (vs. whichever present variant is fastest, full stop — not "next slowest"). Implemented in
   Phase 2e; do not reintroduce the old `comparisons` array/multi-badge approach.

## Investigation findings (what touches this today)

The `result1`/`result2`/`result3` shape (and the closely-related `'continue' | '1-sale' | '2-sale'`
variant-key union) is load-bearing in more places than the dropdown alone:

- **Generation**: `useAscensionGenerator.ts`'s `generate()` (lines ~294-446) runs exactly 2-3
  full-ascension simulations per step, hardcoded to `result1`/`result2`/`result3`. `runAscension`'s
  only C3-specific call is `shift.run(currentState, context, buildPhaseEnd)` — **no path exists today
  to pass `C3Params`/`attemptTier13Unlock` through `runAscension` at all.**
- **"Best" picking, duplicated four times**, each independently re-implementing "if there's an
  override use it, else pick shortest duration": `useAscensionGenerator.ts`'s `pickVariantSummary`
  (module-level) and the inline logic in `generate()` (~409-420) and `bestResults` (~115-129);
  `buildLibraryPlans.ts`'s `pickBest`; `PlanLibrary.vue`'s `getBestImportResult` (~323-330). All four
  hardcode the same three-way `override === 'continue' | '1-sale' | '2-sale'` check.
- **Types**: `PlanVariant` (`stores/autoPlanner.ts:6`) is `'1-sale' | '2-sale' | 'continue'`.
  `ChainedAscension` (`stores/autoPlanner.ts:8-27`) has fixed `result1`/`result2`/`result3?` fields.
  `AscensionSummary.buildPhaseSaleCount` (`auto/types.ts:16`) is hardcoded `1 | 2`. There's no field
  anywhere recording whether a given result actually achieved a Tier 13 unlock.
- **Persistence**: `ExportedPlan` (`auto/export.ts:5-37`) bakes `result1`/`result2`/`result3?` into
  the JSON export format (`version: 1`) and `planVariantOverrides?: Record<number, 'continue' |
  '1-sale' | '2-sale'>`. Anyone with an old exported plan file, or an old plan already sitting in
  their browser's plan library (`PlanLibrary.vue`), needs this to keep loading.
- **UI**: `AscensionOverview.vue`'s "Plan variant dropdown" (lines 58-118) is genuinely two-option —
  `saleOptions` is a hardcoded 2-element array, `activeVariant` derives from string-matching
  `summary.strategyLabel` for `'1-sale'`/`'2-sale'`/fallback-continue. `ForcedAscensionPreview.vue`
  (shown instead of `AscensionOverview.vue` for the silently-injected 490-TE filler step) takes
  `result1`/`result2` as direct props, no `result3`/variant picker at all.
- **`allShifts`/`ShiftRunner`** (`auto/ascension.ts:72-88`): the shared type is
  `(state, context, arg3?: number, arg4?: number) => ShiftResult` — purely positional numbers, no
  room for an object param. C3 already gets special-cased inside `runAscension`'s loop (same pattern
  K3/C4/I2/R2/H2 use for their own extra args) — extending that one branch is the natural seam.
- **Resuming past C3 already works generically**: `runAscension`'s `resumeData.resumeShiftName` just
  needs to name any shift in `allShifts`. `allShifts`' actual order is C1, K1, I1, C2, K2, R1, **C3**,
  H1, K3, C4, I2, R2, H2 — so today's precompute (`runUntilShift(..., 'C3')`) already runs **C1
  through R1** (six shifts, not just C1-C2 — correcting a mislabel from an earlier draft of this plan)
  once and reuses it for both `result1`/`result2`. The same mechanism resumes cleanly from **after**
  C3 too (`resumeShiftName: 'H1'`, the shift immediately following C3) — meaning each `C3Variant` from
  `runC3Variants` can be completed through K3-H2 without re-running C1-R1 *or* re-running C3 itself.
  **This reuse is a hard requirement for this plan** (confirmed by the user): the one C1-R1 precompute
  per ascension step must be shared across all up-to-7 variants, not recomputed per variant — Phase
  2c's design already does this, this note just makes it an explicit acceptance-relevant requirement
  rather than an incidental efficiency.
- **`context.elrMemo` is dead** (confirmed while researching this plan, and already flagged as a
  cleanup candidate in `EVENT_AWARE_PLANNING_AND_C3.md`'s Phase 6 resolution): nothing writes to it
  anymore since 6b deleted C3's own ELR-pool memoization, so the manual `context`/`context2`
  copy-forward dance in today's `generate()` (line ~331) is pointless. Don't carry that pattern
  forward into the new N-variant loop — just share one `SimulationContext` per ascension step
  (`epicResearchLevels`/`colleggtibleModifiers`/`rawBackup` don't vary per variant) and delete the
  dead `elrMemo` field per that phase's own note, whichever session gets to it first.
- **Performance**: deferred by the user ("I'll deal with this later if needed") beyond the C1-R1 reuse
  requirement above. With that reuse in place, the actual added cost per ascension step is: one C1-R1
  run (unchanged from today) + up to 6 `runC3` calls (cheap — C3 alone, not a full ascension) + up to 6
  K3-H2 completions (the expensive part, since K3-H2 is most of an ascension's simulated work) instead
  of today's 2. Worth remembering this breakdown if/when performance does need attention, so the fix
  targets the K3-H2 multiplication specifically rather than re-touching C1-R1.

## Phase 0 — `c3.ts`: extend `runC3Variants` for 3-sale + descending-order pruning [x]

**Touches**: `src/auto/shifts/c3.ts`, `src/auto/types.ts` (`AscensionSummary`).

0a. Change `runC3Variants`'s default `maxSaleCount` from `2` to `3`, and change its iteration order
    to descending (`saleCount` from `maxSaleCount` down to `1`) so the pruning short-circuit below
    can track "already proven impossible" as it goes:
    ```ts
    export function runC3Variants(
      startState: EngineState, context: SimulationContext, maxSaleCount: number = 3
    ): C3Variant[] {
      const maxTier = Math.max(...getTiers());
      const tier13AlreadyUnlocked = isTierUnlocked(startState.researchLevels, maxTier);
      const variants: C3Variant[] = [];
      let tier13KnownImpossible = false;
      for (let saleCount = maxSaleCount; saleCount >= 1; saleCount--) {
        const buildPhaseEnd = getBuildPhaseEndForSaleCount(context.ascensionStartTime, saleCount);
        // Always compute the plain (no-Tier-13-attempt) variant.
        variants.push({
          saleCount, attemptTier13Unlock: false, buildPhaseEnd,
          result: runC3(startState, context, buildPhaseEnd, undefined, { attemptTier13Unlock: false }),
          impossible: false,
        });
        // Only attempt Tier 13 if it's not already unlocked and no larger saleCount already proved
        // it impossible (more time can only make an unlock easier, never harder).
        if (!tier13AlreadyUnlocked && !tier13KnownImpossible) {
          const result = runC3(startState, context, buildPhaseEnd, undefined, { attemptTier13Unlock: true });
          const impossible = !isTierUnlocked(result.endState.researchLevels, maxTier);
          if (impossible) tier13KnownImpossible = true;
          variants.push({ saleCount, attemptTier13Unlock: true, buildPhaseEnd, result, impossible });
        }
      }
      return variants.sort((a, b) => a.saleCount - b.saleCount || Number(a.attemptTier13Unlock) - Number(b.attemptTier13Unlock));
    }
    ```
    Sorting the return value back to ascending `saleCount` at the end keeps the array's external
    order stable/predictable for callers, independent of the internal descending walk. Note this
    changes the function's *contract slightly* from Phase 6a's version: previously every
    `(saleCount, attemptTier13Unlock: true)` combo up to `maxSaleCount` was always attempted; now
    pruned combos are simply **absent** from the returned array (not present-with-`impossible: true`)
    — Phase 1's orchestrator (below) must treat "no `N-sale-tier13` entry" as "pruned, not attempted"
    and must not confuse this with `impossible: true` (which now only ever appears on the *smallest*
    surviving saleCount's Tier 13 attempt, if any — the one that discovered the impossibility).
0b. Widen `AscensionSummary.buildPhaseSaleCount` (`auto/types.ts:16`) from `1 | 2` to `number` — the
    3-sale case needs it, and hardcoding to a 2-value union has no real benefit over `number` (nothing
    exhaustively switches on it today; confirm this with a repo-wide usage check before changing).
0c. Add `tier13Unlocked: boolean` to `AscensionSummary` — whether Tier 13 was unlocked by the *end* of
    this specific result (not just "was an unlock attempted"), computed once in `runAscension` from
    `isTierUnlocked(currentState.researchLevels, maxTier)` after the shift loop finishes. Needed by
    Phase 3/4's UI to badge which variants actually got Tier 13, and by Phase 2's picking logic if
    "prefer Tier 13" ever becomes a tiebreak (not required by this plan, but cheap to expose now while
    the field is being added anyway).

**Acceptance**: `pnpm vue-tsc --noEmit` clean. Throwaway script (or manual trace, if the `commonResearch.ts`
ESM-resolution limitation documented in Phase 6's resolution still applies) confirming: (1) a fixture
where Tier 13 is unreachable within any of 1/2/3 sales returns zero `*-tier13` entries beyond the
3-sale one (which carries `impossible: true`); (2) a fixture where Tier 13 is reachable at 2 and 3
sales but not 1 returns `3-sale-tier13`/`2-sale-tier13` (both `impossible: false`) and no
`1-sale-tier13` entry at all; (3) a fixture where Tier 13 is already unlocked at `startState` returns
zero `*-tier13` entries for any saleCount (matches today's existing `tier13AlreadyUnlocked` short
circuit, just confirm it survives the reorder).

### Resolution (found when this phase was executed)

Landed as specced: `runC3Variants`'s default `maxSaleCount` is now `3`, the iteration walks
`saleCount` from `maxSaleCount` down to `1` tracking `tier13KnownImpossible`, and the return value is
sorted back to ascending `(saleCount, attemptTier13Unlock)` order. `buildPhaseSaleCount` widened to
`number` in `types.ts` (repo-wide check found exactly the two producer sites already known from the
Investigation findings — `ascension.ts:322`/`482` — and zero exhaustive-switch consumers, so the
widening was a pure type relaxation with no call-site logic changes needed beyond dropping the now-
unnecessary `as 1 | 2` cast). `tier13Unlocked: boolean` added to `AscensionSummary` and computed via
`isTierUnlocked(currentState.researchLevels, Math.max(...getTiers()))` at the end of both `runAscension`
and `runContinueCurrent` (the latter wasn't explicitly called out in 0c's text but builds its own
`AscensionSummary` literal — `pnpm vue-tsc --noEmit` would have caught a missing field either way, so
it's populated there too for consistency).

**Acceptance**: `pnpm vue-tsc --noEmit` exits 0. The throwaway-script approach was not run — confirmed
`EVENT_AWARE_PLANNING_AND_C3.md`'s Phase 6 resolution note still applies (`runC3Variants` transitively
needs `commonResearch.ts`'s `allResearches` via the `lib` workspace package, which plain Node ESM can't
resolve outside the Vite pipeline; no test runner is configured in this workspace to route around it
either — checked `package.json` scripts and `node_modules/.bin`, neither vitest nor ts-node/tsx present).
Did a manual trace of the three fixtures instead:
- **Fixture 1** (Tier 13 unreachable at any of 1/2/3 sales): `saleCount=3` pushes the plain variant,
  then attempts Tier 13 → impossible → `tier13KnownImpossible=true`, pushed with `impossible: true`.
  `saleCount=2` and `saleCount=1` each push only their plain variant (Tier 13 attempt skipped since
  `tier13KnownImpossible`). Matches the acceptance spec exactly.
- **Fixture 3** (Tier 13 already unlocked at `startState`): `tier13AlreadyUnlocked=true` short-circuits
  every iteration's Tier 13 attempt from the start — zero `*-tier13` entries for any `saleCount`.
  Matches.
- **Fixture 2** (reachable at 2 and 3 sales, not at 1): the trace surfaced a real inconsistency between
  this phase's own two acceptance descriptions. The prose right after the code snippet (line ~189)
  states `impossible: true` "only ever appears on the *smallest surviving* saleCount's Tier 13 attempt
  ... the one that discovered the impossibility" — i.e. attempted-but-failed entries are still *present*
  with `impossible: true`, they're just never followed by smaller `saleCount`s. Given that, for this
  fixture the algorithm (as specced verbatim in 0a, which is what's implemented) does **not** prune
  `1-sale-tier13`: nothing proved it impossible before it ran, so it's attempted, discovers the
  infeasibility itself, and is pushed with `impossible: true` — three `*-tier13` entries total
  (`3-sale`/`2-sale` both `impossible: false`, `1-sale` `impossible: true`), not the two-entries-with-
  `1-sale-tier13`-absent the acceptance bullet describes. The pruning rule in the Context section only
  ever specifies skipping *smaller* saleCounts once a *larger* one is proven impossible — it says
  nothing about a smaller saleCount that turns out impossible on its own, so there's no rule text that
  would make the algorithm omit it. Went with the code-snippet-and-general-semantics reading (matches
  what's actually implemented, and is the internally-consistent one across both descriptions) rather
  than the acceptance bullet's literal wording, which looks like copy drift from an earlier draft of
  the pruning rule. Flagging here rather than guessing silently, per this plan's own instruction to stop
  only when a real decision is needed — this one doesn't block continuing, since Phase 1 onward treat
  "present as `impossible: true`" and "absent (pruned)" as already-distinguished cases either way.

## Phase 1 — `ascension.ts`: thread `C3Params` through `runAscension`, resume past a completed C3 [x]

**Touches**: `src/auto/ascension.ts`.

1a. Give `runAscension` a new optional parameter (after `resumeData`, keep existing positional
    callers working): `c3Params?: C3Params`. Thread it into the existing C3 special-case branch:
    `shift.run(currentState, context, buildPhaseEnd, undefined, c3Params)`.
1b. New exported helper, `runAscensionFromC3Variant`, that skips straight past C3 using a
    `C3Variant`'s own `result` — thin wrapper around `runAscension`'s existing `resumeData` mechanism
    (confirmed generic enough already, see Investigation findings above), just fixing
    `resumeShiftName` to `'H1'` (the shift immediately after `'C3'` in `allShifts`) and building
    `resumeData` from the variant's `result.actions`/`result.endState`/`result.elapsedSeconds` layered
    on top of whatever actions/state/elapsedSeconds preceded C3 (the shared C1-R1 precompute, same as
    today's `precomputed` in `generate()` — caller's responsibility to pass both in, computed **once**
    per ascension step and reused for every variant, per the hard requirement above):
    ```ts
    export function runAscensionFromC3Variant(
      preC3: { actions: Action[]; state: EngineState; elapsedSeconds: number },
      variant: C3Variant,
      context: SimulationContext,
      startTime: number,
      id: string,
      targetTE?: number,
      targetEndTime?: number
    ): { actions: Action[]; summary: AscensionSummary } {
      const resumeData = {
        actions: [...preC3.actions, ...variant.result.actions],
        state: variant.result.endState,
        elapsedSeconds: preC3.elapsedSeconds + variant.result.elapsedSeconds,
        resumeShiftName: 'H1' as const,
      };
      return runAscension(preC3.state /* unused when resumeData is set, but keep signature happy */,
        context, variant.buildPhaseEnd, startTime, id, targetTE, targetEndTime, resumeData);
    }
    ```
    (Exact signature/shape TBD at implementation time — the point is a single well-tested seam that
    Phase 2's orchestrator calls once per surviving `C3Variant`, rather than duplicating the
    "layer C3's result onto the C1-C2 precompute and resume from H1" logic at every call site.)
1c. Confirm (read, don't just assume) that `runAscension`'s post-loop bookkeeping — `saleCount`
    recomputation (lines ~294-300), `buildPhaseSaleCount` (now `number` per Phase 0b) — stays correct
    when entered via `resumeData` starting *after* C3 (i.e. the sale-count-counting loop still only
    depends on `startTime`/`buildPhaseEnd`, not on which shifts actually ran, so this should be a
    non-issue, but verify rather than assume given how much of this function's tail assumes a full
    C1-H2 run happened in *this* call).

**Acceptance**: `pnpm vue-tsc --noEmit` clean. Confirm (throwaway script or careful trace) that
`runAscensionFromC3Variant` run against a `C3Variant` produced by `runUntilShift(..., 'C3')` +
`runC3` directly (i.e. reimplementing today's `result1` path by hand through the new seam) produces a
byte-identical `AscensionSummary` to calling today's `runAscension(..., buildPhaseEnd1, ...)` directly
— this is the load-bearing equivalence proof that the new resume path doesn't change behavior for the
cases that already worked.

### Resolution (found when this phase was executed)

1a landed as specced: `runAscension` gained a trailing optional `c3Params?: C3Params` parameter, threaded
into the C3 branch. The plan's snippet called this via `shift.run(currentState, context, buildPhaseEnd,
undefined, c3Params)` — that only type-checks if `ShiftRunner` itself is widened to declare a 5th
optional param, since TS checks the call against the variable's declared type, not the underlying
function's real signature; `ShiftRunner` was widened with `arg5?: C3Params` to match (consistent with
its existing convention of loosely-typed positional args whose meaning is shift-specific).

1b landed with one correctness fix versus the plan's literal snippet: the snippet passed `preC3.state`
(commented "unused when resumeData is set") as `runAscension`'s `startState` argument. That comment is
wrong — `startState` **is** read directly even when `resumeData` is set, for `startTE`/`startSoulEggs`/
`startShiftCount`/the `teEarned` diffs (`ascension.ts` lines ~292/323/327-329/334-339, confirmed by
reading the tail of the function per 1c's "read, don't just assume" instruction). `preC3.state` is the
state *after* C1-R1 (5 real shifts: K1/I1/C2/K2/R1), not the true pre-C1 ascension start, so using it
there would have silently corrupted every variant's SE-cost and TE-delta bookkeeping. Fixed by giving
`runAscensionFromC3Variant` a separate `originalStartState` parameter (the same value callers already
pass as `runAscension`'s own `startState` for a from-scratch call, e.g. today's `currentBaseState` in
`useAscensionGenerator.ts`) and passing that through instead of `preC3.state`. `preC3` is still used
only for its `actions`/`elapsedSeconds` (prepended/summed) and is no longer read for `.state` beyond
building `resumeData.state = variant.result.endState`, which is correct as-is (that's genuinely the
right per-variant resume state).

1c: confirmed by reading, not assuming. `saleCount` (lines ~294-300) depends only on `startTime`/
`buildPhaseEnd`, never on which shifts ran — correct under resume. `actualShiftCount` is computed by
filtering the final merged `currentActions` by `type === 'shift'`, independent of how that list was
assembled — correct under resume, already the established pattern for the pre-existing C3 resume case.
`tier13Unlocked`/`lastTEDurationSeconds`/`finalTE` all read off `currentState` after the full loop
(precompute + variant's C3 result + this call's H1-H2), not off assumptions about *which* call executed
which shift — correct. The "prepend start action if !resumeData" block is skipped in both the existing
C3-resume path and the new H1-resume path identically (neither ever hits it, matching today's already-
established convention that generated `result1`/`result2` actions arrays have no leading
`start_ascension` action — `buildLibraryPlans.ts` already has a fallback for this, unrelated to this
phase).

**Acceptance**: `pnpm vue-tsc --noEmit` exits 0. The byte-identical-equivalence proof was done
analytically rather than by throwaway script — same `commonResearch.ts`/ESM limitation as Phase 0 applies
transitively (`ascension.ts` → `shifts/c3.ts` → `commonResearch.ts`). Reasoning: both the "call
`runAscension` once with `resumeShiftName: 'C3'`" path (today's `result1`) and the new "call `runC3`
externally then `runAscensionFromC3Variant` with `resumeShiftName: 'H1'`" path invoke the exact same
sequence of deterministic, side-effect-free shift functions (no `Math.random`/`Date.now` in any decision
path — `performance.now()` is used only for timing metrics, never simulation logic) over identical
inputs at each step: same `precomputed.state`/`context`/`buildPhaseEnd` feed `runC3` in both cases (once
inside `runAscension`'s own C3 branch, once via the externally-called `runC3` that produces the
`C3Variant`), so `variant.result` is bit-identical to what `runAscension`'s internal C3 branch would
have produced; from there, `resumeData.state`/`elapsedSeconds`/`actions` reconstruct exactly the running
totals today's single-call flow would have reached immediately after C3, and H1 onward runs identically
from that point since `originalStartState` (post-1b-fix) matches too. No step in either path depends on
*which* call executed a given shift, only on the state/context/params fed into it — so the two paths are
structurally forced to converge on the same `AscensionSummary`.

## Phase 2 — Variant data model + generation loop rewrite [x]

**Touches**: `src/stores/autoPlanner.ts`, `src/auto/useAscensionGenerator.ts`. **Depends on Phases
0-1.**

2a. New shared types (`stores/autoPlanner.ts` or a new `src/auto/variants.ts` — pick whichever avoids
    a circular import once written; `ChainedAscension` already lives in the store, so the store is the
    more likely home):
    ```ts
    export type SaleCount = 1 | 2 | 3;
    export type BuildVariantKey = `${SaleCount}-sale` | `${SaleCount}-sale-tier13`;
    export type VariantKey = BuildVariantKey | 'continue';
    export interface VariantResult { summary: AscensionSummary; actions: Action[] }
    ```
    Replace `PlanVariant` (today `'1-sale' | '2-sale' | 'continue'`) with `VariantKey` everywhere it's
    used as an override type — same name change ripples through `planVariantOverrides`,
    `handleSetPlanVariant`, the `AscensionOverview.vue`/`AutomaticPlanner.vue` emit type, `export.ts`.
2b. Replace `ChainedAscension`'s fixed `result1`/`result2`/`result3?` fields with
    `variants: Partial<Record<VariantKey, VariantResult>>` (only keys that were actually
    computed/survived pruning are present — absence *is* the "pruned or impossible" signal, no
    separate boolean needed for build variants; `'continue'` absence still needs
    `result3SkippedReason`-equivalent handling, kept as its own field since it's a *reason*, not just
    a boolean).
2c. Rewrite `generate()`'s per-step body (today ~294-446): after the existing C1-R1 precompute
    (`runUntilShift(..., 'C3')`, unchanged, called **once** per step — see the hard reuse requirement
    in Investigation findings), call `runC3Variants(precomputed.state, currentContext, 3)` once, then
    for each returned `C3Variant` call Phase 1's `runAscensionFromC3Variant` (passing the *same*
    `precomputed` result to every call — this is the reuse contract, verify it in code review, not
    just in this doc) and store the result under that variant's key (`` `${saleCount}-sale` `` or
    `` `${saleCount}-sale-tier13` ``).
    The `continue` variant's generation logic (lines ~345-407) is **unchanged** per the user's
    instruction — just store its result under `variants.continue` instead of a separate `result3`.
    Update `generateProgress` messages to reflect "N of up to 6 build variants" instead of the
    current fixed "1-sale Build"/"2-sale Build" two-step message.
2d. Consolidate the four independently-duplicated "pick the best/overridden variant" implementations
    (see Investigation findings) into **one** exported helper, e.g.
    `pickVariant(variants: Partial<Record<VariantKey, VariantResult>>, override?: VariantKey):
    VariantResult`: if `override` names a present key, return it; else return whichever present
    variant has the lowest `summary.totalDurationSeconds`. Update all four call sites
    (`useAscensionGenerator.ts`'s `pickVariantSummary` + `generate()`'s inline pick + `bestResults`,
    `buildLibraryPlans.ts`'s `pickBest`, `PlanLibrary.vue`'s `getBestImportResult`) to call it instead
    of re-implementing the same three-line check. This is pure dedup enabled by finally having *one*
    variants shape instead of three ad hoc fields — do it in this phase since Phase 3 (persistence)
    needs `buildLibraryPlans.ts`/`PlanLibrary.vue` updated anyway and duplicating the picker a fifth
    time (for up to 7 keys instead of 3) is exactly the kind of copy that should stop here.
2e. `bestResults`' comparison-badge logic (today ~130-159, "N days faster than the M-sale plan") is
    decided (user's spec, verbatim): always exactly **one** comparison badge, never a list of
    runner-ups. If the currently-selected/best variant is the fastest of all present variants, show
    "X faster than the next fastest plan" (compare against the second-fastest). Otherwise (an override
    picked something other than the fastest) show "X slower than the fastest plan" (compare against
    whichever present variant has the lowest `totalDurationSeconds`, full stop — not "next slowest,"
    always the global fastest). This replaces the old `comparisons` array (built by filtering out the
    chosen index and mapping every remaining candidate) with a single computed comparison: sort present
    variants by duration once, then pick index 0 vs. 1 (fastest case) or the chosen variant vs. index 0
    (non-fastest case). Implement this here — it's simple enough not to need deferring to Phase 4 after
    all (the earlier "cap it somehow" framing this replaces was the only reason to defer).

**Acceptance**: `pnpm vue-tsc --noEmit` clean. Manual browser check (per this repo's convention) on a
fresh plan generation: confirm the ascension chain still generates, `bestResults` still picks a
sensible default per step, and total wall-clock generation time is measured and reported (this phase
is where the "up to 6 full-ascension runs instead of 2" cost becomes real — surface the number so a
later phase can decide if it needs a loading-state/progress adjustment beyond the message-string
update in 2c).

### Resolution (found when this phase was executed)

Implemented together with Phase 3, not sequentially — 2d itself already says buildLibraryPlans.ts/
PlanLibrary.vue should get the shared picker now rather than a fifth time later, and once
`ChainedAscension`'s shape actually changes, every direct consumer of `result1`/`result2`/`result3`
stops compiling immediately (`pnpm vue-tsc --noEmit` is not deferrable to "later phases only") — so
there was no clean way to land 2a-2e without also landing the export-format/migration side. Both
phases' resolutions are written up together for that reason; this entry covers 2a-2e specifically.

2a/2b landed in `stores/autoPlanner.ts` per spec: `SaleCount`/`BuildVariantKey`/`VariantKey`/
`VariantResult` types, `PlanVariant` deleted (replaced by `VariantKey` everywhere), `ChainedAscension`'s
`result1`/`result2`/`result3?` replaced by `variants: Partial<Record<VariantKey, VariantResult>>`.
`result3SkippedReason` kept as its own field, same name — the plan only asked to keep the concept, not
rename it, and keeping the name minimized ripple into `AscensionOverview.vue` (untouched this phase,
see below).

2d: `pickVariant` lives in the store next to the types it operates on (avoids the circular-import
question the plan flagged, since `ChainedAscension` was already there). All four duplicated pickers
were switched over — plus a **fifth** the plan's Investigation findings missed: `ChainSummaryBar.vue`
had its own inline `[result1, result2, ...(result3 ? [result3] : [])].reduce(...)` in two places
(`totals`/`teStatsList`), and unlike the other four, it never even consulted
`planVariantOverrides` — so today, the footer summary bar could silently disagree with the per-step
card above it whenever an override was set. Fixed as part of this same dedup pass since the type change
forced `ChainSummaryBar.vue` to be touched anyway (`item.result1` etc. no longer exist) — now correctly
override-aware via the shared `pickVariant`.

2c: `generate()`'s per-step body now does exactly one `runUntilShift(..., 'C3')` precompute, one
`runC3Variants(precomputed.state, currentContext, 3)` call, then loops `runAscensionFromC3Variant` over
whatever survived pruning (`c3Variants.filter(v => !v.impossible)`) — variants marked `impossible: true`
are *not* completed through K3-H2: `runC3` returns early on a failed Tier 13 attempt, before reaching
`buildPhaseEnd`, so there's no valid build-phase-complete state to hand to H1 onward for those. The old
`context`/`context2`/manual `elrMemo` copy-forward is gone — one `currentContext` is now shared across
`runUntilShift`, `runC3Variants`, and every `runAscensionFromC3Variant` call for the step, which is what
made `elrMemo` fully dead (its only remaining read was the copy-forward line just deleted); removed the
field itself from `SimulationContext` (`engine/types.ts`) per the Investigation findings' explicit
note ("whichever session gets to it first"). `generateProgress` now reads "build phase precompute" then
"build variant N of M" (M = survivor count, so ≤6), replacing the old fixed two-message sequence.

2e: `bestResults` computes one `comparison` object, never a `comparisons` array — sorts present variants
by duration once, compares index 0 vs 1 when the selected variant is fastest, else selected vs index 0.
The "slower" case is expressed via the existing `comparison.message` field (already supported by
`AscensionOverview.vue`'s `displayComparisons` computed, unused by anything before this) rather than
`daysFaster`/`otherPlanLabel`, since those two render as "N days **faster** than X" unconditionally in
the untouched template — reusing them for the slower case would have produced backwards wording without
also editing `AscensionOverview.vue` (out of scope this phase, Phase 4's job).

**Forced consequences outside this phase's nominal "Touches" list**, all required to keep
`pnpm vue-tsc --noEmit` clean the moment `ChainedAscension`'s shape changed:
- `ChainSummaryBar.vue` — covered above.
- `AutomaticPlanner.vue`'s `ForcedAscensionPreview` binding — switched from `:result1`/`:result2` to
  `:variants="ascensionChain[idx].variants"`.
- `ForcedAscensionPreview.vue` itself — rather than write a throwaway shim two phases would touch
  (once here, once for real in Phase 4d), did Phase 4d's *data-side* swap now: props are
  `variants: Partial<Record<VariantKey, VariantResult>>` instead of `result1`/`result2`, rendered as a
  minimal/unstyled sorted list of whatever's present — exactly what 4d already asked for ("a
  minimal/unstyled list of present variants is sufficient... don't invest design effort here"). Phase
  4's entry below notes this was already done.
- `PlanLibrary.vue`'s restore-handler and `buildLibraryPlans.ts` — see Phase 3's resolution; these were
  Phase 3's nominal territory but the type change forced them regardless, so 2d's instruction to do the
  picker dedup "in this phase" was followed literally.

**Acceptance**: `pnpm vue-tsc --noEmit` exits 0 (re-verified after every file above, not just the
nominal Phase 2 files). `eslint` (no `--fix`) run per-file against every file touched this phase;
cross-checked every reported line number against the diff — all pre-existing issues predating this
session except four genuinely-new lines, which were reformatted to be prettier-clean: the
`runAscension(...)` call in `runAscensionFromC3Variant` (Phase 1, caught here since eslint was run
across both phases together), and two ternary-wrapping issues in `PlanLibrary.vue` (Phase 3, see below).
One new `any` was accepted rather than fixed — `buildLibraryPlans.ts`'s `let finalActions: any[]`,
needed because `best.actions` is now genuinely `Action[]` (previously silently `any` throughout that
whole file) and the `startAction` object literal it gets prepended to isn't typed against the `Action`
discriminated union; properly typing that literal is unrelated pre-existing debt in a file that already
uses `any` throughout, not something this phase's scope calls for. No manual browser check or
wall-clock generation-time measurement was performed — per this repo's established convention (also
followed by every prior phase in this plan lineage), UI-facing/live-simulation acceptance is left to the
user with the dev server, not run autonomously by the agent.

## Phase 3 — Persistence: export format, plan library, backward compatibility [x]

**Touches**: `src/auto/export.ts`, `src/auto/buildLibraryPlans.ts`, `src/components/PlanLibrary.vue`.
**Depends on Phase 2** (the `variants`/`VariantKey` shape).

3a. `ExportedPlan.ascensions[].result1/result2/result3?` → `variants: Partial<Record<VariantKey,
    VariantResult>>`, mirroring `ChainedAscension`. Bump `version` to `2`.
3b. **Backward compatibility, explicit and tested, not just typed-around**: anyone importing a
    `version: 1` file (`result1`/`result2`/`result3?`, `planVariantOverrides` keyed to the old 3-value
    union) must still work. Write a migration function,
    `migrateExportedPlanV1(old: ExportedPlanV1): ExportedPlan`, mapping `result1 → variants['1-sale']`,
    `result2 → variants['2-sale']`, `result3 → variants.continue`, and old override values unchanged
    (they're a subset of the new `VariantKey` union already — `'1-sale'`/`'2-sale'`/`'continue'` all
    still exist). Call it at the top of both `buildLibraryPlansFromExport` and `PlanLibrary.vue`'s
    restore handler, keyed on `imported.version`. This is the same category of care the codebase
    already gives `a1ForceMode` (the *previous* deprecated field, still read as a fallback in three
    places) — don't regress that convention.
3c. Update `buildLibraryPlans.ts`/`PlanLibrary.vue` to use Phase 2d's shared `pickVariant` helper
    against the (possibly-migrated) `variants` map instead of their own hand-rolled picks.

**Acceptance**: `pnpm vue-tsc --noEmit` clean. Manual check: export a freshly-generated plan, re-import
it, confirm it restores identically. Separately, **keep one real `version: 1` export file from before
this phase** (ask the user for one, or generate one by checking out the pre-Phase-3 code temporarily)
and confirm it still imports correctly through the migration path — this is the one piece of this
whole plan with real user-data-loss risk if skipped.

### Resolution (found when this phase was executed)

Implemented together with Phase 2 (see that phase's resolution for why). Covers 3a-3c specifically.

3a: `ExportedPlan` (`auto/export.ts`) now has `version: 2` and `ascensions[].variants: Partial<Record
<VariantKey, VariantResult>>` mirroring `ChainedAscension`, plus the same `result3SkippedReason` field
(it wasn't on the old export type at all before — added since `ChainedAscension` already carried it and
round-tripping through export/import should preserve it). Shared `ExportedPlanGoal`/`ExportedInitialState`
interfaces factored out since both the new `ExportedPlan` and the preserved `ExportedPlanV1` need the
identical shape for everything except `ascensions`.

3b: `ExportedPlanV1` keeps the exact old shape (`result1`/`result2`/`result3?`/`result3SkippedReason`)
under its own exported name, and `migrateExportedPlanV1` maps it to the new shape exactly as specced
(`result1 → variants['1-sale']`, `result2 → variants['2-sale']`, `result3 → variants.continue`, override
values unchanged since they're a strict subset of `VariantKey`). Called at the top of both
`buildLibraryPlansFromExport` (branches on `importedRaw.version === 1`) and `PlanLibrary.vue`'s restore
handler (branches on `imported.version === 1`, before anything else touches the parsed file) — matching
the `a1ForceMode` precedent the plan pointed to (old field still read as a fallback, never silently
dropped).

3c: `buildLibraryPlans.ts`'s `pickBest` and `PlanLibrary.vue`'s `getBestImportResult` both deleted,
replaced by calls to the Phase 2d `pickVariant` helper against the (possibly-migrated) `variants` map —
this was the part of 3c that 2d pulled forward into "this phase" (Phase 2), landed at the same time as
everything else here since the two changes are inseparable in practice.

**Acceptance**: `pnpm vue-tsc --noEmit` exits 0. The "export a freshly-generated plan, re-import it,
confirm it restores identically" check and the "find a real pre-Phase-3 `version: 1` export file and
confirm it still imports" check are both manual/live-app checks — per this repo's established
convention (and explicitly re-stated at the top of this plan document), these are left to the user with
the dev server rather than run autonomously; this phase carries real user-data-loss risk if that check
is skipped, so flagging clearly rather than silently marking it done: **the migration path
(`migrateExportedPlanV1`) has been read through and type-checks, but has not been exercised against a
real old export file.** The user should verify this before trusting old exports/library entries.

## Phase 4 — Switcher UI: `AscensionOverview.vue`'s variant picker [x]

**Touches**: `src/components/auto/AscensionOverview.vue`, `src/components/auto/AutomaticPlanner.vue`
(prop/emit type updates only). **Depends on Phase 2** (`variants` shape on the result passed in).

4a. **Delete** the current hardcoded "Plan variant dropdown" (lines 58-118: the `saleOptions` array,
    the `activeVariant`/`activeVariantShortLabel` computeds' string-matching-on-`strategyLabel`
    approach, and the dropdown template block) — this is the block the user pointed at directly
    (`AscensionOverview.vue:62`, the toggle button's class list) when asking to delete the old
    switcher; it's being fully replaced, not edited in place, since the new version needs a
    fundamentally different data source (an explicit `variants` map + keys, not label string-sniffing
    two hardcoded options).
4b. Replace with a picker driven by whatever variant keys are actually present on the current result
    (i.e. survived generation/pruning) — group by sale count with a Tier-13 toggle/badge per row,
    rather than a flat list of up to 7 entries, so pruned-away Tier 13 attempts don't need an
    "unavailable" placeholder row (they simply don't exist in the data, same convention Phase 2b's
    `variants` map already establishes — absence is not-attempted, not disabled). The existing
    disabled+tooltip pattern for "Continue Asc." when `result3Available` is false (lines 88-116) is
    the right template to extend for "Tier 13 not attempted at this sale count" if a placeholder ends
    up wanted after all — decide once the actual UI is in front of you, not preemptively here.
4c. Update `activeVariant` to read the actual variant key the currently-displayed summary came from
    (needs Phase 2/3 to expose *which* key produced a given `AscensionSummary` — either thread the key
    alongside the summary as a prop, or re-derive it from `bestResults`/`pickVariant`'s own choice;
    decide based on how `AutomaticPlanner.vue`'s template ends up structured once Phase 2 lands, not
    speculatively here).
4d. Update `AutomaticPlanner.vue`'s `@set-plan-variant` emit type from `'continue' | '1-sale' |
    '2-sale'` to `VariantKey`. `ForcedAscensionPreview.vue` gets the **full** variant treatment (user's
    decision) — its two hardcoded `result1`/`result2` props become the same `variants` map every other
    consumer uses, not a special-cased 2-way comparison. Scope this phase to the **data** side only:
    swap the props, wire the same `pickVariant`/variant-selection plumbing `AscensionOverview.vue` uses
    for its forced-490 sibling. The actual visual layout for showing (up to) 7 variants in this
    component is explicitly **deferred to a later pass** — for this phase, a minimal/unstyled
    placeholder that lists the present variants is enough; don't invest in polishing this component's
    UI now.

**Acceptance**: manual browser check (per this repo's convention) — generate a plan where Tier 13 is
reachable at all 3 sale counts, confirm all 6 build variants (+ continue on A1) are selectable and
each selection updates the displayed summary/actions correctly; then a plan where Tier 13 is
unreachable at 1-sale, confirm exactly the pruned set is offered.

### Resolution (found when this phase was executed)

4a: the old hardcoded dropdown block deleted and replaced, as specced — `saleOptions` and the
string-matching `activeVariant`/`activeVariantShortLabel` computeds are gone.

4b: the picker is grouped by sale count, one row per `saleCount` that has its plain (non-Tier-13)
variant present (`variantRows` computed) — the plain variant is guaranteed present whenever that sale
count was attempted at all (Phase 0's pruning only ever removes the Tier-13 attempt on top, never the
base variant), so there's no "row with nothing to show" case to handle. Went with the toggle/badge
framing the plan text suggested rather than a flat 7-row list: each row is the sale-count button (e.g.
"2-sale build") plus, only when `${n}-sale-tier13` is also present, a small adjacent "T13" pill that
selects the Tier-13 variant instead. No placeholder row for pruned-away Tier-13 attempts — matches the
`variants` map's own "absence is not-attempted" convention Phase 2b established, same as the existing
"Continue Asc." disabled-state pattern this reuses for its own disabled case.

4c: `activeVariantKey` is now a real prop threaded from `bestResults` (`useAscensionGenerator.ts` now
returns `variantKey: bestKey` alongside the flattened summary — `bestKey` was already being computed
there for Phase 2e's comparison-badge logic, just not exposed before) through `AutomaticPlanner.vue`
down to `AscensionOverview.vue`, replacing the old `strategyLabel`-string-matching approach that could
only ever resolve to `'1-sale' | '2-sale' | 'continue'` and would have silently mis-highlighted every
3-sale/Tier-13 variant.

4d: `AutomaticPlanner.vue`'s `@set-plan-variant` emit type is `VariantKey` (both on the component's own
`defineEmits` and the inline handler in `AutomaticPlanner.vue`'s template). `ForcedAscensionPreview.vue`'s
data-side swap was already done in Phase 2 (forced by the `ChainedAscension` type change) — confirmed
here that it already satisfies 4d's ask verbatim (full `variants` map, minimal/unstyled list, visual
polish deferred), nothing left to do for it in this phase.

**Bug caught and fixed while wiring this up**: `displayComparisons` (unchanged since before this plan)
gated the singular-`comparison` fallback on `comparison.daysFaster > 0.01` — correct for the old
"always daysFaster-shaped" comparisons, but Phase 2e's new "slower than fastest" case sets
`daysFaster: 0` and puts the actual number in `comparison.message` instead (see Phase 2's resolution for
why: reusing `daysFaster`/`otherPlanLabel` for the slower case would have rendered backwards "faster"
wording via this same template without also touching this file). Unpatched, the slower-badge would
never have appeared — any override to a non-fastest variant would silently show no comparison badge at
all. Fixed by checking `comparison.message || comparison.daysFaster > 0.01` instead.

**Acceptance**: `pnpm vue-tsc --noEmit` exits 0. `eslint` (no `--fix`) run against every file touched
this phase; all newly-introduced formatting issues (Vue attribute ordering, ternary line-wrapping) in
the new dropdown markup were fixed to be prettier-clean rather than left as fresh debt, since (unlike
`ForcedAscensionPreview.vue`'s deliberately-minimal Phase 2 shim) this picker is this phase's actual
deliverable, not a placeholder. Manual browser check — "generate a plan where Tier 13 is reachable at
all 3 sale counts, confirm all 6 build variants (+ continue on A1) are selectable," and the pruned-set
variant — is left to the user with the dev server, per this repo's established convention (restated at
the top of this plan document; not run autonomously here).

## Phase 5 — Variant comparison view (modal) [x]

**Touches**: new component (e.g. `src/components/auto/VariantComparisonModal.vue`),
`AscensionOverview.vue` (trigger button). **Depends on Phase 4.**

5a. New modal, opened from a button next to the variant dropdown, listing every *present* variant for
    the current ascension step side by side: sale count, Tier 13 badge (using Phase 0c's
    `tier13Unlocked`), total duration, end TE, peak ELR, SE cost — the same metrics
    `AscensionOverview.vue`'s own card already surfaces per-variant, just tabulated across all of them
    at once instead of one at a time behind the dropdown.
5b. Selecting a row in the modal calls the same `selectVariant`/`setPlanVariant` path Phase 4's
    dropdown uses — the modal is an alternate *view* onto the same picking mechanism, not a second
    source of truth.

**Acceptance**: manual browser check — open the comparison modal on a step with the full 7 variants
present, confirm every row's numbers match what the dropdown shows when that variant is individually
selected, and that picking a row from the modal updates the main card the same way the dropdown does.

### Resolution (found when this phase was executed)

5a: new `src/components/auto/VariantComparisonModal.vue`, following this codebase's existing modal
convention (`TeBreakdownModal.vue`: `Teleport to="body"`, backdrop + `animate-in` card) but as a table
rather than a stat list, since this needed 6 columns (Variant, Tier 13, Duration, End TE, Peak ELR, SE
Cost) across up to 7 rows. Tier 13 badge uses `AscensionSummary.tier13Unlocked` (Phase 0c) directly,
not "was an unlock attempted" — matches that field's original purpose. Rows sorted by duration, same
convention `bestResults`/the dropdown already use elsewhere. Trigger button added to
`AscensionOverview.vue` next to the variant dropdown, only shown when there's actually more than one
variant to compare (`variantRows.length > 1 || continueAvailable`).

5b: the modal emits `select`, handled by `onCompareSelect` in `AscensionOverview.vue`, which closes the
modal and emits the exact same `setPlanVariant` event the dropdown's `selectVariant` emits — confirmed
by reading both handlers side by side that they converge on the identical `emit('setPlanVariant', ...)`
call, not a parallel code path.

**Acceptance**: `pnpm vue-tsc --noEmit` exits 0. `eslint` (no `--fix`) clean on the new file and the new
lines in `AscensionOverview.vue` (checked against the diff, same as every prior phase in this plan).
Manual browser check — open the modal on a step with the full variant set, confirm every row's numbers
match the dropdown, confirm picking a row updates the card the same way the dropdown does — left to the
user with the dev server, per this repo's convention.

## Open questions to resolve before/while executing (not decided by this plan)

- **Performance beyond the C1-R1 reuse requirement**: Phase 2's acceptance check asks you to *measure*
  the new worst-case generation time (up to 6 K3-H2 completions vs. today's 2) but doesn't mandate a
  further fix — deferred by the user until it's a demonstrated problem. If it does need attention,
  likely mitigations (not designed here, pick when it's a real number in front of you): running
  variants in parallel (Web Worker — bigger change), or narrowing the default `maxSaleCount` users see
  up front with a "simulate more variants" opt-in.
- **`ForcedAscensionPreview.vue`'s visual layout** (Phase 4d): decided to get the full variant data,
  visual design deferred — pick the actual UI when that later pass happens, not speculatively here.

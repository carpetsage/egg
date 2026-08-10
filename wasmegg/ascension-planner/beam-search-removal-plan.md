# Beam Search Removal Plan

Generated 2026-08-10. Covers every file touched between `7b73f8fb` (last commit before beam
search) and `fe2575e0` (HEAD), i.e. the full range `7b73f8fb..HEAD`, 55 files across 7 commits:

| Commit | Date | Subject | Beam-search-related? |
|---|---|---|---|
| `ee4a37ed` | 2026-08-07 | initial beam search work | Yes |
| `28f7c925` | 2026-08-07 | beam search phase 2 | Yes |
| `e09f447d` | 2026-08-07 | auto AP T13 unlocks force ML2 before T13 | **No** |
| `181ec396` | 2026-08-08 | add inline notes for smart purchases on research | **No** |
| `3ffdb16f` | 2026-08-08 | massive beam search upgrade | Yes |
| `86932039` | 2026-08-09 | pull player data if/when needed - store redacted player data with saved plans | **No** (mostly) |
| `fe2575e0` | 2026-08-10 | fix milestone view for long research, update C3, prep for some more beam search stuff | **Mixed** |

Three of the seven commits (`e09f447d`, `181ec396`, `86932039`) are unrelated features that just
happened to land during the same window. `fe2575e0` is genuinely three unrelated changes squashed
into one commit. This plan is organized by **file**, not by commit, since that's the unit we'll
actually be editing.

**Status: EXECUTED, 2026-08-10.** All 7 steps below are complete: 30 files deleted, 9 edited, net
-8,266 lines. Verified via `pnpm vue-tsc --noEmit` (clean), `pnpm test` (5/5 passing —
`researchROI.spec.ts`, the one unrelated spec left), `pnpm fastbuild` (clean production build), and a
headless-browser smoke test of the Research tabs (no "Beam Search" entry, the other six views intact,
zero console errors). This doc is kept as a record of the analysis/decisions, not a to-do list
anymore.

---

## 0. Cross-dependency to handle FIRST

**`src/lib/artifacts/utils.ts`** (a file we are keeping — see §2) imports `sanitizeLongsForWorker`
from **`src/workers/beamSearch.protocol.ts`** (a file we are deleting — see §1):

```ts
// src/lib/artifacts/utils.ts:8
import { sanitizeLongsForWorker } from '@/workers/beamSearch.protocol';
...
// line 194, inside redactBackupForStorage() — used by the general "save plan" flow,
// stores/actions/io.ts, nothing to do with beam search
const sanitizedDb = sanitizeLongsForWorker(db) as ei.ArtifactsDB.IVirtueDB;
```

`sanitizeLongsForWorker` itself is generic (deep-clones a value, converts protobufjs `Long` objects
to plain numbers, no beam-search types involved) — it just happens to live in a beam-search file
because it was written for `postMessage`-ing state to the beam search worker. `redactBackupForStorage`
reuses it for an unrelated reason (JSON-safe serialization when saving a plan to IndexedDB).

**Action:** before deleting `src/workers/`, move `sanitizeLongsForWorker` (and its two private
helpers `isLongLike`/`longLikeToNumber`) into `lib/artifacts/utils.ts` — its only non-beam-search
caller, confirmed by grep, so no new shared file is needed. (Every other caller —
`beamSearch.worker.ts`, `beamSearch.protocol.spec.ts`, `useBeamSearch.ts`,
`beam-search/engine/types.ts` — is being deleted anyway.)

Confirmed `src/workers/` holds nothing but the three `beamSearch.*` files, so the whole directory
goes, not just files within it.

---

## 1. Delete outright (new in this range, beam-search-only, nothing outside beam search imports them)

Confirmed via `git ls-tree 7b73f8fb` (didn't exist before) and a repo-wide grep for imports (nothing
outside this set references them, once §0 is done):

- `src/beam-search/` — entire directory:
  - `01-overview.md`, `02-algorithm-specification.md`, `03-performance-and-optimization.md`,
    `04-game-integration.md`, `05-design-decisions.md`, `06-egg-codebase-integration.md`,
    `HANDOFF.md`
  - `engine/candidates.ts` + `.spec.ts`
  - `engine/convergence.spec.ts`
  - `engine/dedupe.ts` + `.spec.ts`
  - `engine/index.ts` + `.spec.ts`
  - `engine/macros.ts`
  - `engine/oracle/beam-oracle.spec.ts`
  - `engine/reconstruct.ts` + `.spec.ts`
  - `engine/search.ts` + `.spec.ts`
  - `engine/testFixtures.ts`
  - `engine/types.ts`
- `src/components/actions/BeamSearchView.vue`
- `src/composables/useBeamSearch.ts`
- `src/workers/beamSearch.protocol.ts` (after §0's extraction) + `.spec.ts`
- `src/workers/beamSearch.worker.ts`

Once these are gone, also delete `src/workers/` itself if `beamSearch.*` was the only thing in it
(check — I haven't verified whether that directory holds anything else).

**Follow-on cleanup once these are deleted** (dangling references that will no longer compile):
- `package.json` scripts `test:oracle` and `test:convergence` point at deleted spec files — remove.
- `vitest.config.ts`'s comment references `src/beam-search/06-...md` — reword or remove; the 20s
  `testTimeout` was justified by beam search's own real-search tests, so reconsider whether it's
  still needed once those are gone (`researchROI.spec.ts` is fast; check `virtue.spec.ts` if kept,
  see §3).

---

## 2. Unrelated — no action

New or modified files that belong entirely to `e09f447d`, `181ec396`, or `86932039`, verified by
reading every hunk. Nothing here mentions or depends on beam search (aside from the one import in
§0, and stray comment mentions noted below that don't need code changes).

**`e09f447d` — auto AP T13 unlocks force ML2 before T13:**
- `src/auto/shifts/c3.ts` — both this commit's changes AND `fe2575e0`'s later changes to the same
  file are a continuation of this same ML2-before-T13 feature (the `fe2575e0` diff adds a
  rewind/retry fallback to the logic `e09f447d` introduced). Confirmed by reading both diffs in
  full — nothing beam-search-related touches this file despite `fe2575e0`'s commit message
  mentioning beam search prep. **Keep entirely, no changes.**

**`181ec396` — add inline notes for smart purchases on research:**
- `src/auto/shifts/helpers/milestones.ts` — adds `addNotification` helper + purchase-count/gems
  tracking to `runSmartBuyForSeconds`. Unrelated.
- `src/calculations/milestoneChain.ts` — adds `gemsSpent` field. Unrelated.
- `src/calculations/smartBuyPreview.ts` (this commit's portion only, see §4 for the other) — adds
  `price`/`totalSecondsToSave`/`totalGemsSpent` fields for note-building. Unrelated.
- `src/components/actions/QuickBuy.vue` — renders `SmartBuyStats`. Unrelated.
- `src/components/actions/ResearchActions.vue` (this commit's portion only, see §4) — inserts note
  actions ahead of Quick Buy / Sale-Aware / Sale-Ends / Milestone-Chain purchases. Unrelated.
- `src/components/actions/SmartBuyStats.vue` — **new file**, small stats display component.
  Unrelated.
- `src/components/actions/SmartBuyView.vue` — wires `SmartBuyStats` into the three smart-buy cards.
  Unrelated.
- `src/composables/useResearchViews.ts` (this commit's portion only, see §4) — adds
  `saleAwareStats70`/`saleEndsStats` computeds. Unrelated.
- `src/lib/actions/notes.ts` — **new file**, builds all the note payloads above. Unrelated.

**`86932039` — pull player data if/when needed:**
- `src/lib/modes/loadPlan.ts` — backfills a redacted backup on plan load. Unrelated (general
  artifact-recalculation infra; doc comment mentions beam search only as one *beneficiary*, not a
  dependency).
- `src/lib/modes/reconcile.ts` — re-asserts live backup after reconcile-mode plan load. Unrelated.
- `src/lib/modes/utils.ts` — **new file**, `resolveFetchablePlayerId`/`backfillMissingBackup`/backup
  sync helpers. Used by `loadPlan.ts` (kept) independent of `BeamSearchView.vue` (deleted) — confirmed
  it has a second caller, so it stays regardless of what happens to beam search.
- `src/stores/actions/io.ts` — stores a redacted backup on every plan export via
  `redactBackupForStorage`. Unrelated (general save-plan path).
- `src/lib/artifacts/utils.ts` — **new file**, `redactBackupForStorage` + friends. Unrelated, but see
  §0 for the one beam-search import inside it that needs extracting first.
- `src/components/actions/ResearchFlatView.vue` — reworded "Artifact Data Required" message.
  Unrelated.
- This commit's changes to `BeamSearchView.vue` and `HANDOFF.md` are covered by §1 (deleted wholesale
  with those files).

---

## 3. Delete (beam-search-motivated additions to otherwise-shared files, currently dead without it)

These are changes to *existing* shared files that were made specifically to serve the beam search
engine's performance needs. All are purely additive/optional-parameter — nothing about them broke
existing callers — but I traced every current call site and **beam search's own `macros.ts` is the
only caller that ever actually passes the new options**. Once beam search is gone, this is inert
plumbing. My recommendation is to revert these; flagging as a group since they're one coherent
feature (a fast-path for artifact-optimization search) rather than one-off.

- **`src/lib/artifacts/virtue.ts`** (`ee4a37ed` + `fe2575e0`):
  - `fixedArtifactFamilies` option (skip the 1-4 artifact combo search, `ee4a37ed`)
  - `previousStoneAssignment` option + `tryStoneSwapFastPath()` + `stoneBalanceRatio()` +
    `STONE_FAST_PATH_TRUST_RATIO` (single-swap stone fast path, `fe2575e0`)
  - Recommend: revert both hunks, restoring the original unconditional full search.
- **`src/lib/artifacts/virtue.spec.ts`** (`fe2575e0`, new file): tests *only*
  `tryStoneSwapFastPath`/`previousStoneAssignment` (confirmed — its one `describe` block is titled
  "getOptimalELRSet: stone-swap fast path (previousStoneAssignment)"). Delete along with the code it
  tests.
- **`src/calculations/researchRanking.ts`** (`ee4a37ed` + `fe2575e0`):
  - `ee4a37ed`: exports `ROI_EXCLUDED_CATEGORIES`/`ELR_EXCLUDED_CATEGORIES`/
    `DELIVERY_IMPACT_CATEGORIES`/`filterByCategories` (previously module-private) and adds the
    `fixedArtifactFamilies` param to `rankResearchByELRImpact`, threaded through its 3 internal
    `getOptimalELRSet` call sites.
  - `fe2575e0`: adds `baselineStones` + `previousStoneAssignment` threading (same 2 call sites).
  - Revert the `fixedArtifactFamilies`/`previousStoneAssignment` param and its threading. The
    `export` keyword changes on the category lists were made *for* `beam-search/engine/candidates.ts`
    (per `ee4a37ed`'s own comment) — confirmed via grep that `researchRanking.ts` is the only file
    using them, so revert those back to module-private too.
- **`src/calculations/smartBuyPreview.ts`** (`ee4a37ed` portion only — see §2 for `181ec396`'s
  unrelated portion in the same file): adds `fixedArtifactFamilies` param to `runDeliveryBuyLoop`,
  threaded to its `rankResearchByELRImpact` call. Also exports `MAX_SIMULATED_PURCHASES` (was
  module-private) — confirmed via grep it has no consumer outside this file either. Revert both.

**Verification before reverting:** re-run the grep after `virtue.ts`/`researchRanking.ts`/
`smartBuyPreview.ts` are reverted to confirm `fixedArtifactFamilies`/`previousStoneAssignment` have
zero remaining references anywhere in `src/`.

---

## 4. Edit — mixed files (beam-search hunk + unrelated hunk(s) in the same file)

These need surgical, hunk-level edits, not a full-file revert.

- **`src/components/actions/ResearchActions.vue`** — touched by all of `28f7c925`, `181ec396`,
  `fe2575e0`.
  - **Revert** (`28f7c925`): the `<BeamSearchView>` template tag, the `currentView !== 'beam_search'`
    guard on `<ResearchFlatView>`, the `BeamSearchView` import, the `BeamSearchResult` type import,
    and the whole `handleApplyBeamSearchPlan()` function.
  - **Keep** (`181ec396`): all the inline-note-insertion code (Quick Buy/Sale-Aware/Sale-Ends/
    Milestone-Chain), `quickBuyStats` computed, `formatGemPrice` import, `notes.ts` imports.
  - **Keep** (`fe2575e0`): the `handleBuyMilestoneChain` change (drops the `withExpiryCheck` wrapper —
    part of the milestone-view fix, unrelated to beam search).
  - Note: there's a small incidental prettier reformat inside `insertEventCrossingWaits` in the
    `28f7c925` diff (a 4-line call collapsed to 1 line) — no logic change, just formatting noise from
    editing the file; not worth hand-preserving either way.

- **`src/composables/useResearchViews.ts`** — touched by `28f7c925` and `181ec396`.
  - **Revert** (`28f7c925`): `'beam_search'` added to the `ViewType` union, the `beam_search` entry in
    the `VIEWS` array, and the `beam_search` case in the description-lookup function.
  - **Keep** (`181ec396`): `saleAwareStats70`/`saleEndsStats` computeds and everything else.

---

## 5. Ambiguous files — DECIDED

These were added *during* beam-search work and their own doc comments cite beam search as a
motivation, but they are functionally general-purpose and were (or plausibly could be) useful
without it. Decisions made 2026-08-10:

- **5a — remove.**
- **5b — keep 25** (8 was too short).
- **5c — keep** the `engine/adapter.ts` reordering.

### 5a. `src/lib/actionLog.ts` + `src/composables/useCopyActionLog.ts` + the "Copy Log" button in `src/components/summaries/CuriositySummary.vue` (all `3ffdb16f`)

- `buildActionHistoryLog`'s own doc comment: *"Built for pasting into a chat message for external
  analysis — e.g. cross-referencing a manual plan's real purchase order/timing against a **beam-search
  trace export** ... without retyping dozens of actions by hand."*
- `useCopyActionLog`'s own doc comment: *"the original, and only, use case: pasting a whole
  multi-hundred-action plan into a chat message routinely blows past message size limits."*
- Currently wired into `CuriositySummary.vue`'s header as a "Copy Log" button, **scoped to that one
  shift group's actions** — this works today on any plan, manual or otherwise, with zero beam-search
  involvement at runtime. It doesn't call anything beam-search-related; it's just contextually
  motivated by wanting to compare a manual plan against a beam-search trace by hand.
- **Decision: remove all three** — the "Copy Log" button in `CuriositySummary.vue` (and its
  `useCopyActionLog` import/usage), `src/composables/useCopyActionLog.ts`, and
  `src/lib/actionLog.ts`.

### 5b. `ResearchPurchasePreview.vue`'s `maxVisible` default: 8 → 25 (`fe2575e0`)

- `ResearchPurchasePreview` is shared by `QuickBuy.vue`, `SmartBuyView.vue`, **and**
  `BeamSearchView.vue`. Beam search plans routinely have far more purchases to preview than a normal
  smart-buy list, which is a plausible reason to bump the cap.
- **Decision: keep 25.** 8 was too short even for the non-beam-search callers. No change needed here
  — `ResearchPurchasePreview.vue` needs no edit at all.

### 5c. `src/engine/adapter.ts`'s store-lookup reordering (`ee4a37ed`)

- Reorders `createBaseEngineState()` so the four `useXStore()` calls happen *after* the
  early-return-with-snapshot branch, instead of before. Its own comment: this fixes a real crash
  (`useXStore()` throws with no active Pinia instance) for callers "from a Web Worker, or a plain
  vitest unit test" — both of which are beam-search additions (the worker, and the whole test suite).
  Purely a reordering — zero behavior change for the snapshot-provided branch, since it never touched
  the stores either way.
- **Decision: keep.** No change needed here — `engine/adapter.ts` needs no edit at all.

---

## 6. Test infrastructure — keep, trim

`vitest`/`@vitest/coverage-v8` deps, `vitest.config.ts`, and the `package.json` `test`/`coverage`/
`test:watch` scripts were added in `ee4a37ed` for beam search's test suite, but
**`researchROI.spec.ts` (§2, unrelated, general) needs them regardless of what happens to beam
search.** Keep the test infrastructure; just drop the two beam-search-specific scripts
(`test:oracle`, `test:convergence`) per §1, and reconsider `virtue.spec.ts` per §3/§5.

---

## Suggested order of operations

1. §0 — extract `sanitizeLongsForWorker` (+ `isLongLike`/`longLikeToNumber`) into
   `lib/artifacts/utils.ts`; drop the `@/workers/beamSearch.protocol` import.
2. §1 — delete the beam-search-only files/directories, including `src/workers/` in full (+ the
   `package.json`/`vitest.config.ts` follow-on cleanup: drop `test:oracle`/`test:convergence`,
   reword/trim the beam-search comment and timeout in `vitest.config.ts`).
3. §3 — revert the dead fast-path plumbing in `virtue.ts`/`researchRanking.ts`/`smartBuyPreview.ts`
   back to module-private/unconditional; delete `virtue.spec.ts` (per §5a).
4. §5a — remove `lib/actionLog.ts`, `composables/useCopyActionLog.ts`, and the "Copy Log" button +
   its usage in `CuriositySummary.vue`. (§5b/§5c need no file changes.)
5. §4 — hand-edit the two mixed files (`ResearchActions.vue`, `useResearchViews.ts`).
6. Run `pnpm vue-tsc --noEmit` and `pnpm test` (or the ascension-planner equivalents) to catch any
   dangling reference the grep passes above missed.
7. Manual smoke test: load the app, confirm the Research view no longer shows a "Beam Search" tab and
   every other Research tab still works (Quick Buy, Sale-Aware, Sale-Ends, Milestones, ELR/ROI views).

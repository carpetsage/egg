# Research Purchase Optimizer Design

## Part 6 — Integration With This Codebase

### Purpose

Parts 1–5 were written by a chatbot with no visibility into this repo. This document is the
bridge: for every concept in Parts 1–5, what already exists in `wasmegg/ascension-planner` and can
be reused as-is, what's genuinely new, and where the design docs' assumptions don't match how this
app actually models the game (sales, 2x earnings boosts, non-ROI research). It ends with a
consolidated list of open questions and verification items.

### Decisions already made (this session)

- **Non-ROI research** (categories `hatchery_capacity`, `internal_hatchery_rate`,
  `running_chicken_bonus`, `hatchery_refill_rate`) will be **permanently excluded** from the beam's
  candidate set, matching every existing optimizer (`rankResearchByROI`, `rankResearchByELRImpact`
  already exclude them). Not a phased "v1 exclude, add later" — excluded outright.
- **Web Worker from day one.** No chunked-main-thread-yielding fallback phase.
- **Beam width is a user input alongside the deadline.** v1: a plain integer field with a sane
  default. Later: a Fast/Normal/Thorough-style dropdown (see Part 3's suggested presets). While
  this is being built/tested, the integer input should stay easy to change from the UI — that's the
  fastest way to iterate on performance/quality trade-offs without redeploying.
- **New view only.** This does not touch `SmartBuyView.vue`, `ResearchActions.vue`'s existing
  buttons, or `auto/shifts/c3.ts`. Those remain the current heuristics; beam search is an
  additional, independent tab in the manual planner for now.

---

## 1. Concept map: design docs → existing code

The headline finding: **almost every "macro" Parts 1–5 assume already exists**, built for the
manual planner's ROI/ELR/Milestones views and already reused by `auto/shifts/c3.ts`. The real net-new
work is narrower than the design docs' framing suggests.

| Design doc concept | Existing code | Notes |
|---|---|---|
| Authoritative Game Simulation | [`engine/compute.ts`](../engine/compute.ts) `computeSnapshot`, [`engine/apply/`](../engine/apply/) `applyAction`/`applyTime` | Pure functions, no Pinia dependency (confirmed — see §5). Reusable inside a Worker unchanged. |
| Search state's research levels | `EngineState.researchLevels: Record<string, number>` (~55 keys) | **Already compact.** One number per research *type* (0–40ish), not one per level. Part 3's warning about cloning "1,700 levels" doesn't literally apply here — spreading this object is already cheap. Lowers the urgency of typed-array/delta-vector tricks for v1. |
| Tier Unlock Macro | [`auto/shifts/helpers/milestones.ts`](../auto/shifts/helpers/milestones.ts) `runTierUnlockMilestone`, wrapping [`calculations/milestoneChain.ts`](../calculations/milestoneChain.ts) `computeTierMilestoneChain` | Already exactly "current state → macro → tier-unlocked state," already ROI-aware and sale-aware. Used unchanged by `c3.ts` today. |
| Phase 1 candidates ("all economically relevant research") | [`calculations/researchRanking.ts`](../calculations/researchRanking.ts) `rankResearchByROI(..., deliveryImpactOnly: false)` | Already excludes the 4 non-ROI categories via `ROI_EXCLUDED_CATEGORIES`. |
| Phase 2 candidates ("delivery-compatible earnings") | `rankResearchByROI(..., deliveryImpactOnly: true)` | **This flag already exists** and already filters to `DELIVERY_IMPACT_CATEGORIES` (`hab_capacity`, `fleet_size`, `egg_laying_rate`, `shipping_capacity`). Phase 1 → Phase 2 is a one-boolean difference in an existing function. |
| Phase 3 Delivery Macro | [`calculations/smartBuyPreview.ts`](../calculations/smartBuyPreview.ts) `runDeliveryBuyLoop`, wrapping `rankResearchByELRImpact` (`'realistic'` mode) | "Keep buying the best delivery-impact research, sale-aware, until nothing more fits before the deadline" is already implemented and already used by `c3.ts`'s `buyUntilSaleEnds`. |
| "Predictable post-deadline transformations" + final score | `calculations/realisticELR.ts` `computeRealisticELR` + `lib/artifacts/virtue.ts` `getOptimalELRSet(..., assumeMaxHabsVehicles: true)` + `calculations/effectiveLayRate.ts` | `effectiveLayRate.ts` **is** `score = min(finalLayRate, finalShippingRate)`, verbatim (`Math.min(layRate, shippingCapacity)`). The "realistic" ELR mode already applies optimal artifacts + maxed habs/vehicles (i.e. spend SE after the fact) before computing it — that's exactly the docs' "post-deadline transformations." |
| "Purchases happen immediately when affordable" | `calculations/researchROI.ts` `getSaleAwareTimeToSave` | Universal pattern already — also decides "buy now vs. wait for the discount" automatically. |
| Deduplication / "earliest identical state wins" | **Nothing** | Genuinely new. No existing code competes between purchase orderings. |
| Outer Beam Search | **Nothing** | Genuinely new. This is the actual deliverable. |
| Web Worker host | **Nothing** (zero `new Worker` anywhere in this codebase) | Genuinely new infrastructure. |

---

## 2. What the design docs don't model

The chatbot wasn't told about several things this app already handles meticulously everywhere
else. Beam search has to route through the *same* existing functions for these, not a simplified
model, or its cost predictions will silently diverge from what the rest of the app assumes:

- **Weekly research sales** (`lib/events.ts`: `isResearchSaleActive`, `getNextSaleStart`,
  `getNextSaleEnd` — 70%-off Mon/Tue and Fri/Sat Pacific). `getSaleAwareTimeToSave` already chooses
  "buy now" vs. "wait for the sale" per purchase. Every "wait until affordable, buy immediately"
  step the beam takes must go through this function.
- **2x earnings boost windows** (`isEarningsBoostActive`, `boostTransitionsFrom`). Earnings aren't a
  constant $/sec slope — `calculateEarningsForTime`/`getTimeToSave` already integrate through these
  transitions. A 1–3 week search horizon (Part 3's own stated scale) will almost certainly cross
  several sales and boosts; a flat-rate assumption would be wrong by the time it matters.
- **Non-ROI research categories** — excluded per the decision above. The enforcement point is
  candidate generation: as long as Phase 1/2 candidate generation always goes through
  `rankResearchByROI`'s existing category filter (rather than iterating `getCommonResearches()`
  directly), this is correct by construction and doesn't need separate logic.
- **"Every possible type of earnings"** — online vs. offline earnings, away-multipliers, the
  video-doubler flag (`assumeDoubleEarnings`), artifact away-earnings multipliers. All already
  folded into `calculateEarnings`/`computeSnapshot`. Beam search doesn't reimplement any of this —
  it just must always go through `computeSnapshot` as the source of truth, never hand-roll a $/sec
  formula.

---

## 3. Search state design

Given `researchLevels` is already a compact `Record<string, number>`, a reasonable v1 shape:

```ts
interface BeamSearchState {
  parentId: number | null;     // index into a flat states array, not a purchase-array copy
  purchase: BeamPurchase | null; // what produced this state from its parent (research id+level, tier macro, or phase transition)
  phase: 1 | 2;
  absoluteSimTime: number;     // same unix-seconds convention used everywhere else in this app
  researchLevels: Record<string, number>;
  bankValue: number;           // ~0 immediately after any purchase per the "buy immediately" assumption; kept for correctness/debugging, not for ranking
  population: number;
  lastStepTime: number;        // engine's own relative clock, needed to reconstitute an EngineState
  eggsDelivered: Record<VirtueEgg, number>;
  fuelTankAmounts: Record<VirtueEgg, number>;
  teEarned: Record<VirtueEgg, number>;
  activeSales: { research: boolean; hab: boolean; vehicle: boolean };
  earningsBoost: { active: boolean; multiplier: number };
}
```

`EngineState` also carries `habIds`, `vehicles`, `siloCount`, `tankLevel`, `artifactLoadout`,
`activeArtifactSet`, `artifactSets`, `currentEgg`, `shiftCount`, `te`, `soulEggs` — none of which
beam search varies. **These belong in the immutable shared context** (passed once, not duplicated
per state), matching the docs' "do not duplicate immutable game data" principle. **Confirmed**: hab,
vehicle, and artifact loadout are frozen for the entire Curiosity build window, so this split is
correct as designed.

Calling any existing calc function (`computeSnapshot`, `rankResearchByROI`, etc.) on a
`BeamSearchState` means reconstituting a full `EngineState` by spreading the shared immutable
fields with this state's varying fields — a cheap object spread, not a deep clone, but not free
either (see §4).

### Macro edges carry their own expanded sub-sequence

A tier-macro or Phase-3-macro transition's `purchase` field can't just be a tag like
`{ kind: 'tierMacro', tier: 13 }` — the design docs' "store parent pointer + purchase id, don't
copy purchase arrays" rule is about the *outer* per-purchase chain (which really would blow up
combinatorially if copied), not about a single macro invocation's own internal purchase list, which
is bounded (dozens of items) and only ever materializes once, at the moment that macro actually
runs. So a macro edge should store the **full ordered list** the macro itself already produces —
`runTierUnlockMilestone`'s `ShiftResult.actions` / `computeTierMilestoneChain`'s `MilestoneChainItem[]`
for a tier macro, `runDeliveryBuyLoop`'s `DeliveryLoopResult.purchases` for the Phase 3 macro —
attached directly to that one edge. This is what makes flattening the winning path for Apply (§7)
possible: walking parent pointers to the root and reversing gives a sequence of edges, and any edge
that's a macro expands inline into its stored sub-sequence, in the order the macro itself chose —
yielding one flat, fully-ordered list of individual research purchases with no separate "explode
the macro" logic needed.

---

## 4. The major performance risk: existing ranking functions aren't cheap candidate lookups

This is the single biggest gap between Part 3's cost model and reality, and probably deserves a
timing spike before the beam loop's shape is finalized.

- `rankResearchByROI` computes a full ROI (`calculateResearchROI`) for every unpurchased eligible
  research (~50 candidates today). `calculateResearchROI` runs up to a **60-iteration binary
  search**, calling `calculateEarningsForTime` twice per iteration — roughly 50 × 120 ≈ 6,000
  non-trivial evaluations *per call* to `rankResearchByROI`, before even counting `computeSnapshot`
  overhead.
- `computeTierMilestoneChain` (the tier-unlock macro) is **itself a search loop** — it already has
  its own progress-heartbeat/logging because a single call can take a couple of seconds on a large
  chain (see its comments in `milestoneChain.ts`). It is not O(1); it's O(chain length) ×
  O(rankResearchByROI-ish cost).
- `runDeliveryBuyLoop` (the Phase 3 macro) similarly loops rank→buy→repeat until nothing more fits.
  `rankResearchByELRImpact`'s `'realistic'` mode is heavier still — it calls `getOptimalELRSet`
  (a full artifact optimization) per candidate, and again per lookahead level.

None of this is a problem today, where each of these runs once, reactively, when a user opens a
tab. It becomes a severe problem inside a beam loop: Part 3's complexity model
(`K beam width × B candidates × D depth`) assumes each transition is "mostly arithmetic." Here,
generating candidates for **one** beam state can already cost thousands of evaluations, and a tier-
or Phase-3-macro action costs a small search in itself. At Part 3's own suggested scale
(K=1,000–2,000, D=100–200), naively calling the exact existing ranking functions on every candidate
state reaches billions of underlying evaluations — that will stall even a Worker for an
unacceptable time.

**Decided approach**, settled by discussion rather than left as an open trade-off:

### `rankResearchByROI` isn't reused for Phase 1/2 candidate generation at all

It's not just expensive, it's the wrong *shape* for what the beam needs. `rankResearchByROI`'s job
is "pick the single next-best purchase" — it sorts everything into one linear order (with
bottleneck-pairing logic on top) for a greedy buyer like `computeTierMilestoneChain` or the manual
planner's ROI tab. Beam search doesn't buy in rank order — it needs to spawn **one child state per
viable candidate** and let scoring/pruning decide which branches survive. A sorted "best purchase"
answer isn't what an expansion step wants; a flat, cheaply-annotated list of every viable candidate
is.

So Phase 1/2 candidate generation gets its own lightweight function instead, e.g.
`getLightweightPhaseCandidates(state, context, mods, phase, absoluteSimTime, nextSaleStart)`:

1. Enumerate unpurchased, tier-unlocked research in the phase's allowed categories — the same
   category lists `rankResearchByROI` already encodes (`ROI_EXCLUDED_CATEGORIES` for Phase 1;
   further intersected with `DELIVERY_IMPACT_CATEGORIES` for Phase 2), just applied directly as a
   static filter instead of going through the whole function.
2. For each candidate, call `getSaleAwareTimeToSave` for price/wait — already O(1), already the
   exact primitive every other purchase-timing path in this app uses, so this part costs nothing
   extra to make cheap; it's already cheap.
3. Approximate `earningsDelta` with **one** extra `computeSnapshot` call (state with this research
   at level+1, vs. the current snapshot) instead of `calculateResearchROI`'s 60-iteration binary
   search. This trades exact payback-time precision (which accounts for exactly which boost/sale
   windows the payback period crosses) for a same-order-of-magnitude estimate — fine for deciding
   which branches are worth spawning, not fine for the authoritative number shown in a UI.
4. Reuse `meetsROIByDeadline`/`isActuallyDuringSale` (both already O(1) predicates, no reimplementing
   needed) to annotate whether this candidate clears 70% ROI before the next sale start. This is
   exactly the check you described: a candidate that won't clear it is flagged so the search treats
   buying it now as inferior to waiting for the sale — the same rule `meetsSaleAwareDeadline`
   already encodes for the manual planner's "70% Return" button, just computed per-candidate here
   instead of gating a single greedy pick.
5. Return the full annotated list, unsorted — the beam is free to order/prune it however its own
   scoring wants, including using the 70%-ROI flag to cut candidate count down toward Part 3's own
   assumed branching factor (~10 "strategically relevant" candidates), which is exactly the lever
   that keeps this cheap at scale.

Net cost per candidate: ~2 cheap calls instead of ~120 — call it a 50-60x reduction before even
counting that Phase 1/2's filtered candidate count is already well under the ~50 unfiltered
researches `rankResearchByROI` iterates today.

### `rankResearchByELRImpact` stays, but only at the Phase 3 macro boundary

Confirmed: Phase 3's actual buy order — once the beam commits to "run the delivery macro" — still
needs to be `rankResearchByELRImpact` (or a lightweight version of the same idea, if profiling shows
it's still too slow at that boundary). This is unlike Phase 1/2: it's invoked once per Phase-3-macro
call, not once per ordinary per-purchase transition, so the existing mitigation of "reserve exact
functions for macro boundaries" already contains its cost — see the next section.

**Remaining mitigations, still applicable regardless of the above:**

1. Reserve the expensive exact functions (`computeTierMilestoneChain`, `runDeliveryBuyLoop`/
   `rankResearchByELRImpact`) for macro boundaries only (tier unlock, Phase 3, and the final replay
   of the winning path for display) — not for ordinary per-purchase transitions, which now use the
   lightweight function above instead.
2. Memoize per `(researchId, level, absoluteSimTime-bucket)` if profiling shows repeated identical
   evaluations across sibling beam states. Part 3 already says: measure before building this.
3. Apply "earliest identical research-state wins" dedup aggressively **before** ever invoking the
   tier or Phase 3 macros — those are the most expensive operations, and dedup is required by the
   design docs regardless.

This whole approach still needs a timing spike to confirm it's fast enough in practice — see §8.

---

## 5. Web Worker plan

No existing precedent in this codebase, but the pure-calculation layer turns out to already be
Worker-safe:

- **Verified**: `engine/compute.ts`, `engine/apply/*`, and `calculations/*` have zero live Pinia
  dependencies. The only `@/stores/*` imports in that layer (`nextSiloCost`, `totalAwayTime` from
  `stores/silos.ts`) are plain exported pure functions, not Pinia store calls, despite living under
  `stores/` — checked directly. `engine/adapter.ts` (`createBaseEngineState`, `getSimulationContext`)
  *does* call `useXStore()` heavily, but that's the main-thread-only adapter that builds the
  starting `EngineState`/`SimulationContext` **before** handing off to the worker — the worker
  itself never needs to import `adapter.ts`. This clean split already exists structurally; beam
  search should preserve it rather than reach into stores from worker-side code.
- **New file**: `src/workers/beamSearch.worker.ts`, loaded via Vite's native
  `new Worker(new URL('./beamSearch.worker.ts', import.meta.url), { type: 'module' })` — no bundler
  config needed.
- **Message protocol** (typed both directions), with a `runId` so a stale message from an obsolete
  run (user changed the deadline/beam width and reran) can be ignored on arrival:
  - main → worker: `{ type: 'start', runId, startState, context, deadline, beamWidth }`,
    `{ type: 'cancel', runId }`
  - worker → main: `{ type: 'progress', runId, depth, beamSize, statesExpanded, duplicatesRemoved,
    bestScoreSoFar, elapsedMs }` (throttled to a few times/sec per Part 3), `{ type: 'result', runId,
    ... }`, `{ type: 'error', runId, message }`
- **To verify**: does `SimulationContext.rawBackup` (an `ei.IBackup`, protobufjs-decoded) survive
  `structuredClone`/`postMessage`? protobufjs messages can carry non-plain prototypes or Long.js
  64-bit integers that don't clone cleanly. If it fails: either sanitize it once on the main thread
  before sending (`JSON.parse(JSON.stringify(...))`, the same trick `createBaseEngineState` already
  uses for `artifactSets`), or pre-derive whatever the `'realistic'` ELR mode needs from it outside
  the worker and send only that.

---

## 6. Reusability for `auto` later

Design the module boundary so the beam engine's entry point is exactly
`runBeamSearch(startState: EngineState, context: SimulationContext, deadline: number, options) →
BeamSearchResult` — nothing Pinia- or component-specific, matching how `c3.ts`/`milestones.ts` are
already written (pure functions over `EngineState`/`SimulationContext`).

- **Manual planner** (this pass): a new composable builds `startState` via
  `createBaseEngineState(actionsStore.effectiveSnapshot)`, sends it to the worker with a
  user-picked deadline, and on completion converts the winning purchase sequence into real actions
  using the same "replay against the live plan" pattern `c3.ts`'s `executePlanToLevels` and
  `ResearchActions.vue`'s `batch(() => ... buyOneLevel ...)` flow already use. Keep this "apply to
  the live plan" adapter **separate from** the beam engine itself.
- **Auto** (future, explicitly not this pass): calls the identical worker/module with a
  `startState`/`context` derived from wherever the auto shift currently is. No changes needed to the
  beam engine — only to whichever shift wires it in. Confirmed intent: once beam search is working,
  `c3.ts` gets updated to call it directly in place of its current "ride sales, then sale-ends dump"
  heuristic — including retiring `runC3Variants`' bespoke "attempt Tier 13" two-variant comparison
  (§8.5), since the beam's generic "tier macro, beam decides when" already subsumes it. That
  replacement is a separate future pass; this pass doesn't touch `c3.ts`.

---

## 7. New Research View wiring (manual planner)

- Add `'beam_search'` to `ViewType`/`VIEWS` in
  [`composables/useResearchViews.ts`](../composables/useResearchViews.ts), alongside
  game/cheapest/roi/elr/milestones/smart_buy.
- New component, e.g. `components/actions/BeamSearchView.vue`, shaped like `SmartBuyView.vue`:
  - **Inputs**: deadline date+time picker (same pattern as `virtueStore.ascensionDate/Time/Timezone`,
    converted via `getLocalTimestampInTimezone` — the same function `engine/adapter.ts` already uses
    for ascension start), and a **beam width integer input with a sane default** sitting right next
    to it. Keep this trivially editable from the UI while developing/tuning — that's the fast lever
    for iterating on speed/quality trade-offs before a Fast/Normal/Thorough dropdown replaces it.
  - **Run/Cancel** buttons driving the worker lifecycle.
  - **Live progress** while running (depth, beam size, best score so far, elapsed — straight from
    worker progress messages).
  - **Result preview** on completion: reuse `summarizeResearchLevelChanges` for the "what changed"
    summary (same convention as the existing sale-aware/sale-ends previews), plus an **Apply**
    button.
  - **Apply is all-or-nothing**: it inserts the entire winning plan — Phase 1 + Phase 2 + Phase 3 +
    every tier macro — as real actions in one shot (confirmed; no partial/incremental apply for v1).
    Before replay, the winning path is flattened per §3's "macro edges carry their own expanded
    sub-sequence" — every tier-macro and Phase-3-macro edge is expanded into its individual research
    purchases, in the exact order that macro produced them, so the end result handed to the replay
    adapter is one flat, ordered `researchId`/level list indistinguishable from an ordinary chain of
    solo purchases. That flat list then goes through the same "replay against the live plan,
    re-deriving real price/wait at each step" pattern `c3.ts`'s `executePlanToLevels` and
    `ResearchActions.vue`'s `batch(() => ... buyOneLevel ...)` already use — order is preserved from
    the beam's plan, but the actual price/wait for each purchase is re-derived live at Apply time
    (not blindly trusted from the scratch-state simulation), exactly like every existing "dry run →
    execute" flow in this app already does.
- New composable, e.g. `composables/useBeamSearch.ts`, owns the worker instance and run lifecycle
  (start/cancel/progress ref/result ref) — independent of `useResearchViews`, matching this file's
  existing convention of ungated, independent computeds (see `roiRankedResearches`'s doc comment).

---

## 8. Open questions / things to verify

The first six of these were resolved by discussion; the last two are **not decisions for anyone to
make** — they're implementation-time technical checks (does X actually work when we build it),
listed here just so nobody assumes they're settled.

### Resolved this session

1. ~~Are hab/vehicle/artifact loadout genuinely frozen for the whole Curiosity beam-search
   horizon?~~ **Confirmed yes.**
2. ~~Does v1 need to replicate `c3.ts`'s bespoke Tier 13 variant-comparison machinery?~~
   **Confirmed no.** This pass doesn't touch `c3.ts` at all. A later pass, once beam search is
   proven, replaces `c3.ts`'s heuristic (including retiring the Tier-13-forcing two-variant
   comparison) with a direct call into the beam engine — see §6.
3. ~~Dedup key: does anything besides `phase + researchLevels` (+ `absoluteSimTime` for the
   earliest-wins tiebreak) need to be included?~~ **Confirmed** — the proposed key is correct.
4. ~~Should Apply insert the whole winning plan in one shot, or incrementally?~~ **Confirmed: one
   shot, all phases and macros**, with macro edges expanded into individual purchases first — see
   §3 and the "Apply is all-or-nothing" note in §7.
5. ~~Beam width dropdown copy/tiers and default numeric values~~ **Confirmed deferred** — v1 ships
   the plain integer input (§7); dropdown presets wait for a convergence-benchmarking pass (Part 3,
   "Example Convergence Test").
6. ~~Can the beam's inner loop afford the full `rankResearchByROI`/`rankResearchByELRImpact`
   machinery per candidate state?~~ **No — settled on a dedicated lightweight candidate function
   for Phase 1/2 instead**, keeping the exact `rankResearchByELRImpact` only at the Phase 3 macro
   boundary. See §4's rewrite.

### Still open — implementation-time verification, not a decision to make now

1. Does the new lightweight Phase 1/2 candidate function (§4) actually get the beam's inner loop
   fast enough at real beam widths (hundreds–thousands of states)? This needs a timing spike against
   a real save once it's built — the design is settled, the number is not yet measured.
2. Does `SimulationContext.rawBackup` (protobufjs-decoded) survive `structuredClone`/`postMessage`
   as-is, or does it need sanitizing first? (§5) Purely a "try it and see" check during
   implementation — nothing about it depends on game knowledge or a product decision.

---

## 9. Explicitly out of scope for this pass

- No changes to `smartBuyPreview.ts`'s existing buttons/behavior, `ResearchActions.vue`'s existing
  flows, or `auto/shifts/c3.ts`. `c3.ts` is the natural *future* beam-search consumer (§6), not
  something to touch now.
- No custom heaps/hashing/WASM/multi-worker parallelism — Part 3 already says wait for profiling.
- No support for non-ROI research categories — excluded outright per the decision above, not
  deferred.

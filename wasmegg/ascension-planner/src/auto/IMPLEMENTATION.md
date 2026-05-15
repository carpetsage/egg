# Auto Planner — Phased Implementation Plan

> **AGENT INSTRUCTIONS**: 
> - Each step is designed to be independently testable and make visible, incremental progress.
> - Steps within a phase MUST be completed in order. Phases MUST be completed in order.
> - **When told to execute the plan or "continue"**, locate the first incomplete step, and work on that SINGLE step. 
> - **STOP after completing ONE step**. Do not attempt to complete multiple steps at once. The user will choose whether to continue in the current chat or a new one to save context.
> - **Mark your progress**: As you complete a step, edit this file to change `[ ]` to `[x]` next to the step title.

---

## Phase 0–4: Foundation through Single Ascension ✅

All foundation work is complete. The following has been built and is working:

- [x] `skipGrowth` option on `computeSnapshot`
- [x] Extracted `computeRealisticELR` to shared utility
- [x] Extracted ROI calculation to pure function
- [x] `calendar.ts` — event schedule helpers
- [x] `types.ts` — `AscensionSummary`, `ShiftResult`, etc.
- [x] `se-tracker.ts` — SE cost tracking
- [x] `te-thresholds.ts` — TE threshold crossing calculations
- [x] Manual/Automatic tab toggle in `App.vue`
- [x] `AutomaticPlanner.vue` — shell with player ID, target TE, start time, timezone
- [x] All 13 shift strategies: C1, K1, I1, C2, K2, R1, C3, H1, K3, C4, I2, R2, H2
- [x] `ascension.ts` — full single ascension orchestrator (`runAscension`, `runUntilShift`)
- [x] `AscensionOverview.vue` — displays complete ascension results with shift breakdown
- [x] `ShiftSummary.vue` — detailed per-shift action display
- [x] 1-sale vs 2-sale comparison with "faster than" recommendation

**Current state**: The user can enter their player ID, set a TE goal, and generate a single ascension. Both 1-sale and 2-sale strategies are simulated, and the faster one is displayed with a comparison badge.

---

## Phase 5: Sequential Ascension Chain

This is the core new feature. Transform the single-ascension generator into a sequential plan builder where each ascension's end state feeds into the next.

### [x] Step 5.1: Add goal input after `AscensionOverview`

**File**: `src/components/auto/AutomaticPlanner.vue`

After each `AscensionOverview` component, render a compact inline input for the next ascension's goal. The user can specify **either** a TE goal or an end date/time:

- **TE Goal** input: integer, min = `previousEndTE + 10`, max = `490`, default = `min(previousEndTE + 30, 490)`
- **End Date/Time** input: datetime, min = previous ascension's end time. Uses the same timezone as the global start time.
- The user fills in **one** field. The other is left blank (or shows "auto" placeholder).
- "Generate Next" button
- Only show this input if `previousEndTE < 490` (no more ascensions needed at cap)

**Goal resolution logic**:
1. If the user specifies a **TE goal**: simulate both 1-sale and 2-sale builds to that TE, pick the faster one, back-populate the end date/time field with the winning strategy's end time.
2. If the user specifies a **date/time goal**: simulate both 1-sale and 2-sale builds, compute how many TE each earns by that deadline, pick the one that earns more TE, back-populate the TE field.
3. If the user later edits one field: re-evaluate the 1-sale vs. 2-sale decision, recalculate wait phases, update the other field. The build phase (C1→K3) is **not** re-simulated since the start time hasn't changed.

**Visual design**: Keep it lightweight — a small card between ascension overviews, not a full form. Something like:

```
┌──────────────────────────────────────────────────────────────┐
│  Next Ascension Goal                                        │
│  [___225___] TE   — or —   [__2026-06-01__] [__09:00__]     │
│                                        [Generate A2 →]      │
└──────────────────────────────────────────────────────────────┘
```

**Test**: Generate A1. Enter a TE goal and generate — verify end date is back-populated. Clear TE, enter a date goal and generate — verify TE is back-populated.

### [ ] Step 5.2: Implement state chaining logic

**File**: `src/components/auto/AutomaticPlanner.vue` (or extract to a composable)

Create the logic that derives the next ascension's start state from the previous ascension's summary:

```typescript
function deriveNextStartState(
  prevSummary: AscensionSummary,
  prevActions: Action[],
  baseBackupState: EngineState // original backup for non-chain properties
): { startState: EngineState; context: SimulationContext; startTime: number } {
  // startTime = prevSummary.endTime
  // startTE = prevSummary.endTE (carried via teEarned per egg = prevSummary.finalTE)
  // soulEggs = prevSummary.endSoulEggs
  // shiftCount = prevSummary.endShiftCount
  // eggsDelivered = { curiosity: 0, ... } (reset — new farm)
  // researchLevels = {} (reset — new farm)
  // bankValue = 0, population = 1, currentEgg = 'curiosity'
}
```

Key state carried forward:
- `startTime` ← `prevSummary.endTime`
- `teEarned` per egg ← `prevSummary.finalTE` per egg
- `soulEggs` ← `prevSummary.endSoulEggs`
- `shiftCount` ← `prevSummary.endShiftCount`

Key state reset:
- `eggsDelivered` ← all zeros
- `researchLevels` ← `{}`
- `bankValue` ← `0`
- `population` ← `1`
- `currentEgg` ← `'curiosity'`

**Test**: Generate A1, then A2. Verify A2's start time matches A1's end time. Verify A2's starting TE matches A1's ending TE. Verify SE balance is properly decremented.

### [ ] Step 5.3: Store ascension chain as reactive array

**File**: `src/components/auto/AutomaticPlanner.vue`

Refactor `generatedPlan` from a single result into a reactive array of ascension results:

```typescript
interface ChainedAscension {
  index: number;              // 0-based
  goalType: 'te' | 'date';   // Which field the user specified
  targetTE: number;           // TE goal (user-set or back-populated)
  targetEndTime?: number;     // End date goal as unix timestamp (user-set or back-populated)
  summary: AscensionSummary;
  actions: Action[];
}

const ascensionChain = ref<ChainedAscension[]>([]);
```

The template should iterate over `ascensionChain` rendering an `AscensionOverview` for each entry, with the goal input after the last entry.

Update the `generate()` function to push new ascensions onto the chain rather than replacing.

**Test**: Generate A1, A2, A3 sequentially. All three appear stacked on the page with correct chaining.

### [ ] Step 5.4: Implement cascading recalculation

**File**: `src/components/auto/AutomaticPlanner.vue`

When the user changes the goal (TE or date) for ascension N:

**If N is the last (or only) ascension in the chain:**
1. Re-evaluate 1-sale vs. 2-sale using the cached build phase (start time unchanged → build phase unchanged)
2. Recalculate only the TE-wait shifts with the new goal
3. Back-populate the other goal field

**If N is not the last ascension (there are ascensions N+1 through M):**
1. Recalculate ascension N as above (wait phase only, build phase cached)
2. For each ascension N+1 through M: re-derive start state from previous result, **fully re-simulate** (start time changed → build phase changes → new sale boundaries)
3. Each downstream ascension keeps its existing goal (TE or date, whichever the user originally set) but recalculates everything else
4. Back-populate the computed field for each downstream ascension

Add an edit affordance to each `AscensionOverview`:
- The TE goal and end date shown as editable fields in the overview header
- Changing and confirming triggers recalculation of that ascension and all subsequent ones

**Implementation notes**:
- The build phase optimization is key: for the edited ascension itself, only wait phases change. For downstream ascensions, full re-simulation is required because their start times shift.
- Show a brief loading state during recalculation
- Consider debouncing if the input is a live field

**Test**: Generate A1 (TE goal: 200), A2 (TE goal: 230), A3 (TE goal: 260). Change A1's TE goal to 210. Verify A1's end date updates, A2 and A3 fully recalculate with new start times. Change A2's goal to a date instead of TE — verify TE is back-populated and A3 recalculates.

### [ ] Step 5.5: Add delete and insert controls

**File**: `src/components/auto/AutomaticPlanner.vue`

Add controls to each ascension in the chain:

- **Delete**: Remove ascension N, recalculate N+1 onward (their TE goals stay, but start states update)
- **Insert before**: Add a new ascension before N, prompting for a TE goal, recalculate N onward

Edge cases:
- Deleting the first ascension: the second one becomes the first, using the global start state
- Deleting the last ascension: just remove it, show the "Next TE Goal" input after the new last
- Insert before first: new ascension uses global start state, old first recalculates

**Test**: Generate 3 ascensions. Delete #2 — verify #3 recalculates using #1's end state. Insert before #2 — verify a new ascension appears and everything recalculates.

---

## Phase 6: Export & Polish

### [ ] Step 6.1: Export chain as plan library

**File**: New `src/auto/export.ts` + UI button in `AutomaticPlanner.vue`

Convert the entire ascension chain into a plan library JSON file:

```typescript
interface ExportedPlan {
  version: 1;
  exportedAt: string;        // ISO timestamp
  playerId: string;
  startTime: number;
  timezone: string;
  ascensions: {
    index: number;
    targetTE: number;
    summary: AscensionSummary;
    actions: Action[];
  }[];
}
```

Add an "Export Plan" button that downloads this as a `.json` file.

**Test**: Generate 3 ascensions, export. Verify the JSON contains all 3 ascensions with correct data.

### [ ] Step 6.2: Import plan library

Allow loading an exported plan back into the auto planner:
- Parse the JSON
- Populate `ascensionChain` with the loaded data
- Set global inputs (start time, timezone) from the file
- Show all ascensions immediately without re-simulating

Also support importing into the manual planner via "Load Saved Plan" — each ascension in the chain becomes a separate plan entry.

**Test**: Export a plan, reload the page, import it. Verify all ascensions appear correctly.

### [ ] Step 6.3: Copy roadmap summary to clipboard

Add a "Copy Summary" button that generates a compact text roadmap:

```
Ascension Plan — Starting TE: 175
  A1: 175 → 195 TE (1-sale, 6d 12h)
  A2: 195 → 225 TE (2-sale, 8d 3h)
  A3: 225 → 260 TE (1-sale, 5d 18h)
Total: 175 → 260 TE in ~20 days, 45.2T SE consumed
```

**Test**: Generate a chain, click Copy Summary, paste into a text editor. Verify the format matches.

### [ ] Step 6.4: Running totals in chain view

Add a cumulative summary bar at the bottom of the ascension chain showing:
- Total duration across all ascensions
- Total SE consumed
- Overall TE progress (start → final)
- Number of ascensions

This updates live as ascensions are added/removed/edited.

**Test**: Generate 3 ascensions. Verify totals match the sum of individual ascension metrics.

---

## Phase 7: Cleanup & Hardening

### [ ] Step 7.1: Remove dead tree code & types

Remove any types, functions, or references related to the abandoned decision tree:
- `tree.ts` (if created)
- `AutoPlanGoal.maxAscensions` (no longer needed — user adds as many as they want)
- Any tree-related fields in `AscensionSummary` that are no longer used (`parentId`, `depth` if not used for display)
- `fullPlanRef?: WeakRef<Action[]>` in `AscensionSummary` — this was a memory optimization for hundreds of tree nodes; with ~dozen sequential plans, just keep actions directly in the `ChainedAscension` array
- Update `types.ts` to only include what the sequential chain needs

**Test**: TypeScript compiles with no errors. No dead imports.

### [ ] Step 7.2: Loading states and error handling

- Show a spinner/skeleton while each ascension simulates
- Handle edge cases: TE goal already reached, SE going deeply negative, simulation failures
- Validate that each ascension's TE goal is achievable (endTE matches or exceeds goal)
- Show a warning if an ascension takes an unreasonably long time (e.g., > 60 days)

### [ ] Step 7.3: Responsive layout

- Ensure the chain view works on mobile/tablet
- The "Next TE Goal" inline input should stack vertically on small screens
- Ascension overviews should remain readable at narrow widths

### [ ] Step 7.4: Ascension numbering and labels

Update `AscensionOverview` to show clear numbering:
- "Ascension 1", "Ascension 2", etc.
- Show the TE goal in the header (not just the result)
- Show cumulative position: "A3 of 5" or similar

### [ ] Step 7.5: Save/restore auto-plan settings

Persist the following to `localStorage`:
- Player ID
- Timezone preference
- The entire ascension chain (goals + summaries, not full action arrays)
- So the user can close the browser and come back to their plan

**Test**: Generate a plan, refresh the page, verify the plan structure is restored (may need re-simulation for full action data).

# Auto Planner — Phased Implementation Plan

> **AGENT INSTRUCTIONS**: 
> - Each step is designed to be independently testable and make visible, incremental progress.
> - Steps within a phase MUST be completed in order. Phases MUST be completed in order.
> - **When told to execute the plan or "continue"**, locate the first incomplete step, and work on that SINGLE step. 
> - **STOP after completing ONE step**. Do not attempt to complete multiple steps at once. The user will choose whether to continue in the current chat or a new one to save context.
> - **Mark your progress**: As you complete a step, edit this file to change `[ ]` to `[x]` next to the step title.

---

## Phase 0: Prerequisites — Extract & Prepare

Before writing any auto-planner code, extract pure functions from existing UI-coupled code so the auto-planner can reuse them without importing Vue composables or Pinia stores.

### [x] Step 0.1: Add `skipGrowth` option to `computeSnapshot`

**File**: `src/engine/compute.ts`

Add an optional `options` parameter to `computeSnapshot()` with a `skipGrowth: boolean` flag. When `true`, skip the population growth integration and assume `population = habCapacity`. This is the TE ≥ 100 optimization that makes the auto-planner fast.

**Test**: Call `computeSnapshot` with and without `skipGrowth` on a state with high TE. Verify that with `skipGrowth: true`, the snapshot has `population === habCapacity` and `offlineEarnings` matches the non-growth version.

### [x] Step 0.2: Extract `computeRealisticELR` to a shared utility

**From**: `src/composables/useResearchViews.ts` (the private `computeRealisticELR` function, ~lines 110-155)
**To**: `src/calculations/effectiveLayRate.ts` or a new `src/calculations/realisticELR.ts`

This function computes ELR using the full pipeline (hab capacity → lay rate → shipping capacity → min of the two) given research levels, artifact mods, epic research, and colleggtible modifiers. It's currently a private function inside a Vue composable. Extract it as a named export so both the composable and the auto-planner can use it.

**Test**: Import the extracted function in `useResearchViews.ts`, confirm existing behavior is unchanged (the composable should call the extracted function instead of its local copy).

### [x] Step 0.3: Extract ROI calculation to a pure function

**From**: `src/composables/useResearchViews.ts` (ROI calculation logic, ~lines 536-703)
**To**: `src/calculations/researchROI.ts`

Extract the core ROI calculation:
- Input: research, current state, context, event timing
- Output: `{ roiSeconds, totalRoiSeconds, earningsDelta, showSaleWarning }`

This is the logic that computes how long until a research purchase pays for itself, including the sale warning flag. The auto-planner's C3 strategy (§8.5 in PLAN.md) needs this exact calculation.

**Test**: Verify the extracted function produces identical ROI values to what the existing Earnings ROI view shows for a known state.

### [x] Step 0.4: Create `src/auto/calendar.ts` — Event schedule helpers

Pure functions for determining event state at any simulation timestamp:

```typescript
function isResearchSaleActive(timestampSeconds: number): boolean
function isEarningsBoostActive(timestampSeconds: number): boolean
function getNextSaleStart(timestampSeconds: number): number    // next Friday 9 AM PT
function getNextSaleEnd(timestampSeconds: number): number      // next Saturday 9 AM PT
function getNextEarningsBoostStart(timestampSeconds: number): number  // next Monday 9 AM PT
function getNextEarningsBoostEnd(timestampSeconds: number): number    // next Tuesday 9 AM PT
```

Built on top of the existing `getNextPacificTime()` from `src/lib/events.ts`.

**Test**: Unit test with known timestamps crossing sale/event boundaries. Verify DST handling (Pacific time changes UTC offset).

---

## Phase 1: Foundation — Types, SE Tracking, Tab Shell

### [x] Step 1.1: Create `src/auto/types.ts`

Define all core types:

```typescript
interface AscensionSummary { ... }    // See PLAN.md §7
interface AutoPlanGoal { ... }        // { targetTE: number }
interface AutoPlanInput { ... }       // backup + goal + maxAscensions + startTime
interface ShiftResult { ... }         // { actions: Action[], elapsedSeconds: number, endState: EngineState }
interface BuildPhaseResult { ... }    // Combined result of shifts C1-K3
```

**Test**: Types only — this is just type definitions. Compiles without errors.

### [x] Step 1.2: Create `src/auto/se-tracker.ts`

Pure functions for SE cost tracking:

```typescript
function computeShiftCosts(startingSE: number, startingShiftCount: number, numShifts: number): {
  costs: number[];           // Cost of each individual shift
  totalCost: number;         // Sum of all shift costs
  endingSE: number;          // startingSE - totalCost (may be negative)
  endingShiftCount: number;  // startingShiftCount + numShifts
}

function computeMultiAscensionSECost(startingSE: number, startingShiftCount: number, numAscensions: number): {
  totalCost: number;
  endingSE: number;
  endingShiftCount: number;
  perAscension: { cost: number; endingSE: number }[];
}
```

Uses `shiftCost()` from `lib/earning_bonus.ts`. Iterates shift-by-shift, deducting SE as it goes (since `shiftCost` depends on current SE and shift count).

**Test**: Compute SE costs for a known backup. Verify the first shift cost matches what the existing ShiftActions.vue component displays.

### [x] Step 1.3: Create `src/auto/te-thresholds.ts`

Pure functions for TE earning calculations:

```typescript
// Given a constant ELR, how many TE are earned in a given time?
function computeTEEarned(
  currentEggsDelivered: number,
  elrPerSecond: number,
  durationSeconds: number,
): { teEarned: number; finalEggsDelivered: number }

// How long to earn N more TE at a constant ELR?
function timeToEarnTE(
  currentEggsDelivered: number,
  elrPerSecond: number,
  targetAdditionalTE: number,
): number  // seconds, or Infinity if impossible

// Given a variable ELR (changes at specific timestamps), track TE earned
function computeTEEarnedVariableRate(
  currentEggsDelivered: number,
  elrSegments: { startTime: number; endTime: number; elrPerSecond: number }[],
): { teEarned: number; finalEggsDelivered: number }
```

Uses `TE_BREAKPOINTS` and `countTEThresholdsPassed` from `src/lib/truthEggs.ts`.

**Test**: For a known ELR value, verify that `timeToEarnTE` correctly predicts when thresholds from `TE_BREAKPOINTS` are crossed. Test the variable-rate version against a sequence of changing ELRs.

### [x] Step 1.4: Add Manual/Automatic tab toggle to `App.vue`

Add a top-level tab bar with "Manual" and "Automatic" tabs. The Manual tab shows everything that exists today. The Automatic tab shows a new `AutomaticPlanner.vue` shell component.

**Implementation notes**:
- Use a simple reactive `ref<'manual' | 'automatic'>` for the active tab
- The Automatic tab is lazy-loaded (only mount when selected)
- No changes to existing Manual planner behavior

### [x] Step 1.5: Create `src/components/auto/AutomaticPlanner.vue` — Shell

A minimal shell with:
- Player ID input (reuse existing `requestFirstContact` pattern)
- Target TE input (integer, default 490, validated against backup)
- Max Ascensions input (integer, validated)
- Timezone selector (reuse from initial state tab)
- Start time picker
- "Preview" section showing: current TE, TE to gain, max SE cost (from `se-tracker.ts`)
- "Generate" button (disabled, wired up in later phases)

**Test**: Navigate to Automatic tab, enter a player ID, see backup load and preview section populate.

---

## Phase 2: First Shift — C1

### [x] Step 2.1: Create `src/auto/shifts/c1.ts`

Implement the C1 strategy (PLAN.md §8, C1 row):

**Input**: `EngineState`, `SimulationContext`, `timeLimit` (default 1800s)
**Output**: `ShiftResult` (actions + elapsed time + end state)

Algorithm:
1. Identify fleet_size and graviton_coupling research IDs and their tiers
2. Buy cheapest unlocked research to unlock needed tiers (`isTierUnlocked`, `getDiscountedVirtuePrice`)
3. Buy earnings research in ROI order (using extracted ROI function from Step 0.3) if there are quick wins that decrease the time required to buy fleet_size and graviton_coupling. Save enough time to buy as many of these targets as possible before the 30 minute limit.
4. Buy fleet_size research levels
5. Buy graviton_coupling levels
6. Stop when timeLimit is reached

Each purchase: emit a `buy_research` action, deduct cost from bank, advance elapsed time by `price / offlineEarnings`, recompute snapshot.

**Test**: Feed a known backup (high TE player). Verify:
- Output actions are valid `buy_research` actions with correct costs
- Tier unlocking happens in correct order
- Total elapsed time ≤ 30 min
- Fleet_size and graviton_coupling are purchased before earnings research
- Earnings research is in ROI order (not cheapest-first)

### [x] Step 2.2: Create `src/auto/shifts/index.ts` — Shift orchestrator

A function that runs the 13-shift sequence. For now, only C1 is implemented — the rest are stubs that return empty results:

```typescript
function runAscension(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number,    // Unix timestamp
  startTime: number,        // Unix timestamp
): { actions: Action[]; summary: AscensionSummary }
```

**Test**: Run the orchestrator with a known backup. Verify it produces C1 actions and the remaining shifts are no-ops.

### [x] Step 2.3: Wire C1 into `AutomaticPlanner.vue`

When the user clicks "Generate":
1. Build `EngineState` and `SimulationContext` from the loaded backup (similar to how "Plan Future Ascension" mode initializes — see `src/lib/modes/`)
2. Run the shift orchestrator (C1 only)
3. Display the generated actions in a table:
   - Research name, level, cost, time to save, cumulative time
   - Earnings before/after each purchase
   - Total shift duration

**Test**: End-to-end: load a player backup in the Automatic tab, click Generate, see a table of C1 research purchases with timing.

---

## Phase 3: Build Phase Shifts (K1 → K3)

### [x] Step 3.1: Implement `shifts/k1.ts` — First vehicles

K1 strategy (PLAN.md §9):
1. Shift to Kindness (emit shift action, deduct SE)
2. Buy minimum vehicles to get shipping ≥ lay rate
3. Buy largest affordable vehicles/trains with remaining time (≤ 30 min total)

**Test**: After C1, K1 produces vehicle purchases. Shipping capacity ≥ lay rate after minimum purchases.

### [x] Step 3.2: Implement `shifts/i1.ts` — Chicken Universes

I1: Shift to Integrity. Buy at least one intermediate hab to quickly increase earnings from having more chickens, then buy 4 Chicken Universe habs.

**Test**: Output contains intermediate hab purchase actions, followed by 4 `buy_hab` actions for Chicken Universe (hab ID 18).

### [x] Step 3.3: Implement `shifts/c2.ts` — Finish fleet research

C2: Shift back to Curiosity. Finish any remaining fleet_size levels. Buy graviton_coupling, but do not wait more than 4 hours to buy an extra level (you may buy more levels later during C3).

**Test**: After C2, all fleet_size research is maxed. Graviton_coupling is as high as affordable within a 4-hour wait limit per level.

### [x] Step 3.4: Implement `shifts/k2.ts` — Max vehicles

K2: Shift to Kindness. Max all vehicle slots with best vehicles. Max train lengths.

**Test**: After K2, all vehicle slots filled with tier-11 vehicles, max train lengths applied.

### [x] Step 3.5: Implement `shifts/r1.ts` — Silos

R1: Shift to Resilience. Buy as many silos as possible within 1 hour.

**Test**: Silo count increases. Total shift time ≤ 1 hour.

### [x] Step 3.6: Implement `shifts/c3.ts` — Earnings → ELR research

C3 strategy (PLAN.md §8.5):
1. Shift to Curiosity
2. **Step 1**: Buy earnings ROI research using A/B condition matrix
   - A: 70% ROI before next sale start
   - B: 100% ROI before build phase end
   - A+B → buy now; !A+B → queue for sale; !A+!B → skip
   - Edge case: ELR research meeting A+B → buy immediately
3. **Step 2**: At final sale start, buy ELR Impact research (Realistic, Time Efficiency)
4. Track Monday 2× earnings event (recalculate ROI when it activates/deactivates)

**Test**: This is the most complex shift. Test with multiple build phase lengths (1-sale vs 2-sale). Verify:
- A+B research bought immediately
- !A+B research bought at sale prices
- !A+!B research never bought
- ELR research purchased during sale window by time efficiency

### [x] Step 3.7: Implement `shifts/h1.ts` — Artifact swap

H1: Shift to Humility. Switch to optimal ELR artifacts using `getOptimalELRSet()`.

**Test**: Output contains `equip_artifact_set` or `change_artifacts` action. Artifact loadout matches optimal ELR set.

### [x] Step 3.8: Implement `shifts/k3.ts` — Final vehicles + TE wait

K3: Shift to Kindness. Buy any remaining vehicles/trains. Then wait and earn TE.
- Compute max ELR after purchases (this is the ascension's peak ELR)
- Use `computeTEEarned` to determine TE earned during the wait portion

**Test**: After K3 purchases, verify max ELR calculation. Verify TE earned during wait portion matches threshold calculations.

### [x] Step 3.9: Integration test — Full build phase

Run the complete 13-shift sequence (C1→K3 + TE wait stubs) with a known backup. Verify:
- All 13 shift actions emitted with correct SE costs
- Research, vehicles, habs, silos, artifacts all purchased in correct order
- Bank never relied upon (TE ≥ 100 means immediate spending)
- Build phase timing aligns with sale boundaries
- Max ELR computed correctly after K3

---

## Phase 4: TE Earning & Single Ascension

### [ ] Step 4.1: Implement `shifts/te-wait.ts` — TE earning shifts

The final 4 shifts (C4, I2, R2, H2) plus K3's wait portion. Given a target ending TE:
1. Compute total eggs needed across all 5 TE-earning eggs
2. Account for any eggs delivered and TE thresholds passed during the build phase (especially during C3).
3. Distribute remaining waiting time across the 5 shifts based on TE thresholds, ensuring C4 wait time is reduced by eggs already delivered.
4. Track eggs delivered per egg, TE earned per egg
5. Determine total duration to reach target TE

**Test**: For a known max ELR, verify time-to-earn-N-TE matches manual calculation from `TE_BREAKPOINTS`, factoring in eggs delivered during the build phase.

### [ ] Step 4.2: Complete `ascension.ts` — Full single ascension

Combine build phase + TE earning into a complete ascension:
- Input: starting state + build phase length (1 or 2 sales) + target ending TE
- Output: `AscensionSummary` + `Action[]`

**Test**: Generate a complete single ascension. Verify all fields of `AscensionSummary` are populated correctly (timing, TE, SE, ELR, eggs delivered).

### [ ] Step 4.3: Update `AutomaticPlanner.vue` — Show single ascension results

Display the complete ascension:
- Build phase summary (research bought, vehicles, max ELR achieved)
- TE earning breakdown (per-egg TE earned, time per shift)
- Total ascension duration
- SE consumed

---

## Phase 5: Decision Tree

### [ ] Step 5.1: Implement `tree.ts` — Tree builder

Build the decision tree:
1. Start from player's current state
2. For each node, generate branches:
   - 1-sale build vs 2-sale build (Branch Point 1)
   - For each build variant: iterate possible ending TEs in steps of 1, min gain = 10 (Branch Point 2)
3. Apply pruning: skip TE gain < 10, stop at target TE
4. For each branch, create child nodes and recurse up to `maxAscensions` depth

Use the build phase caching optimization: same (timestamp, TE) → same build phase result.

**Test**: Generate a tree for a player going from 175 → 200 TE with max 3 ascensions. Verify:
- Root has 1-sale and 2-sale branches
- Each branch has multiple ending-TE children
- No child gains < 10 TE
- Paths that reach 200 TE terminate
- Build phase is computed once per unique (timestamp, TE) pair

### [ ] Step 5.2: Implement ~300 TE max-ELR collapse

Add detection: at each node, check if all ELR/shipping research is purchasable within a single build phase. If so, collapse to one final long ascension to the target TE.

**Test**: For a player starting at 310 TE, verify the tree produces a single ascension node (no branching).

### [ ] Step 5.3: Tree visualization in `AutomaticPlanner.vue`

Display the decision tree as an interactive table/list:
- Each row = one `AscensionSummary` node
- Columns: ascension #, start TE → end TE, max ELR, duration, SE cost, build type (1/2 sale)
- Expandable: click to see full action list for that ascension
- Path highlighting: select a leaf node to see the full path from root

### [ ] Step 5.4: Path comparison view

Allow selecting 2-3 complete paths and comparing them side-by-side:
- Total duration, total SE cost, TE progression timeline
- Per-ascension breakdown

---

## Phase 6: Export & Polish

### [ ] Step 6.1: Export selected path as plan library

Convert a selected tree path into the standard plan library format (same as what the manual planner exports). This is a list of ascensions, each containing an `Action[]` array.

**Test**: Export a path, import it back into the manual planner via "Load Saved Plan." Verify all actions replay correctly.

### [ ] Step 6.2: Progress indicators

Add progress feedback during generation:
- Progress bar or step counter (currently processing shift X of 13, ascension Y of N)
- Estimated time remaining
- Cancel button

### [ ] Step 6.3: Web Worker offloading

Move the tree generation to a Web Worker so the UI stays responsive during computation. The decision tree builder may take several seconds for deep trees.

### [ ] Step 6.4: Final polish

- Loading states, error handling, edge cases
- Responsive layout for the Automatic tab
- Help text / tooltips explaining the decision tree
- Save/restore auto-plan settings (player ID, target TE, etc.)

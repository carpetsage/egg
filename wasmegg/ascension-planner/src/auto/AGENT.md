# AI Agent Instructions — Auto Planner Module

> **STOP. Read this file before writing any code in this directory.**

## What is this?

This directory contains the **Automatic Ascension Planner** — a multi-ascension decision tree optimizer for the Egg, Inc. ascension planner. It is a complex, multi-phase feature with very specific game logic and constraints.

## Required Reading

Before making ANY code changes in this directory or its subdirectories, you MUST:

1. **Read `PLAN.md` in this directory** — This is the complete feature specification. It contains:
   - The 13-shift ascension template and what each shift does
   - The decision tree branching logic (build phase length + ending TE)
   - The TE ≥ 100 simplification and why it matters
   - The C3 research strategy with its A/B condition matrix
   - The ~300 TE max-ELR collapse optimization
   - SE tracking across ascensions
   - Event calendar (Monday 2× earnings, Friday research sales)
   - The `AscensionSummary` lightweight tree node interface
   - The phased implementation plan

2. **Understand the existing engine** — This module reuses (does NOT duplicate) the existing engine:
   - `src/engine/compute.ts` — `computeSnapshot()` (use with `skipGrowth: true`)
   - `src/engine/apply/actions.ts` — `applyAction()` for pure state transitions
   - `src/calculations/commonResearch.ts` — research pricing, tier unlocking
   - `src/calculations/shippingCapacity.ts` — vehicle/train capacity
   - `src/calculations/layRate.ts` — egg laying rate
   - `src/lib/truthEggs.ts` — TE thresholds and utilities
   - `src/lib/events.ts` — `getNextPacificTime()` for event calendar
   - `src/lib/artifacts/virtue.ts` — `getOptimalELRSet()` for artifact selection
   - `lib/earning_bonus.ts` — `shiftCost()` for SE costs

3. **Do NOT use Pinia stores or Vue composables** — The auto-planner works with pure `EngineState` objects, not reactive store state. All logic must be pure functions that take state in and return state + actions out.

## Key Constraints

- **13 shifts per ascension** (not 12)
- **TE ≥ 100 assumed** — population = hab capacity, earnings = flat rate
- **No fuel tank logic** — pretend it doesn't exist
- **No code duplication** — reuse existing engine with `skipGrowth: true`
- **Memory efficiency** — use `AscensionSummary` for tree nodes, `WeakRef<Action[]>` for full plans
- **SE can go negative** — don't block on insufficient SE

## Architecture Overview

```
src/auto/
  ├── AGENT.md              ← You are here
  ├── PLAN.md               ← Full feature specification
  ├── index.ts              // Entry point
  ├── types.ts              // AscensionSummary, AutoPlanGoal, etc.
  ├── tree.ts               // Decision tree building & pruning
  ├── calendar.ts           // Event schedule helpers
  ├── se-tracker.ts         // SE & shift count tracking
  ├── te-thresholds.ts      // TE threshold crossing calculations
  ├── ascension.ts          // Generate one ascension
  ├── shifts/               // Individual shift strategies
  │   ├── index.ts
  │   ├── c1.ts through te-wait.ts
  └── extract.ts            // Pure functions extracted from UI composables
```

## Known Bugs & Gotchas

### `advanceTime` must manually credit `bankValue` (Fixed 2026-05-14)

**The Bug:** Every shift file has an `advanceTime(seconds)` helper that creates a `wait_for_time` action and applies it via `applyAction()`. However, `applyAction` treats `wait_for_time` as a **no-op** — it returns the engine state completely unchanged (see `src/engine/apply/actions.ts`, lines 219-226). This means `bankValue` is never increased when the simulation "waits."

Meanwhile, `buyVehicle` / `buyResearch` / etc. estimate how long to wait using:

```ts
const timeToSave = (price - bankValue) / offlineEarnings;
advanceTime(timeToSave);
// then deduct price from bankValue
```

Since `advanceTime` didn't credit the bank, `bankValue` went increasingly negative after each purchase. After a few buys, the bank was so deeply negative that even a Trike (cheapest vehicle) appeared unaffordable within the remaining time.

**How it was found:** Console logs showed K1 buying one Hyperloop Train + 4 train cars, then being unable to afford *any* vehicle for the remaining 10 slots — despite having 480 seconds left and a positive earnings rate. The mismatch between "earning money" and "bank never growing" was the tell.

**The Fix:** In every shift file's `advanceTime`, compute the current `offlineEarnings` from a snapshot *before* the wait, then manually credit `bankValue` after `applyAction` returns:

```ts
const advanceTime = (seconds: number) => {
  if (seconds <= 0) return;
  const snap = computeSnapshot(currentState, context, { skipGrowth: true });
  const waitAction = createSimAction('wait_for_time', { totalTimeSeconds: seconds });
  currentState = applyAction(currentState, waitAction);
  // applyAction doesn't update bankValue for wait actions, so we credit earnings manually
  currentState = { ...currentState, bankValue: (currentState.bankValue || 0) + snap.offlineEarnings * seconds };
  actions.push(waitAction as unknown as any);
  elapsedSeconds += seconds;
};
```

**Files affected:** `c1.ts`, `c2.ts`, `k1.ts`, `k2.ts`, `i1.ts`, `r1.ts` — every shift file that uses `advanceTime`. Any future shift files must use this same pattern.

**Why not fix `applyAction` itself?** The `wait_for_time` action is intentionally a no-op in the manual planner's action replay system. The manual planner recalculates state from scratch via `computeSnapshot` at each step, so it doesn't need `applyAction` to track bank accumulation. The auto-planner is the only consumer that needs incremental bank tracking during simulation, so the fix is correctly scoped to the shift helpers rather than changing shared engine behavior.

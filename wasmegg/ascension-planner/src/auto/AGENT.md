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

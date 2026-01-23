# Virtue Companion Library Structure

This document provides a high-level overview of the `virtue-companion/src/lib` directory structure and its modules.

## Directory Layout

```
src/lib/
├── effects/            # Effect calculation implementations
├── farmcalc/           # Farm calculation logic & aggregation
├── artifacts/          # (Implicitly present via imports/data)
├── virtue.ts           # Core Virtue constants & base logic
├── virtue_calculations.ts # Projection & time-to-target math
├── researches.ts       # Research data wrapper
├── index.ts            # Public API exports
└── types.d.ts          # Type definitions
```

## Core Modules

### `virtue.ts`
**Purpose**: Defines the fundamental "physics" of the Virtue dimension.
- **Key Exports**:
    - `TE_BREAKPOINTS`: Array of egg delivery thresholds for Truth Eggs.
    - `pendingTruthEggs()`: Calculates uncollected TE based on delivery interaction.
    - `nextTruthEggThreshold()`: Finds the next milestone.

### `virtue_calculations.ts`
**Purpose**: Predictive math for egg delivery.
- **Key Functions**:
    - `projectEggsLaid()`: Time to reach a target.
    - `projectEggsLaidOverTime()`: Eggs produced in a fixed time.
- **Usage**: Used by UI components to show "Time to next TE" or "Eggs in 24h".

### `researches.ts`
**Purpose**: TypeScript wrapper for `researches.json`.
- **Features**:
    - Typed interfaces for Research objects.
    - Helpers like `getResearchesByCategory()`.
    - Distinguishes between `prices` (Bocks) and `virtue_prices` (Gems).
    - *See [research.md](./research.md) for full details.*

## Subdirectories

### `effects/`
**Purpose**: Individual effect calculators for artifacts and stones. specialized for single attributes.
- `egg_value.ts`: Combines Necklace, Ankh, Shell Stones.
- `away_earnings.ts`: Combines Totem, Lunar Stones.
- `research_price.ts`: Combines Puzzle Cube effects.
- Values are typically returned as simple multipliers (e.g., `1.5` for +50%).

### `farmcalc/`
**Purpose**: holistic farm state calculations. Combines effects, research, and game state.
- **`earnings.ts`**:
    - `farmEarningRate()`: Calculates online/offline bock earning rates.
    - `calculateClothedTE()`: The main KPI for Virtue optimization.
    - `calculateMaxClothedTE()`: Runs the optimizer to find best artifact set.
- **Other files** (`hab_space.ts`, `laying_rate.ts`, etc.): Aggregate bonuses from all sources (Research + Artifacts + Modifiers) to get final farm stats.

## Common Patterns

- **Multipliers**: Most calculating functions return a multiplier where `1.0` is base.
- **Modifiers**: Functions often accept a `Modifiers` object (from `colleggtibles`) to handle event buffs.
- **Backup**: Many top-level functions take the full `ei.IBackup` protobuf object to extract farm and game state.

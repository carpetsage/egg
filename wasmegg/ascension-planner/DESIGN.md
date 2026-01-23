# Ascension Planner - Design Document

## Overview

A web-based planning tool for Egg Inc. players to plan their ascension journey. Players use this to map out which virtue eggs to visit, in what order, what to purchase, how to manage their fuel tank, and when to shift between eggs.

## Core Concepts

### Ascension
- Goal: Earn Eggs of Truth (TE)
- TE are only claimed when the player ends their ascension by "prestiging"
- During an ascension, players cannot gain more Soul Eggs (SE)
- Players are often categorized by ascension count (A1, A2, A3, etc.) and CTE level

### CTE (Clothed TE)
- A rating of player power combining artifacts and TE
- TE gives more earnings and helps get chickens faster
- Used to categorize recommended build orders (e.g., "A2-3 CTE 170-190")

### The 5 Virtue Eggs

Each egg has a unique purpose and purchase category:

| Egg | Purchase Category | Description |
|-----|------------------|-------------|
| **Curiosity** | Research | Helps earn more money, get more chickens, other boosts |
| **Integrity** | Habs (Habitats) | 4 buildings that house chickens. Bigger = more expensive = more capacity |
| **Kindness** | Vehicles | Ships eggs, counting them as "delivered" |
| **Resilience** | Silos | Each silo extends offline time between check-ins |
| **Humility** | Rockets & Artifacts | Send rockets fueled by virtue eggs. Returns artifacts/stones/materials. **Only egg where artifact loadout can be changed** |

### Shifting Between Eggs
- Players can only be on ONE egg at a time
- Shifting costs Soul Eggs (SE) - a limited resource
- Each subsequent shift costs MORE SE than the previous
- Players want to MINIMIZE shifts

### Fuel Tank
- Available on ALL eggs (not just one)
- Stores virtue eggs for future rocket launches on Humility
- Has limited capacity
- Must be managed throughout the ascension

### Rockets (Humility)
- Timed missions using a spaceship
- Fueled by some number of the 5 virtue eggs (from fuel tank)
- After time passes, returns: artifacts, stones, materials
- Materials used for crafting better artifacts

### Artifacts
- Boost various stats: earnings, buying power, shipping, egg value, egg laying rate, etc.
- Can only be changed/equipped while on Humility egg

## App Architecture

### State Model

```typescript
interface AscensionPlan {
  steps: AscensionStep[];
  initialState: PlayerState;
}

interface AscensionStep {
  id: string;
  eggType: VirtueEgg;
  purchases: Purchase[];
  fuelTankActions: FuelTankAction[];
  duration: Duration; // how long to wait before shifting
  artifacts?: ArtifactLoadout; // only for Humility
}

interface PlayerState {
  soulEggs: number;
  shiftsCompleted: number;
  fuelTank: FuelTankState;
  research: ResearchState;
  habs: HabState;
  vehicles: VehicleState;
  silos: SiloState;
  artifacts: ArtifactInventory;
}

type VirtueEgg = 'curiosity' | 'integrity' | 'kindness' | 'humility' | 'resilience';
```

### Component Structure

**Created and implemented:**

Initial state component:
- `InitialStateStep.vue` - Step 0, always present, not draggable. Defines starting conditions:
  - Earnings artifacts (equipped loadout)
  - Starting shifts (how many shifts already used)
  - Starting SE (Soul Eggs)
  - Starting TE (Truth Eggs)
  - Starting date/time
  - Virtue eggs laid (C, I, K, H, R counts)

Step components (in `src/components/steps/`):
- `CuriosityStep.vue` - Research purchases
- `IntegrityStep.vue` - Hab purchases
- `KindnessStep.vue` - Vehicle purchases
- `ResilienceStep.vue` - Silo purchases
- `HumilityStep.vue` - Rocket launches, artifact management

Shared components (in `src/components/`):
- `FuelTank.vue` - Available on all eggs, shows fuel storage
- `StepChain.vue` - Container that chains steps together, handles add/remove/reorder
- `StepCard.vue` - Expand/collapse wrapper for each step with colored badge

**Not yet created:**
- `ShiftCostIndicator.vue` - Shows SE cost of next shift

### Step Labeling

Steps are labeled with egg abbreviation + visit number:
- C = Curiosity, I = Integrity, K = Kindness, H = Humility, R = Resilience

Example: If a player plans CIKCIK, the labels would be:
```
C1 → I1 → K1 → C2 → I2 → K2
```

Each egg type tracks its own visit count independently.

### Data Flow

Steps are chained together. When a step completes:
1. Calculate ending state (purchases made, fuel used, etc.)
2. Pass ending state as starting state to next step
3. Track cumulative shift count for SE cost calculation

```
[Step 1: Curiosity] → state → [Step 2: Humility] → state → [Step 3: Integrity] → ...
```

### Serialization (Import/Export)

Requirements:
- No login/backend - everything client-side
- Players spend hours planning - must be saveable
- Must be shareable (copy/paste friendly)
- Compact encoding for sharing

Implementation:
- Uses Protocol Buffers (protobuf) for compact binary encoding
- Schema defined in `src/lib/schema.proto`
- Full plan state → Protobuf binary → Base64 encoded string
- Import: Base64 → Protobuf decode → restore state

Files:
- `src/lib/schema.proto` - Protobuf schema definition
- `src/lib/schema.js` / `schema.d.ts` - Generated JS/TS from protobuf
- `src/lib/serialization.ts` - Helper functions for encode/decode

Build:
```bash
make proto  # Regenerates schema.js and schema.d.ts from schema.proto
```

Usage:
```typescript
import { encodePlan, decodePlan } from '@/lib/serialization';

// Export
const encoded = encodePlan(steps);

// Import
const steps = decodePlan(encoded);
```

## Number Formatting

Egg Inc uses a specific format for large numbers: 1-3 digits, decimal point, 3 decimal places, then abbreviation.

Example: `123.456Q` = 123.456 Quintillion = 1.23456e20

| Abbrev | Name | Value |
|--------|------|-------|
| M | Million | 1e6 |
| B | Billion | 1e9 |
| T | Trillion | 1e12 |
| q | Quadrillion | 1e15 |
| Q | Quintillion | 1e18 |
| s | Sextillion | 1e21 |
| S | Septillion | 1e24 |
| o | Octillion | 1e27 |
| N | Nonillion | 1e30 |
| d | Decillion | 1e33 |
| U | Undecillion | 1e36 |
| D | Duodecillion | 1e39 |
| Td | Tredecillion | 1e42 |
| qd | Quattuordecillion | 1e45 |
| Qd | Quindicillion | 1e48 |
| sd | Sexdecillion | 1e51 |
| Sd | Septendecillion | 1e54 |
| Od | Octodecillion | 1e57 |
| Nd | Novemdecillion | 1e60 |
| V | Vigintillion | 1e63 |
| uV | Unvigintillion | 1e66 |
| dV | Duovigintillion | 1e69 |
| tV | Tresvigintillion | 1e72 |

## Open Questions

- [ ] What are the exact SE costs per shift? (formula or table?)
- [ ] What is the fuel tank capacity?
- [ ] What research options exist on Curiosity?
- [ ] What are the hab tiers/costs on Integrity?
- [ ] What vehicles exist on Kindness?
- [ ] What silo options exist on Resilience?
- [ ] What rockets/artifacts exist on Humility?
- [ ] How do artifacts affect the calculations?
- [ ] Should we show projected TE earnings?

## Future Considerations

- Could add optimization suggestions
- Could calculate optimal shift order
- Could integrate with other wasmegg tools for player data import

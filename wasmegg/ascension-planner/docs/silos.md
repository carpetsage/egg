# Silos Module

## Location

```
lib/farm/silos.ts
```

## Overview

This module handles silo calculations for Egg Inc. farms. Silos extend your away/offline time, allowing the farm to continue running while you're not actively playing. It provides:

- Away time calculations based on silos owned and research
- Silo purchase cost calculations
- Duration formatting utilities

## Importing

```typescript
import { siloCapacityResearches, siloMinutes, nextSiloCost, awayTimePerSilo, totalAwayTime, formatSiloDuration } from 'lib';
// Or specifically:
import { siloCapacityResearches, siloMinutes, nextSiloCost, awayTimePerSilo, totalAwayTime, formatSiloDuration } from 'lib/farm/silos';
```

## Core Concepts

### Base Away Time

- Each silo provides **60 minutes** of base away time
- The "Silo Capacity" epic research adds **+6 minutes per level** to each silo
- Total away time = `silosOwned * (60 + siloCapacityLevel * 6)`

### Silo Cost Formula

The cost of purchasing the next silo follows an exponential formula:

```
Cost = 100,000,000 * n^(3n + 15)
```

Where `n` is the current number of silos owned.

| Silos Owned | Next Silo Cost |
|-------------|----------------|
| 0 | Free (first silo) |
| 1 | 100M |
| 2 | ~1.31T |
| 3 | ~2.95Q |
| ... | (exponentially increasing) |

## Silo Capacity Research

| Research ID | Name | Max Level | Per Level |
|-------------|------|-----------|-----------|
| `silo_capacity` | Silo Capacity | 20 | +6 minutes |

This is an **epic research** that applies to all farms.

## Functions

### `siloCapacityResearches(farm: Farm): ResearchInstance[]`

Returns the current level of silo capacity research.

```typescript
const farm = new Farm(backup, farmIndex);
const researches = siloCapacityResearches(farm);
// researches[0].level = current silo capacity level
```

### `siloMinutes(farm: Farm, researches: ResearchInstance[]): number`

Calculates total away time in minutes for a farm.

```typescript
const researches = siloCapacityResearches(farm);
const awayTime = siloMinutes(farm, researches);
// Returns total minutes of away time
```

**Calculation:** `(60 + siloCapacityLevel * 6) * silosOwned`

### `nextSiloCost(silosOwned: number): number`

Calculates the cost of purchasing the next silo.

```typescript
const cost = nextSiloCost(currentSilosOwned);
// Returns cost in bocks (regular currency)
```

**Note:** Returns 0 if `silosOwned <= 0` (first silo is free).

### `awayTimePerSilo(siloCapacityLevel: number): number`

Calculates away time contribution per silo in minutes.

```typescript
const minutesPerSilo = awayTimePerSilo(epicResearchLevel);
// Returns 60 + level * 6
```

### `totalAwayTime(silosOwned: number, siloCapacityLevel: number): number`

Calculates total away time without needing a Farm object.

```typescript
const totalMinutes = totalAwayTime(3, 10);
// 3 silos * (60 + 10*6) = 3 * 120 = 360 minutes = 6 hours
```

### `formatSiloDuration(minutes: number): string`

Formats duration in minutes to a human-readable string.

```typescript
formatSiloDuration(360);  // "6h"
formatSiloDuration(150);  // "2h 30m"
formatSiloDuration(45);   // "0h 45m"
```

## Usage in Ascension Planner

### Displaying Silo Information on Resilience Step

```typescript
import { totalAwayTime, formatSiloDuration, nextSiloCost, formatEIValue } from 'lib';

// Show current away time
const silosOwned = 3;
const siloCapacityLevel = 10;
const awayMinutes = totalAwayTime(silosOwned, siloCapacityLevel);
console.log(`Away time: ${formatSiloDuration(awayMinutes)}`);
// Output: "Away time: 6h"

// Show cost of next silo
const cost = nextSiloCost(silosOwned);
console.log(`Next silo costs: ${formatEIValue(cost)}`);
```

### Tracking Silos in Plan State

```typescript
interface ResilienceStepState {
  silosOwned: number;
  siloCapacityLevel: number; // Epic research level (from initial state)
}

// Calculate away time for planning
function getAwayTime(state: ResilienceStepState): string {
  const minutes = totalAwayTime(state.silosOwned, state.siloCapacityLevel);
  return formatSiloDuration(minutes);
}

// Calculate cumulative silo cost
function totalSiloCost(fromSilos: number, toSilos: number): number {
  let total = 0;
  for (let i = fromSilos; i < toSilos; i++) {
    total += nextSiloCost(i);
  }
  return total;
}
```

### Away Time Table

| Silos | Base (no research) | Max Research (lvl 20) |
|-------|-------------------|----------------------|
| 1 | 1h | 3h |
| 2 | 2h | 6h |
| 3 | 3h | 9h |
| 4 | 4h | 12h |
| 5 | 5h | 15h |
| 10 | 10h | 30h |

## Related Files

- `lib/farm/farm.ts` - Farm class with silo ownership data
- `lib/farm/internal_hatchery.ts` - IHR affects what happens during away time
- `lib/farm/population.ts` - Population growth during away time

# Population Module

## Location

```
lib/farm/population.ts
```

## Overview

This module provides utility functions for calculating chicken population over time. It helps determine:

- Current population based on time elapsed since last save
- Time remaining until habs are full ("hab lock")

## Importing

```typescript
import { calculateCurrentPopulation, calculateTimeToHabLock } from 'lib';
// Or specifically:
import { calculateCurrentPopulation, calculateTimeToHabLock } from 'lib/farm/population';
```

## Core Concepts

### Population Growth

Population grows linearly based on Internal Hatchery Rate (IHR):
```
newPopulation = oldPopulation + (IHR * timeElapsed)
```

Population is capped at total hab space (can't exceed capacity).

### Hab Lock

"Hab lock" occurs when population reaches maximum hab capacity. At this point:
- No more chickens can spawn
- IHR is effectively wasted
- Player should either prestige or upgrade habs

## Functions

### `calculateCurrentPopulation(lastRefreshedPopulation, offlineIHR, currentTimestamp, lastRefreshedTimestamp, totalHabSpace): number`

Estimates current population based on time elapsed since last save.

```typescript
const currentPop = calculateCurrentPopulation(
  1_000_000_000,    // lastRefreshedPopulation: 1B chickens at last save
  100_000,          // offlineIHR: 100K chickens/minute total
  Date.now(),       // currentTimestamp: now
  lastSaveTime,     // lastRefreshedTimestamp: when backup was made
  10_000_000_000    // totalHabSpace: 10B max capacity
);
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lastRefreshedPopulation` | number | Chicken count at last backup |
| `offlineIHR` | number | Offline IHR in chickens/minute (total, not per hab) |
| `currentTimestamp` | number | Current time in milliseconds |
| `lastRefreshedTimestamp` | number | Backup time in milliseconds |
| `totalHabSpace` | number | Maximum hab capacity |

**Returns:** Estimated current population (capped at hab space)

**Calculation:**
```typescript
// Growth based on time elapsed
growth = (offlineIHR / 60_000) * (currentTimestamp - lastRefreshedTimestamp)
// Note: dividing by 60,000 converts from /minute to /millisecond

// Result is capped at hab space
result = Math.min(
  lastRefreshedPopulation + growth,
  Math.max(lastRefreshedPopulation, totalHabSpace)
)
```

### `calculateTimeToHabLock(totalHabSpace, currentPopulation, ihr): number`

Calculates time in seconds until habs are full.

```typescript
const secondsToLock = calculateTimeToHabLock(
  10_000_000_000,   // totalHabSpace: 10B capacity
  5_000_000_000,    // currentPopulation: 5B chickens
  100_000           // ihr: 100K chickens/minute
);

const hoursToLock = secondsToLock / 3600;
console.log(`Hab lock in ${hoursToLock.toFixed(1)} hours`);
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `totalHabSpace` | number | Maximum hab capacity |
| `currentPopulation` | number | Current chicken count |
| `ihr` | number | Internal hatchery rate in chickens/minute |

**Returns:** Time in seconds until hab lock (0 if already at capacity)

**Calculation:**
```typescript
chickensNeeded = totalHabSpace - currentPopulation
timeInSeconds = (60 * chickensNeeded) / ihr
// Note: multiplying by 60 converts from minutes to seconds
```

## Usage in Ascension Planner

### Estimating Current State

```typescript
import {
  calculateCurrentPopulation,
  internalHatcheryChickensPerMinutePerHab,
  internalHatcheryRateResearches,
  habList,
  habSpaceList,
  habSpaceResearches
} from 'lib';

// Get IHR
const ihrResearches = internalHatcheryRateResearches(farm);
const ihr = internalHatcheryChickensPerMinutePerHab(farm, ihrResearches);

// Get hab space
const habs = habList(farm);
const habResearches = habSpaceResearches(farm);
const habCapacities = habSpaceList(farm, habs, habResearches);
const totalHabSpace = habCapacities.reduce((a, b) => a + b, 0);

// Calculate total offline IHR (away IHR * number of habs)
const totalOfflineIHR = ihr.away * habs.length;

// Estimate current population
const currentPop = calculateCurrentPopulation(
  farm.numChickens,
  totalOfflineIHR,
  Date.now(),
  backup.settings!.lastBackupTime! * 1000,
  totalHabSpace
);
```

### Planning Hab Upgrades

```typescript
import { calculateTimeToHabLock, formatSiloDuration } from 'lib';

// Check if current habs are sufficient
const timeToLock = calculateTimeToHabLock(totalHabSpace, currentPop, totalIHR);
const minutesToLock = timeToLock / 60;

if (minutesToLock < awayTimeMinutes) {
  console.log('Warning: Habs will fill before silo time runs out!');
  console.log(`Time to hab lock: ${formatSiloDuration(minutesToLock)}`);
  console.log(`Away time: ${formatSiloDuration(awayTimeMinutes)}`);
  console.log('Consider upgrading habs on Integrity.');
}
```

### Tracking Population in Plan State

```typescript
interface PlanState {
  // From initial state or calculated
  population: number;
  totalHabSpace: number;
  activeIHR: number;  // chickens/min total
  awayIHR: number;    // chickens/min total
}

// Simulate population after a step
function simulatePopulationGrowth(
  state: PlanState,
  durationMinutes: number,
  isAway: boolean
): number {
  const ihr = isAway ? state.awayIHR : state.activeIHR;
  const growth = ihr * durationMinutes;
  return Math.min(state.population + growth, state.totalHabSpace);
}
```

### Calculating Optimal Check-in Times

```typescript
// Find when to check in to avoid wasting IHR
function optimalCheckInTime(
  currentPop: number,
  habSpace: number,
  awayIHR: number,
  siloMinutes: number
): number {
  const timeToLockMinutes = calculateTimeToHabLock(habSpace, currentPop, awayIHR) / 60;

  // Check in at whichever comes first: hab lock or silo empty
  return Math.min(timeToLockMinutes, siloMinutes);
}
```

## Related Files

- `lib/farm/internal_hatchery.ts` - IHR calculation
- `lib/farm/hab_space.ts` - Hab capacity calculation
- `lib/farm/silos.ts` - Away time limits
- `lib/farm/farm.ts` - Farm class with `numChickens` property

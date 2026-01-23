# Internal Hatchery Module

## Location

```
lib/farm/internal_hatchery.ts
```

## Overview

This module calculates Internal Hatchery Rate (IHR) for Egg Inc. farms. The internal hatchery automatically spawns new chickens over time, both while actively playing and while away. It provides:

- Active and away IHR calculations
- Support for additive and multiplicative research
- Separate handling of offline-only bonuses

## Importing

```typescript
import { internalHatcheryRateResearches, internalHatcheryChickensPerMinutePerHab } from 'lib';
// Or specifically:
import { internalHatcheryRateResearches, internalHatcheryChickensPerMinutePerHab } from 'lib/farm/internal_hatchery';
```

## Core Concepts

### IHR Units

- IHR is measured in **chickens per minute per hab**
- Total IHR = `chickensPerMinutePerHab * numberOfHabs`
- With 4 habs, if IHR is 1000/min/hab, you get 4000 chickens/minute total

### Research Types

IHR research comes in two types:

1. **Additive (base rate)**: Adds flat chickens/min/hab
2. **Multiplicative**: Multiplies the base rate

The calculation is:
```
IHR = (sum of additive research) * (product of multiplicative research) * artifactMultiplier
```

### Active vs Away

Some research only applies while offline (away):

- **Active IHR**: Base rate * active multipliers * artifacts
- **Away IHR**: Active IHR * away-only multipliers

Away IHR is always >= Active IHR due to "Internal Hatchery Calm" epic research.

## Internal Hatchery Research

### Additive Research (Base Rate)

| Research ID | Name | Max Level | Per Level | Max Contribution |
|-------------|------|-----------|-----------|------------------|
| `internal_hatchery1` | Internal Hatcheries | 10 | +2/min | +20/min |
| `internal_hatchery2` | Internal Hatchery Upgrades | 10 | +5/min | +50/min |
| `internal_hatchery3` | Internal Hatchery Expansion | 15 | +10/min | +150/min |
| `internal_hatchery4` | Internal Hatchery Expansion | 30 | +25/min | +750/min |
| `internal_hatchery5` | Machine Learning Incubators | 250 | +5/min | +1,250/min |
| `neural_linking` | Neural Linking | 30 | +50/min | +1,500/min |

**Maximum base rate:** 20 + 50 + 150 + 750 + 1,250 + 1,500 = **3,720/min/hab**

### Multiplicative Research

| Research ID | Name | Max Level | Per Level | Max Multiplier | Applies To |
|-------------|------|-----------|-----------|----------------|------------|
| `epic_internal_incubators` | Epic Int. Hatcheries | 20 | +5% | 2.0x | Active + Away |
| `int_hatch_calm` | Internal Hatchery Calm | 20 | +10% | 3.0x | Away only |

**Note:** Both are epic researches.

### Maximum IHR

- **Active:** 3,720 * 2.0 = 7,440/min/hab (before artifacts)
- **Away:** 3,720 * 2.0 * 3.0 = 22,320/min/hab (before artifacts)

## Functions

### `internalHatcheryRateResearches(farm: Farm): InternalHatcheryRateResearchInstance[]`

Returns the current levels of all IHR-related researches.

```typescript
const farm = new Farm(backup, farmIndex);
const researches = internalHatcheryRateResearches(farm);
// Returns array of research instances with levels
```

### `internalHatcheryChickensPerMinutePerHab(farm, researches): { active: number; away: number }`

Calculates IHR for both active play and away time.

```typescript
const researches = internalHatcheryRateResearches(farm);
const ihr = internalHatcheryChickensPerMinutePerHab(farm, researches);

console.log(`Active IHR: ${ihr.active}/min/hab`);
console.log(`Away IHR: ${ihr.away}/min/hab`);
```

**Returns:**
```typescript
{
  active: number,  // Chickens/min/hab while playing
  away: number     // Chickens/min/hab while offline
}
```

**Calculation:**
```typescript
baseRate = sum of (level * perLevel) for additive researches
activeMultiplier = product of (1 + level * perLevel) for non-offline multiplicative researches
awayMultiplier = product of (1 + level * perLevel) for offline-only multiplicative researches
artifactsMultiplier = farm.artifactSet.internalHatcheryRateMultiplier

active = baseRate * activeMultiplier * artifactsMultiplier
away = active * awayMultiplier
```

## Usage in Ascension Planner

### Displaying IHR Information

```typescript
import { internalHatcheryRateResearches, internalHatcheryChickensPerMinutePerHab, formatEIValue } from 'lib';

const researches = internalHatcheryRateResearches(farm);
const ihr = internalHatcheryChickensPerMinutePerHab(farm, researches);

// Total IHR with 4 habs
const numHabs = 4;
const totalActiveIHR = ihr.active * numHabs;
const totalAwayIHR = ihr.away * numHabs;

console.log(`Active: ${formatEIValue(totalActiveIHR)} chickens/min`);
console.log(`Away: ${formatEIValue(totalAwayIHR)} chickens/min`);
```

### Calculating Time to Fill Habs

```typescript
import { calculateTimeToHabLock } from 'lib/farm/population';

const totalHabSpace = 10_000_000_000; // 10B capacity
const currentPopulation = 1_000_000_000; // 1B chickens
const totalIHR = ihr.away * 4; // 4 habs, using away IHR

const secondsToFill = calculateTimeToHabLock(totalHabSpace, currentPopulation, totalIHR);
const hoursToFill = secondsToFill / 3600;
console.log(`Time to hab lock: ${hoursToFill.toFixed(1)} hours`);
```

### Tracking IHR Research in Plan State

```typescript
interface CuriosityStepState {
  // Additive IHR research
  ihrResearch: {
    internal_hatchery1: number;
    internal_hatchery2: number;
    internal_hatchery3: number;
    internal_hatchery4: number;
    internal_hatchery5: number;
    neural_linking: number;
  };
}

// Calculate base IHR from research state
function getBaseIHR(state: CuriosityStepState): number {
  const researches = [
    { perLevel: 2, level: state.ihrResearch.internal_hatchery1 },
    { perLevel: 5, level: state.ihrResearch.internal_hatchery2 },
    { perLevel: 10, level: state.ihrResearch.internal_hatchery3 },
    { perLevel: 25, level: state.ihrResearch.internal_hatchery4 },
    { perLevel: 5, level: state.ihrResearch.internal_hatchery5 },
    { perLevel: 50, level: state.ihrResearch.neural_linking },
  ];
  return researches.reduce((sum, r) => sum + r.perLevel * r.level, 0);
}
```

### Planning IHR Upgrades

```typescript
// Priority order for IHR research (best value per gem)
const ihrResearchPriority = [
  'neural_linking',        // +50/min/level - best value
  'internal_hatchery4',    // +25/min/level
  'internal_hatchery3',    // +10/min/level
  'internal_hatchery5',    // +5/min/level (but 250 levels!)
  'internal_hatchery2',    // +5/min/level
  'internal_hatchery1',    // +2/min/level - worst value
];
```

## Related Files

- `lib/farm/farm.ts` - Farm class with research and artifact handling
- `lib/farm/population.ts` - Uses IHR to calculate population over time
- `lib/farm/hab_space.ts` - Hab capacity limits population growth
- `lib/farm/silos.ts` - Away time determines how long IHR runs offline
- `lib/artifacts/effects.ts` - `internalHatcheryRateMultiplier` from artifacts

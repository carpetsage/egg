# Hab Space Module

## Location

```
lib/farm/hab_space.ts
```

## Overview

This module handles habitat (hab) calculations for Egg Inc. farms. It provides:

- A complete list of all 19 hab types with their stats
- Functions to calculate total hab space based on purchased habs and research
- Cost data for both normal and virtue mode

## Importing

```typescript
import { habTypes, habList, habSpaceList, habSpaceResearches, isHabId } from 'lib';
// Or specifically:
import { habTypes, habList, habSpaceList, habSpaceResearches } from 'lib/farm/hab_space';
```

## Data Structures

### `Hab` Interface

```typescript
interface Hab {
  id: HabId;           // 0-18
  name: string;        // Display name (e.g., "Chicken Universe")
  iconPath: string;    // Asset path (e.g., "egginc/ei_hab_icon_chicken_universe.png")
  baseHabSpace: number; // Base chicken capacity before research/artifacts
  normalCost?: number[]; // Cost array [1st, 2nd, 3rd, 4th] for normal mode
  virtueCost?: number[]; // Gem cost array [1st, 2nd, 3rd, 4th] for virtue mode
}
```

### `habTypes` Array

Complete list of all 19 habs, ordered by tier:

| ID | Name | Base Capacity | Virtue Cost (1st) |
|----|------|---------------|-------------------|
| 0 | Coop | 250 | Free |
| 1 | Shack | 500 | 917 |
| 2 | Super Shack | 1,000 | 7,664 |
| 3 | Short House | 2,000 | 46,272 |
| 4 | The Standard | 5,000 | 420,445 |
| 5 | Long House | 10,000 | 6.34M |
| 6 | Double Decker | 20,000 | 98.2M |
| 7 | Warehouse | 50,000 | 2.97B |
| 8 | Center | 100,000 | 147.5B |
| 9 | Bunker | 200,000 | 4.09T |
| 10 | Eggkea | 500,000 | 172.4T |
| 11 | HAB 1000 | 1M | 9.91q |
| 12 | Hangar | 2M | 284.7q |
| 13 | Tower | 5M | 12.01Q |
| 14 | HAB 10,000 | 10M | 794.8Q |
| 15 | Eggtopia | 25M | 56.6s |
| 16 | Monolith | 50M | 10.93S |
| 17 | Planet Portal | 100M | 5.69o |
| 18 | Chicken Universe | 600M | 52.5N |

### Virtue Cost Array

Each hab's `virtueCost` is an array of 4 numbers representing the cost to buy the 1st, 2nd, 3rd, and 4th instance of that hab:

```typescript
// Example: Chicken Universe
virtueCost: [5.2512e31, 3.89347e32, 1.579e33, 4.64e33]
// 1st costs 52.5N gems
// 2nd costs 389.3N gems
// 3rd costs 1.58d gems
// 4th costs 4.64d gems
```

**Important:** Buying cheaper/lower habs does NOT reduce the cost of higher habs. Each hab tier has its own independent cost progression.

## Hab Space Research

The module tracks 4 researches that affect hab capacity:

| Research ID | Name | Max Level | Per Level | Notes |
|-------------|------|-----------|-----------|-------|
| `hab_capacity1` | Hen House Remodel | 8 | +5% | All habs |
| `microlux` | Microlux Chicken Suites | 10 | +5% | All habs |
| `grav_plating` | Grav Plating | 25 | +2% | All habs |
| `wormhole_dampening` | Wormhole Dampening | 25 | +2% | Portal habs only (id >= 17) |

## Functions

### `habList(farm: Farm): Hab[]`

Returns the list of habs currently purchased on a farm.

```typescript
const farm = new Farm(backup, farmIndex);
const habs = habList(farm);
// Returns array of Hab objects for purchased habs
```

**Note:** Hab ID `19` is a placeholder for unpurchased hab slots and is filtered out.

### `habSpaceResearches(farm: Farm): HabSpaceResearchInstance[]`

Returns the current levels of all hab-space-related researches on a farm.

```typescript
const researches = habSpaceResearches(farm);
// Returns array with current level of each relevant research
```

### `habSpaceList(farm: Farm, habs: Hab[], researches: HabSpaceResearchInstance[]): number[]`

Calculates the actual capacity of each hab, accounting for:
- Research multipliers (universal and portal-only)
- Artifact set bonuses

```typescript
const habs = habList(farm);
const researches = habSpaceResearches(farm);
const capacities = habSpaceList(farm, habs, researches);
// Returns array of actual capacities for each hab
// Total hab space = capacities.reduce((a, b) => a + b, 0)
```

The calculation:
1. Universal multiplier = product of (1 + level * perLevel) for non-portal researches
2. Portal-only multiplier = product of (1 + level * perLevel) for portal researches
3. Each hab capacity = `ceil(baseHabSpace * universalMultiplier * [portalMultiplier if portal hab] * artifactMultiplier)`

### `isHabId(x: number): x is HabId`

Type guard to check if a number is a valid hab ID (0-18).

```typescript
if (isHabId(habId)) {
  const hab = habTypes[habId];
}
```

## Usage in Ascension Planner

### Displaying Hab Options on Integrity Step

```typescript
import { habTypes, iconURL, formatEIValue } from 'lib';

// Show all habs as purchase options
habTypes.forEach(hab => {
  console.log(`${hab.name}: ${formatEIValue(hab.baseHabSpace)} capacity`);
  console.log(`Icon: ${iconURL(hab.iconPath, 64)}`);
  console.log(`Costs: ${hab.virtueCost?.map(c => formatEIValue(c)).join(', ')}`);
});
```

### Calculating Cumulative Costs

```typescript
// Calculate total cost to buy 4x of a specific hab
function totalHabCost(hab: Hab, count: number): number {
  if (!hab.virtueCost) return 0;
  return hab.virtueCost.slice(0, count).reduce((a, b) => a + b, 0);
}

// Calculate cost to upgrade from current habs to target habs
function upgradeCost(currentHabs: Hab[], targetHab: Hab, slotIndex: number): number {
  // Since cheaper habs don't reduce cost, just return the virtue cost for this slot
  return targetHab.virtueCost?.[slotIndex] || 0;
}
```

### Tracking Purchased Habs in Plan State

```typescript
interface IntegrityStepState {
  // Array of 4 hab IDs (0-18), or null for unpurchased slots
  habs: [HabId | null, HabId | null, HabId | null, HabId | null];
}

// Get total gem cost for current hab configuration
function calculateHabCost(habs: (HabId | null)[]): number {
  return habs.reduce((total, habId, slotIndex) => {
    if (habId === null) return total;
    const hab = habTypes[habId];
    return total + (hab.virtueCost?.[slotIndex] || 0);
  }, 0);
}
```

## Related Files

- `lib/farm/farm.ts` - Farm class with research and artifact handling
- `lib/artifacts/effects.ts` - Artifact multiplier calculations
- `lib/units.ts` - `formatEIValue` for displaying large numbers

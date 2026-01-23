# Laying Rate Module

## Location

```
lib/farm/laying_rate.ts
```

## Overview

This module calculates egg laying rate for Egg Inc. farms. The laying rate determines how many eggs your chickens produce per second, which directly affects your income. It provides:

- Base laying rate calculations
- Research multiplier effects
- Per-chicken and total farm laying rates

## Importing

```typescript
import { eggLayingRateResearches, layableEggsPerChickenPerSecond, layableEggsPerSecond } from 'lib';
// Or specifically:
import { eggLayingRateResearches, layableEggsPerChickenPerSecond, layableEggsPerSecond } from 'lib/farm/laying_rate';
```

## Core Concepts

### Base Laying Rate

- Each chicken lays **1 egg per 30 seconds** by default
- Base rate = `1/30 = 0.0333...` eggs per second per chicken
- Research and artifacts multiply this base rate

### Multiplicative Stacking

All laying rate researches stack **multiplicatively**:

```
finalRate = baseRate * (1 + r1) * (1 + r2) * (1 + r3) * ... * artifactMultiplier
```

## Laying Rate Research

| Research ID | Name | Max Level | Per Level | Max Bonus |
|-------------|------|-----------|-----------|-----------|
| `comfy_nests` | Comfortable Nests | 50 | +10% | +500% |
| `hen_house_ac` | Hen House A/C | 50 | +5% | +250% |
| `improved_genetics` | Improved Genetics | 30 | +15% | +450% |
| `time_compress` | Time Compression | 20 | +10% | +200% |
| `timeline_diversion` | Timeline Diversion | 50 | +2% | +100% |
| `relativity_optimization` | Relativity Optimization | 10 | +10% | +100% |
| `epic_egg_laying` | Epic Comfy Nests | 20 | +5% | +100% |

**Note:** `epic_egg_laying` is an epic research that applies globally.

### Maximum Research Multiplier

With all researches maxed:
```
(1 + 5.0) * (1 + 2.5) * (1 + 4.5) * (1 + 2.0) * (1 + 1.0) * (1 + 1.0) * (1 + 1.0)
= 6.0 * 3.5 * 5.5 * 3.0 * 2.0 * 2.0 * 2.0
= 2,772x multiplier
```

## Functions

### `eggLayingRateResearches(farm: Farm): EggLayingRateResearchInstance[]`

Returns the current levels of all laying rate researches on a farm.

```typescript
const farm = new Farm(backup, farmIndex);
const researches = eggLayingRateResearches(farm);
// Returns array of research instances with current levels
```

### `layableEggsPerChickenPerSecond(farm: Farm, researches: EggLayingRateResearchInstance[]): number`

Calculates the egg laying rate per chicken per second.

```typescript
const researches = eggLayingRateResearches(farm);
const ratePerChicken = layableEggsPerChickenPerSecond(farm, researches);
// Returns eggs/second/chicken
```

**Calculation:**
```
baseRate * Π(1 + research.level * research.perLevel) * artifactMultiplier
```

### `layableEggsPerSecond(farm: Farm, researches: EggLayingRateResearchInstance[]): number`

Calculates the total egg laying rate for the entire farm.

```typescript
const researches = eggLayingRateResearches(farm);
const totalRate = layableEggsPerSecond(farm, researches);
// Returns total eggs/second for the farm
```

**Calculation:** `numChickens * layableEggsPerChickenPerSecond`

## Usage in Ascension Planner

### Displaying Laying Rate

```typescript
import { eggLayingRateResearches, layableEggsPerChickenPerSecond, formatEIValue } from 'lib';

const researches = eggLayingRateResearches(farm);
const ratePerChicken = layableEggsPerChickenPerSecond(farm, researches);

// Convert to eggs per minute for display (more intuitive)
const eggsPerMinute = ratePerChicken * 60;
console.log(`Each chicken lays ${formatEIValue(eggsPerMinute)} eggs/min`);
```

### Calculating Research Effects

```typescript
// Simulate adding research levels
function calculateLayingRateWithResearch(
  baseRate: number,
  researches: { perLevel: number; level: number }[]
): number {
  return researches.reduce(
    (rate, r) => rate * (1 + r.perLevel * r.level),
    baseRate
  );
}

// Example: What's my laying rate if I buy 10 more levels of Comfortable Nests?
const currentResearches = [...]; // from eggLayingRateResearches
const comfyNests = currentResearches.find(r => r.id === 'comfy_nests');
comfyNests.level += 10;
const newRate = calculateLayingRateWithResearch(1/30, currentResearches);
```

### Checking for Shipping Bottleneck

```typescript
import {
  layableEggsPerSecond,
  vehicleShippableEggsPerSecondList,
  eggLayingRateResearches,
  vehicleList,
  shippingCapacityResearches
} from 'lib';

// Get laying rate
const layingResearches = eggLayingRateResearches(farm);
const layingRate = layableEggsPerSecond(farm, layingResearches);

// Get shipping capacity
const vehicles = vehicleList(farm);
const shippingResearches = shippingCapacityResearches(farm);
const shippingRates = vehicleShippableEggsPerSecondList(farm, vehicles, shippingResearches);
const totalShipping = shippingRates.reduce((a, b) => a + b, 0);

// Check bottleneck
if (totalShipping < layingRate) {
  console.log('Shipping bottleneck! Upgrade vehicles on Kindness.');
} else {
  console.log('Shipping is sufficient.');
}
```

### Tracking Research in Plan State

```typescript
interface CuriosityStepState {
  // Track laying rate research purchases
  layingRateResearch: {
    comfy_nests: number;
    hen_house_ac: number;
    improved_genetics: number;
    time_compress: number;
    timeline_diversion: number;
    relativity_optimization: number;
  };
}

// Calculate multiplier from research state
function getLayingRateMultiplier(state: CuriosityStepState): number {
  const researches = [
    { perLevel: 0.10, level: state.layingRateResearch.comfy_nests },
    { perLevel: 0.05, level: state.layingRateResearch.hen_house_ac },
    { perLevel: 0.15, level: state.layingRateResearch.improved_genetics },
    { perLevel: 0.10, level: state.layingRateResearch.time_compress },
    { perLevel: 0.02, level: state.layingRateResearch.timeline_diversion },
    { perLevel: 0.10, level: state.layingRateResearch.relativity_optimization },
  ];
  return researches.reduce((mult, r) => mult * (1 + r.perLevel * r.level), 1);
}
```

## Related Files

- `lib/farm/farm.ts` - Farm class with chicken count
- `lib/farm/shipping_capacity.ts` - Shipping must keep up with laying rate
- `lib/artifacts/effects.ts` - `eggLayingRateMultiplier` from artifacts
- `lib/farm/population.ts` - Chicken count affects total laying rate

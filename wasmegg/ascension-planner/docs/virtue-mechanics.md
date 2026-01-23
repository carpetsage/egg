# Virtue Mechanics

This document details the core mathematical mechanics of the Virtue Companion, specifically regarding Truth Eggs (TE), Clothed TE (CTE), and egg production projections.

## Location

```typescript
src/lib/virtue.ts              // TE breakpoints and base calculations
src/lib/virtue_calculations.ts // Projections and time-based calculations
src/lib/farmcalc/earnings.ts   // Clothed TE (CTE) calculation
```

## Truth Eggs (TE)

**Truth Eggs** are the primary prestige currency in the Virtue dimension.

### Base Count & Breakpoints

The number of "base" Truth Eggs is determined by how many eggs you have delivered compared to a fixed list of breakpoints.

- **Breakpoints**: There are ~100 hardcoded delivery thresholds starting at 50M eggs and scaling up to 36.55Q eggs.
- **Base Passed**: The count of breakpoints your total eggs delivered has exceeded.

```typescript
// src/lib/virtue.ts
export const TE_BREAKPOINTS = [
  5e7, // 50M
  1e9, // 1B
  ...,
  3.655e19 // 36.55Q
];
```

### Pending Truth Eggs

Calculated as `Base Passed - Earned TE`. This represents TE you "should" have based on delivery but haven't collected yet (or have effectively spent/lost, depending on context, though usually it tracks progress towards the next TE).

## Clothed TE (CTE)

**Clothed TE** is a derived metric that represents your *effective* Truth Egg count when factoring in all multiplier bonuses. It harmonizes various earning bonuses into a single "Truth Egg equivalent" number to allow for easy comparison.

### The Formula

Since 1 Truth Egg provides a 1.1x multiplicative bonus to earnings (`1.1^TE`), we can convert any multiplier $M$ into an equivalent number of Truth Eggs $TE_{equiv}$ using logarithms:

$$ TE_{equiv} = \frac{\ln(M)}{\ln(1.1)} $$

The final Clothed TE is:
$$ CTE = \text{Actual Truth Eggs} + TE_{equiv} $$

### Components of the Multiplier

The total multiplier $M$ is composed of:

1.  **Egg Value**: From artifacts like Demeter's Necklace, Tungsten Ankh, and Shell Stones.
2.  **Away Earnings**: From Lunar Totem and Lunar Stones.
    *   *Note*: Standard permit players suffer a 50% penalty here (0.5x multiplier).
3.  **Research Discount**: From Puzzle Cube and Epic Research (Lab Upgrade).
    *   Converted to an earnings boost equivalent: $\text{Effect} = 1 / \text{PriceMultiplier}$.
    *   e.g., A 50% discount (0.5 cost) is equal to 2x earnings.
4.  **Colleggtible Modifiers**: Current active event buffs vs. their maximum possible values.
    *   Penalties are applied if your current modifiers are lower than the maximum possible (e.g., if you don't have the max earnings buff active).

### Calculation Logic (`calculateClothedTE`)

```typescript
// Simplified logic from src/lib/farmcalc/earnings.ts

// 1. Gather Multipliers
const eggValueMult = eggValueMultiplier(artifacts);
const awayEarningsMult = awayEarningsMultiplier(artifacts);
const researchDiscountMult = 1 / (artifactResearchPrice * epicResearch * eventModifier);

// 2. Apply Penalties/Adjustments
const permitMult = isStandardPermit ? 0.5 : 1.0;
const earningsPenalty = currentEarningsBuff / maxEarningsBuff;
const awayPenalty = currentAwayBuff / maxAwayBuff;
// ... similar penalty for research cost ...

// 3. Combine
const totalMultiplier = eggValueMult * awayEarningsMult * researchDiscountMult *
                        permitMult * penalties...;

// 4. Convert to TE
const multiplierAsTE = Math.log(totalMultiplier) / Math.log(1.1);
const clothedTE = truthEggs + multiplierAsTE;
```

## Projections

The module provides tools to project egg delivery over time, considering population growth and hatching rates.

### `projectEggsLaid`

Estimates the time required to reach a target egg count.

- **Inputs**: Current population, laying rate, shipping capacity, internal hatchery rate (IHR), and target amount.
- **Logic**:
    - Calculates effective laying rate (capped by shipping).
    - Models population growth (capped by hab space).
    - Solves for time $t$ where integral of laying rate equals target.
    - Handles two phases:
        1.  **Growth Phase**: Population is increasing (quadratic egg gain).
        2.  **Maxed Phase**: Population is stable at hab cap (linear egg gain).

### `projectEggsLaidOverTime`

Calculates total eggs laid after a given duration $t$.

- **Logic**: Inverse of `projectEggsLaid`. Given time $t$, calculates volume of eggs produced, accounting for the dynamic population growth curve.

# Design Doc: Colleggtibles and the CTE Metric

## Overview
This document explains how **Colleggtibles** (collectible items from limited-run events) factor into the mathematical model of the Ascension Planner, specifically within the **Clothed Truth Egg (CTE)** calculation.

## What are Colleggtibles?
Colleggtibles are permanent collection items that provide passive, stackable bonuses to various game dimensions. In the Ascension Planner's underlying library, they are tracked via several dimensions:
- `EARNINGS` (Cash multiplier)
- `AWAY_EARNINGS` (Offline bonus)
- `EGG_LAYING_RATE` (Laying speed)
- `SHIPPING_CAPACITY` (Truck capacity)
- `RESEARCH_COST` (Discount on common research)

## The "Normalizing" Philosophy
Unlike standard game calculations that simply add up bonuses, the Ascension Planner uses Colleggtibles to **normalize player progress**. 

Because Colleggtibles are time-gated (some players have them all, others have none), the "Clothed TE" metric treats the **maximum possible set of Colleggtibles** as the baseline (1.0). If a player is missing a Colleggtible, they receive a **penalty** to their effective score.

This allows a high-level player from 2024 to be compared fairly against a high-level player from 2026; if the 2026 player has higher raw stats just because more Colleggtibles were released, the CTE metric will "clothe" the 2024 player with theoretical bonuses (or penalize the 2026 player for missing any) to keep the comparison about raw Truth Egg effort.

## Mathematical Integration

### 1. Penalty Calculation
For each dimension, the app calculates a penalty ratio:
$$ Penalty_{Dimension} = \frac{Player's\ Current\ Modifier}{Maximum\ Possible\ Modifier} $$

*Example: If the max earnings bonus from all released Colleggtibles is 1.5x, and a player only has 1.2x, they receive a $1.2 / 1.5 = 0.8x$ penalty to their earnings multiplier.*

### 2. Research Discount Conversion
Research discounts are converted into an "effective earnings boost" to be comparable with other multipliers.
$$ Effect_{Research\ Discount} = \frac{1}{Research\ Price\ Multiplier} $$

The penalty is calculated as:
$$ Penalty_{Research} = \frac{Player's\ Effective\ Boost}{Max\ Possible\ Effective\ Boost} $$

### 3. Total Multiplier ($M$)
The total multiplier used to calculate Clothed TE is the product of all artifact bonuses, permit adjustments, and Colleggtible penalties:
$$ M = Multiplier_{Artifacts} \times Multiplier_{Permit} \times Penalty_{Earnings} \times Penalty_{Away} \times Penalty_{Research} $$

### 4. Conversion to Truth Egg Equivalent
Since Truth Eggs provide a stackable $1.1x$ earnings multiplier, the total multiplier $M$ is converted back into an "equivalent number of Truth Eggs" ($TE_{equiv}$) using a Logarithm base 1.1:
$$ TE_{equiv} = \frac{\ln(M)}{\ln(1.1)} $$

The final **Clothed TE** is:
$$ CTE = Raw\ Truth\ Eggs + TE_{equiv} $$

## Implementation Details
- **Location**: `src/lib/farmcalc/earnings.ts`
- **Key Function**: `allModifiersFromColleggtibles(backup)` extracts current stats from the User's save file.
- **Maximums**: `maxModifierFromColleggtibles(dimension)` uses a hardcoded catalog (likely in `src/lib/catalog.json` or the shared common library) to determine what the absolute limits are at the current point in time.

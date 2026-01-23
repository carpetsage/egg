# Earnings Calculations

This document outlines the formulas and logic used to calculate egg value and offline earnings (gems/s) during an ascension.

## Overview

Earnings in the Ascension Planner are calculated in three stages:
1.  **Egg Value**: The base value of a single egg.
2.  **Online Baseline**: The rate of earnings while the game is open and active.
3.  **Offline Earnings**: The final rate of earnings while away, which is the primary metric for virtue progression.

---

## 1. Egg Value

The value of a single egg is determined by common research and artifact multipliers.

### Formula
$$ \text{Egg Value} = \text{Base Value} \times \prod (\text{Additive Research Groups}) \times \prod (\text{Multiplicative Researches}) \times \text{Artifact Multiplier} $$

### Components
*   **Base Value**: Always 1 for virtue calculation purposes.
*   **Additive Research Groups**: Groups of research that add together before multiplying the total (e.g., Nutritional Supplements: $1 + \text{level} \times 0.25$).
*   **Multiplicative Researches**: Major research tiers that act as independent compound multipliers (e.g., USDE Prime: $3.0^\text{level}$).
*   **Artifact Multiplier**: The combined bonus from **Necklaces**, **Ankhs**, and **Shell Stones**.

---

## 2. Online Baseline

The online baseline determines the maximum amount of money being generated before "Away" bonuses or penalties are applied.

### Formula
$$ \text{Online Baseline} = \text{Egg Value} \times \min(\text{Laying Rate}, \text{Shipping Capacity}) \times \text{Truth Egg Bonus} \times \text{Colleggtible Earnings Mod} $$

### Components
*   **Laying Rate**: Total chickens multiplied by the laying rate per chicken (adjusted by research/artifacts).
*   **Shipping Capacity**: Total fleet capacity (adjusted by research/artifacts).
*   **Truth Egg Bonus**: The primary progression multiplier. Calculated as $1.1^\text{Total Truth Eggs}$.
*   **Colleggtible Earnings Mod**: Global multiplier from earnings-type Colleggtibles.

---

## 3. Offline Earnings (The Goal)

Offline earnings are the final value used for purchasing research, habs, and vehicles during a visit.

### Formula
$$ \text{Offline Earnings} = \text{Online Baseline} \times \text{Permit Penalty} \times \text{Artifact Away Multiplier} \times \text{Colleggtible Away Mod} $$

### Components
*   **Permit Penalty**: 
    *   **Pro Permit**: $1.0\times$ (No penalty)
    *   **Standard Permit**: $0.5\times$ (50% penalty)
*   **Artifact Away Multiplier**: The combined bonus from **Lunar Totems** and **Lunar Stones**.
*   **Colleggtible Away Mod**: Global multiplier from away-earnings-type Colleggtibles.

---

## Logic Hierarchy

When the planner simulates a step, it uses the following order of operations:

1.  **Resolve Artifacts**: Identify the equipped Loadout.
2.  **Calculate Modifiers**: Aggregate all common/epic research, artifacts, and Colleggtibles into a single set of dimension multipliers (e.g., `modifiers.earnings`, `modifiers.awayEarnings`).
3.  **Calculate Rate**: Compute the `Online Baseline`.
4.  **Apply Away Logic**: Apply the offline-specific rewards and penalties to arrive at the final gem income per second.

## Related Modules
*   `lib/farmcalc/egg_value.ts`: Common research logic.
*   `lib/farmcalc/earnings.ts`: Main orchestrator for rates.
*   `lib/effects/virtue_effects.ts`: Artifact specific multipliers for virtue.

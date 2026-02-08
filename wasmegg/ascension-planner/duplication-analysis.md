# Duplication Analysis: Ascension Planner

This document identifies areas of code duplication within the `ascension-planner` codebase and proposes a plan for deduplication and unification.

## 1. Cost Calculation Logic

### Findings
Multiple files implement identical or nearly identical logic for calculating discounted prices based on base price, epic research levels, and colleggtible multipliers.

*   **Files:**
    *   `src/lib/vehicles.ts`: `getVehicleCostMultiplier`, `getDiscountedVehiclePrice`
    *   `src/lib/habs.ts`: `getHabCostMultiplier`, `getDiscountedHabPrice`
    *   `src/calculations/commonResearch.ts`: `calculateCostMultiplier`, `getDiscountedVirtuePrice`

### Duplicated Logic
The core formula is consistently:
```javascript
multiplier = (1 - (0.05 * epicResearchLevel)) * colleggtibleMultiplier * (optionalArtifactMultiplier)
discountedPrice = Math.floor(basePrice * multiplier)
```

### Recommendation
Create a shared pricing utility (e.g., `src/utils/pricing.ts`) with generic functions:
*   `calculateCostMultiplier(epicLevel: number, otherMultipliers: number[]): number`
*   `applyDiscount(basePrice: number, multiplier: number): number`

## 2. Research Multiplier Logic

### Findings
Several calculation modules implement the same linear scaling logic for research effects.

*   **Files:**
    *   `src/calculations/shippingCapacity.ts`: `calculateResearchMultiplier`
    *   `src/calculations/habCapacity.ts`: `calculateResearchMultiplier`
    *   `src/calculations/layRate.ts`: `calculateResearchMultiplier`
    *   `src/calculations/internalHatcheryRate.ts`: `calculateResearchContribution` (partial overlap)

### Duplicated Logic
The standard linear effect formula:
```javascript
const clampedLevel = Math.min(level, research.maxLevel);
return 1 + (research.perLevel * clampedLevel);
```

### Recommendation
Create a shared research utility (e.g., `src/utils/research.ts`):
*   `calculateLinearEffect(level: number, maxLevel: number, perLevel: number, base: number = 1): number`
*   `clampLevel(level: number, maxLevel: number): number` (to also handle the repeated `Math.min(Math.max(0, level), max)` logic)

## 3. Research Data Structure Transforming

### Findings
Each calculation file imports the raw `allResearches` from `lib` and iterates over it to create slightly different but largely overlapping local interfaces.

*   **Files:**
    *   `src/calculations/habCapacity.ts`
    *   `src/calculations/shippingCapacity.ts`
    *   `src/calculations/layRate.ts`
    *   `src/calculations/internalHatcheryRate.ts`

### Duplicated Logic
Each file performs a `.filter(...).map(...)` operation to transform raw JSON data into a typed object with `{ id, name, description, maxLevel, perLevel, ... }`.

### Recommendation
*   Define a core `BaseCalculationResearch` interface in `src/types/index.ts` that includes common fields.
*   Consider a central `ResearchRegistry` or helper function to extract these subsets to avoid repetitive boilerplate mapping code.

## 4. Formatting

### Findings
While `src/lib/format.ts` exists, there is potential for ad-hoc formatting logic in components.

*   **Observed:** `ShiftActions.vue` previously contained ad-hoc duration formatting (now fixed).
*   **Recommendation:** strictly enforce usage of `formatNumber`, `formatDuration`, and `formatMultiplier` from `src/lib/format.ts`. Remove any local helper functions in components that duplicate this logic.

## 5. Math Utilities

### Findings
*   Clamping logic (`Math.max(0, Math.min(level, max))`) is scattered throughout calculation files.
*   Rounding logic (e.g., `Math.floor` for prices, `Math.ceil` for capacity) is repeated.

### Recommendation
*   Add `clamp(value, min, max)` to a math utility.

## Action Plan

1.  **Create `src/utils` directory**: To house shared logic.
2.  **Extract Math/Research Utils**: Implement `clamp`, `calculateLinearEffect` in `src/utils/math.ts` or `src/utils/research.ts`.
3.  **Refactor Calculations**: Update `habCapacity.ts`, `shippingCapacity.ts`, `layRate.ts` to use new utils.
4.  **Extract Pricing Utils**: Implement generic pricing logic.
5.  **Refactor Libs**: Update `vehicles.ts` and `habs.ts` to use pricing utils.
6.  **Verify**: Ensure no regression in values via tests or manual verification.

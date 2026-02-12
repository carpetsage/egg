# Plan: Smart Buy Research Views

This plan outlines the implementation of multiple viewing and sorting modes for common research in `ResearchActions.vue`.

## 1. Refactor: Reusable `ResearchItem` Component

Refactor the research item display logic from `ResearchActions.vue` into a new component `src/components/actions/ResearchItem.vue`.

**Props:**
- `research`: `CommonResearch`
- `currentLevel`: `number`
- `price`: `number`
- `timeToBuy`: `string`
- `canBuy`: `boolean`
- `extraStats`: `string` (Optional, for ROI/ELR impact display)
- `showMax`: `boolean`
- `showBuyToHere`: `boolean` (For "Cheapest First" view)

**Events:**
- `buy`: Single purchase
- `max`: Max purchase
- `buyToHere`: Bulk purchase up to this item

## 2. Updated State in `ResearchActions.vue`

Add a new `view` state to `ResearchActions.vue`:
- `view`: `'game' | 'cheapest' | 'roi' | 'elr'` (default: `'game'`)

## 3. Implementation of Views

### A. Game View (Default)
Matches current behavior: grouped by tier, shows locked tiers. No changes to the logic.

### B. Cheapest First View
- **Logic**:
    - Flatten all unpurchased research into individual levels (e.g., 50 rows for 50 levels).
    - **Iterative Construction**:
        1. Start with `currentSimulationTotal = totalPurchases`.
        2. Sort all remaining research levels by `price`.
        3. Maintain a `pool` of pending levels that are currently locked by tier.
        4. Iterate through the sorted list. For each level:
            - If its tier is unlocked by `currentSimulationTotal`, add it to the display list and increment `currentSimulationTotal` by 1.
            - If it's locked, add it to the `pool`.
            - After adding a level, re-check the `pool` to see if any previously skipped (cheaper) levels are now unlocked. If so, insert them immediately at the current position in the display list.
    - **Visual Indicators**: Insert "Tier X Unlock" dividers in the list where cumulative purchases reached the threshold.
- **"Buy to Here" Button**:
    - Enabled if all preceding rows in the sorted list can be purchased.
    - Performs bulk purchase of exactly one level for every preceding row (including the selected one).

### C. Earnings ROI View
- **Logic**:
    - For each currently available research (unlocked tiers only):
        - Simulate purchasing one level.
        - Calculate `deltaEarnings = newOfflineEarnings - currentOfflineEarnings`.
        - If `deltaEarnings <= 0`, skip.
        - `ROI_Seconds = Price / deltaEarnings`.
    - Sort ascending by `ROI_Seconds` (Shortest payback time first). Unlocked researches are displayed above locked ones.
    - Display ROI using `formatDuration`.
- **Update Behavior**: Recalculate list whenever a research is purchased (to account for shipping caps or other interacting effects).

### D. ELR Impact View
- **Logic**:
    - Evaluate each research based on its **Relative Potential Maximum Impact**.
    - Assume the player has maxed all *other* categories (e.g., has 4 Chicken Universes, Hyperloop trains, and all Hyperloop cars currently available through research).
    - **Formulas**:
        - **Fleet Size (+1 vehicle)**: `1 / currentMaxSlots`. (e.g., 4 → 5 is 25%).
        - **Train Length (+1 car)**: `1 / currentMaxCars`. (e.g., 5 → 6 is 20%).
        - **Lay Rate / Hab Cap**: `Relative Change = (NewMultiplier - OldMultiplier) / OldMultiplier`.
            - For linear research: `perLevel / (1 + currentLevel * perLevel)`.
    - Sort descending by `% impact`. Unlocked researches (from unlocked tiers) are always displayed above locked ones.
    - **Mathematical Note**: Because all artifact and research effects in Egg Inc are **multiplicative contributors** to the final total (including Compass and Metronome multipliers), the *relative* gain of an upgrade remains consistent regardless of which artifacts are equipped. A 2% Lay Rate research bonus always provides a 2% increase to total Lay Rate, even if an artifact is multiplying that total by 2x or 10x.
    - **Bottleneck Handling**: In this "Potential Max" scenario, we look at the raw relative benefit to the research's specific category (Lay Rate, Shipping, or Hab Cap). If a research increases shipping capacity by 20%, it is treated as a 20% impact even if the player is currently Lay Rate limited, because it increases the player's *theoretical ceiling*.
- **Update Behavior**: Recalculate list on every purchase.

### E. Category Filtering
- **Logic**:
    - Both **Earnings ROI** and **ELR Impact** views exclude research belonging to specific non-impactful categories.
    - **Excluded Categories**: `hatchery_capacity`, `internal_hatchery_rate`, `running_chicken_bonus`, and `hatchery_refill_rate`.
    - This declutters the lists by removing upgrades that have no influence on the primary metrics being optimized.

## 4. Interaction Consistency
- Purchasing in any view updates the action history.
- `actionsStore.effectiveSnapshot` provides the source of truth, ensuring all views sync instantly.
- Undo operations in action history will naturally update all views through the reactive store.

## 5. UI Layout
- Add a "Sort by" header with tabs for the 4 views.
- Reuse the research item component across all views with appropriate props.

## 6. Next Steps (to be done AFTER plan approval)
1. Create `ResearchItem.vue`.
2. Update `ResearchActions.vue` with tabs and state.
3. Implement `cheapest`, `roi`, and `elr` computed lists.
4. Add bulk purchase logic for "Buy to Here".

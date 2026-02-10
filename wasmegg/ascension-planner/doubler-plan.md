# Doubler Plan

This plan documents the changes required to add an "Assume Double Earnings" toggle to the Ascension Planner, affecting earnings calculations and import/export functionality.

## 1. Type Definitions Updates
**File:** `src/types/index.ts`

- Update `EarningsInput` interface to include:
  ```typescript
  videoDoublerMultiplier: number;
  ```
- Update `EarningsOutput` interface to include:
  ```typescript
  videoDoublerMultiplier: number;
  ```

## 2. Store Updates
**File:** `src/stores/initialState.ts`

- Update `InitialStateStoreState` interface:
  - Add `assumeDoubleEarnings: boolean;`
- Update `state()` function:
  - Initialize `assumeDoubleEarnings: true`
- Update `actions`:
  - Add `setAssumeDoubleEarnings(enabled: boolean)` action.
  - Update `hydrate(data: any)` to read `assumeDoubleEarnings` from data (default to true if missing).
  - Update `clear()` to reset `assumeDoubleEarnings` to `true`.

## 3. Calculation Logic Updates
**File:** `src/calculations/earnings.ts`

- Update `calculateEarnings` function:
  - Destructure `videoDoublerMultiplier` from input.
  - Apply the multiplier to `onlineEarnings`:
    `baseEarnings * fireworkMultiplier * videoDoublerMultiplier`
  - Apply the multiplier to `offlineEarnings`:
    `baseEarnings * fireworkMultiplier * awayEarningsMultiplier * artifactAwayMultiplier * videoDoublerMultiplier`
  - Return `videoDoublerMultiplier` in the output object.

**File:** `src/composables/useEarnings.ts`

- Update `useEarnings` composable:
  - Read `assumeDoubleEarnings` from `initialStateStore`.
  - Pass `videoDoublerMultiplier: initialStateStore.assumeDoubleEarnings ? 2 : 1` in the input payload to `calculateEarnings`.

## 4. UI Updates
**File:** `src/components/presenters/InitialStateDisplay.vue`

- Add prop: `assumeDoubleEarnings: boolean`
- Add emit: `set-assume-double-earnings: [enabled: boolean]`
- Add UI Toggle Control:
  - Location: In "Ascension Settings", just below the "Soul Eggs" input.
  - Component: A standard slide toggle (checkbox style) with label "Assume Double Earnings".
  - Description: "2x earnings from video doubler or ultra always-on double earnings".
  - Default: On (controlled by prop).

**File:** `src/components/ActionHistory.vue` (Parent Component)

- Pass `assumeDoubleEarnings` from store to `InitialStateDisplay`.
- Handle `set-assume-double-earnings` event by calling store action.

## 5. Import/Export Updates
**File:** `src/stores/actions.ts`

- Update `exportPlan()`:
  - Include `assumeDoubleEarnings: initialStateStore.assumeDoubleEarnings` inside the `initialState` object in the export JSON.
  - This ensures it's saved with the plan.

- `importPlan()`:
  - No changes needed in `actions.ts` if `initialStateStore.hydrate` handles it correctly, as `importPlan` passes the `initialState` object to `hydrate`.

## Execution Steps

1.  **Types**: Modify `src/types/index.ts`.
2.  **Store**: Modify `src/stores/initialState.ts`.
3.  **Calculations**: Modify `src/calculations/earnings.ts` and `src/composables/useEarnings.ts`.
4.  **UI**: Modify `src/components/presenters/InitialStateDisplay.vue` and `src/components/ActionHistory.vue`.
5.  **Export**: Modify `src/stores/actions.ts`.

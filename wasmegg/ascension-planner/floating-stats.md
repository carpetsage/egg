# Execution Plan: Floating Stats & Shift Naming

## Overview
This plan implements two related features:
1.  **Shift Naming**: Renaming shifts in the Action History to use a shorthand based on egg type and visit count (e.g., C1, C2, H1).
2.  **Floating Stats Panel**: A new floating component that displays key stats (snapshot) for the currently edited shift (or the final state if not editing).

## 1. Shift Naming (ActionHistory & ActionGroup)

The goal is to replace "Shift to [EggName]" with "[EggLetter][VisitCount]" (e.g., "Shift to Dilithium" -> "D1").

### 1.1. Logic for Visit Counts
Refactor `ActionHistory.vue`'s `groupedActions` computation.
- Iterate through the groups.
- Maintain a counter for each `VirtueEgg`.
- For each group (Start or Shift), increment the counter for the egg type of that group.
- Store this `visitCount` in the `GroupItem` interface.

### 1.2. Update ActionGroup
- **File**: `src/components/ActionGroup.vue`
- **Props**: Add `visitCount` (number) prop.
- **Computed**: Update `headerText` to use the new naming convention.
  - Format: `${EggName[0]}${visitCount}` (e.g., "C1", "H2").
  - Note: Maybe keep the full name as a subtitle or tooltip, but the requirement specifically says "replace it with the new name". We will assume strict replacement but might add the full name back in a subtle way if it looks too cryptic. *Update: User said "replace it", so we will replace the main text.*

## 2. Floating Stats Panel

A new component to display the stats of the "effective" state.

### 2.1. Create Component
- **File**: `src/components/FloatingStats.vue`
- **Position**: Fixed position, right side of the screen (e.g., `fixed right-4 top-1/2 -translate-y-1/2`).
- **Styling**: Small, unobtrusive, stacked vertically. Glassmorphism or simple card style.

### 2.2. Data Source
- Use `useActionsStore`.
- **Snapshot**: `actionsStore.effectiveSnapshot`. This provides `elr`, `layRate`, `shippingCapacity`, `offlineEarnings`, etc.
- **Current Shift Info**:
  - Requires looking up the "active group" (either `editingGroupId` or the last group if null).
  - Compute the "Shift Name" (e.g., C1, H2) similar to logic in ActionHistory, but specifically for the effective state.

### 2.3. Display Elements
- **Shift Name**: (Calculated above)
- **Egg Icon**: Based on `snapshot.currentEgg`.
- **Active Set**: `snapshot.activeArtifactSet` (Display "ELR" or "Earnings" badge).
- **Stats**:
  - Lay Rate (`snapshot.layRate` -> format per hour)
  - Shipping (`snapshot.shippingCapacity` -> format per hour)
  - ELR (`snapshot.elr` -> format per hour)
  - Offline (`snapshot.offlineEarnings` -> format per hour)
- **Time Unit**: Ensure all rates are displayed as "/hr" as requested is explicit. The store state might be in seconds.
- **Info Icon**: Button to trigger the full details modal (reuses `showCurrentDetails` logic from App.vue).

### 2.4. Integration
- **File**: `src/App.vue`
- Import and mount `FloatingStats`.
- Pass necessary event handlers (e.g., `@show-details="showCurrentDetails"`).

## 3. Implementation Steps

1.  **Modify `ActionHistory.vue`**: Calculate and pass `visitCount` to `ActionGroup`.
2.  **Modify `ActionGroup.vue`**: Update header text logic.
3.  **Create `FloatingStats.vue`**: Implement the layout and data mapping.
    - Implement the logic to determine the current shift name (C1, H2) based on `actionsStore.actions` and `effectiveSnapshot`.
4.  **Update `App.vue`**: Add `<FloatingStats />`.

## 4. Verification
- Verify that headers in the list show C1, C2, etc. correctly.
- Verify that the floating panel updates when:
  - Switching between "Edit" modes of different shifts.
  - Adding new actions that change stats.
  - Shifting to a new egg.
- Verify that the floating panel shows values matching the "Calculation Details" modal.

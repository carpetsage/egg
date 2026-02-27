# Remaining "Complex" any-casts Report

This report summarizes the final 14 instances of `any` type casting remaining in the `ascension-planner` project. These cases involve complex logic related to external data parsing, simulation state, and action logic.

## Summary of Remaining Fixes

| Category | Instances | Context | Plan |
| :--- | :---: | :--- | :--- |
| **External Data** | 8 | Backup (Protobuf) parsing and store hydration. | Use `ei.IBackup` and related types from `lib/proto`. |
| **Simulation State** | 3 | "What-if" simulations in research views. | Define a `PartialAction` type for temporary simulate calls. |
| **Action Logic** | 3 | Generic action inputs in stores. | Define an `ActionInput` type for unprocessed actions. |

---

## Detailed Locations

### 1. External Data & Backups (8 Instances)

These instances are primarily in stores and utilities that handle raw player data from the Egg, Inc. game backups (Protobuf format).

*   **File:** `src/stores/initialState.ts`
    *   **Line 167:** `backup: any` in `loadFromBackup`.
    *   **Line 294:** `(h: any)` in hab state mapping.
    *   **Line 309:** `(v: any)` in vehicle state mapping.
    *   **Line 431:** `hydrate(data: any)` standard Pinia hydration hook.
*   **File:** `src/lib/artifacts/utils.ts`
    *   **Line 110:** `backup: any` in `getArtifactLoadoutFromBackup`.
    *   **Line 119:** `new Map<any, any>(...)` and `(item: any)` for inventory mapping.
*   **File:** `src/lib/artifacts/virtue.ts`
    *   **Line 102:** `(item: any)` in inventory item map callback.
    *   **Line 111:** `(s: any)` in stone mapping.

### 2. Simulation & Calculation State (3 Instances)

These are used in the ROI and cheapest-first research views to calculate hypothetical state changes.

*   **File:** `src/composables/useResearchViews.ts`
    *   **Line 359:** `tempAction as any` when calculating ROI.
    *   **Line 413:** `} as any` in bottleneck pair simulation.
    *   **Line 422:** `} as any` in bottleneck pair simulation.
    *   *(Note: Line 210 `result: any[]` was previously identified but should be typed as part of this group).*

### 3. Action Logic & Inputs (3 Instances)

These involve the "front door" of the action system where actions are first received from the UI.

*   **File:** `src/stores/actions/index.ts`
    *   **Line 138:** `pushAction(action: any)` input parameter.
    *   **Line 372:** `insertAction(action: any)` and `_replayCallback?: any` parameters.

---

## Technical Strategy

1.  **Standardize Protobuf Typing**: Replace `any` in backup loaders with `import { ei } from 'lib/proto'`. We will use `ei.IBackup` for the core backup object and `ei.ArtifactDB.IInventoryItem` for artifact logic.
2.  **Generic Action Interface**: Create a `DraftAction` or `ActionInput` type in `src/types/actions/meta.ts` that contains the minimal fields required by the stores (`type`, `payload`, `dependsOn`, etc.) before they are fully processed into a complete `Action`.
3.  **Simulation Type Hardening**: Update the research views to use properly typed temporary action objects instead of generic `any` casts when calling `applyAction`.

---
*Updated: 2026-02-26*

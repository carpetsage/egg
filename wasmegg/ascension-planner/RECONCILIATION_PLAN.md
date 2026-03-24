# Reconciliation Framework: Action Completeness Documentation

This document outlines the completeness criteria for all action types within the Ascension Planner reconciliation flow. It highlights which actions are currently implemented ("easy") and provides criteria for the remaining action types, along with a plan for a robust, maintainable evaluation framework.

## 1. Currently Audited Actions (Implemented)
These actions are already integrated into the reconciliation flow. They are considered completed if the current farm state meets or exceeds the target specified in the action.

- **`start_ascension`**: Completed if any farm data is present for a virtue egg.
- **`shift`**: Completed if all individual actions within that shift are either unaudited (`na`) or completed.
- **`buy_research`**: Completed if the common research level is `>=` the target level.
- **`buy_hab`**: Completed if the hab ID in the specified slot is `>=` the target hab ID.
- **`buy_vehicle`**: Completed if the vehicle ID in the specified slot is `>=` the target vehicle ID.
- **`buy_train_car`**: Completed if the hyperloop train length is `>=` the target length.
- **`buy_silo`**: Completed if the total number of silos owned is `>=` the target count.
- **`wait_for_te`**: Completed if the Truth Eggs earned or theoretically possible from deliveries is `>=` the target TE.
- **`wait_for_full_habs`**: Completed if the current chicken population is `>=` the target hab capacity, the player's current egg matches the shift's target egg.



## 2. Implementation Plan: Evaluation Framework

The goal is to transition from a massive switch statement in `actions/index.ts` to a modular, strategy-based system that is easy to extend and test.

### Phase 1: Stratification
Introduce a `ReconciliationStrategy` interface and a registry in a new utility file (e.g., `@/lib/actions/reconciliation.ts`).

```typescript
// Proposed interface
export interface ReconciliationContext {
  farm: CurrentFarmState;
  initialState: InitialStateStoreState;
  events: ActiveEvent[];
}

export type ReconstructionResult = 'completed' | 'pending' | 'na';

export interface ActionReconciliationStrategy<T extends ActionType = ActionType> {
  evaluate(action: Action<T>, context: ReconciliationContext): ReconstructionResult;
}
```

### Phase 2: Registry Implementation
Move the existing "easy" logic into dedicated strategy classes/objects. This keeps `actions/index.ts` clean and allows each strategy to handle its own complex logic (like TE calculation).

### Phase 3: Context Enrichment
Ensure the reconciliation flow has access to **Temporal Markers** to track progress across "Wait for Time" actions relative to the initial backup timestamp (identifying which actions have technically passed their simulated completion time).


### Phase 4: UI & UX Refinements
Enhance the user interface to provide better visibility and control during the reconciliation flow.

1.  **Reconciliation Status Banner**:
    - **Position**: Add a new banner at line 203 of `App.vue`, placed directly above the 2x earnings event element.
    - **Aesthetics**: Follow the "Earnings Boost" event card design (glassmorphism/gradient) but use an **emerald/green theme** (`from-emerald-50/80 via-white to-green-50/80`).
    - **Features**:
        - **Reload Backup Button**: Implement a `handleRefreshReconcile` function that:
            1. Fetches the latest player backup via `requestFirstContact`.
            2. Saves it to the database.
            3. Loads it into the `initialStateStore` using the `'reconcile'` mode.
            4. Updates `reconcileFarmState`, `reconcileEggsDelivered`, and `reconcileTeEarned` in the `actionsStore`.
        - **Incomplete Only Toggle**: Move the slide toggle for `showIncompleteOnly` into this banner (right side).
    - **Visibility**: The banner must only be visible when `actionsStore.isReconciling` is true.

2.  **Toggle Consolidation**:
    - Remove the original "Incomplete Only" slide toggle component from the "Reconcile Plan" action card (lines 155-169 in `App.vue`) to eliminate UI redundancy.

### Phase 5: Manual Overrides & Persistence
Provide a way to manually acknowledge completion of "Unaudited" (na) actions.

1.  **Manual Completion UI**:
    - **Restriction**: Manual checking is strictly limited to actions with an `na` status. Actions that the system can audit (research, habs, etc.) will use their system-determined status as the source of truth.
    - **Visual Integration**: For `na` actions, the standard "N/A" label is replaced by a functional checkbox or interactive indicator.
    - **Tooltip**: The manual element includes a "Not Audited" tooltip to clarify its purpose and origin.
    - **Space Efficiency**: The checkbox maintains the same vertical and horizontal footprint as the standard status labels, ensuring a consistent and clean UI in the action history.
    - **Integration**: If "Incomplete Only" is enabled, checking the box immediately marks the action as `completed` for the current view and hides it.

2.  **Segregated Persistence**:
    - Use `localStorage` or the existing IndexedDB structure to remember manual overrides.
    - **Plan Segregation**: Key manual status data by `planId` to ensure that overrides for one plan do not affect others.
    - **Refresh Resilience**: Ensure manual overrides are restored automatically upon page reload or re-loading a saved plan from the library.

---

## 3. Maintenance & Scalability
- **Adding New Actions**: Simply register a new strategy in the registry.
- **UI Decoupling**: The status colors (`completed`, `pending`, `na`) remain simple enums, but the logic underlying them is now isolated and unit-testable.
- **Progressive Reconciliation**: Allow actions to partially reconcile if data is missing but circumstantial evidence (like later actions being done) suggests they were finished.

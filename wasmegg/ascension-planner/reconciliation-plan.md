# Implementation Plan: Reconciliation Feature

This plan outlines the steps to implement a "Reconcile" feature in the Ascension Planner. This feature allows players to upload a planned ascension (JSON file) and compare it against their current in-game state (from an EID backup), providing visual indicators of which actions have been completed.

## 1. UI Updates in `App.vue`

Add a new "Reconcile" option in the main action buttons grid, located after "Continue Current Ascension".

### Changes:
- Add a fourth button card in the initial grid.
- Requirements for reconciliation:
  - `playerId` must be provided in the form.
  - A plan file (`.json`) must be uploaded.
- Implementation of `handleReconcile`:
  - Fetch the latest backup for the EID.
  - Read the uploaded JSON plan file.
  - Set the `actionsStore` into "Reconciliation Mode".
  - Populate the `actionsStore` with the actions from the uploaded plan.

```vue
<!-- Added to App.vue -->
<div class="section-premium p-5 flex flex-col items-center text-center group relative overflow-hidden">
  <div class="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
  <div class="relative z-10 flex flex-col items-center gap-3 flex-1">
    <div class="p-2.5 bg-emerald-50 rounded-xl">
      <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    </div>
    <div>
      <div class="text-sm font-bold text-slate-800">Reconcile Plan</div>
      <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1.5 leading-relaxed">
        Load a plan file and compare it against your current farm state to track progress
      </p>
    </div>
    <button
      class="btn-premium btn-emerald px-5 py-2 mt-auto w-full"
      :disabled="loading || !playerId"
      @click="triggerReconcile"
    >
      Reconcile
    </button>
  </div>
</div>
```

## 2. Store Updates (`src/stores/actions/index.ts`)

Add state and logic to handle reconciliation mode and status calculations.

### New State:
- `isReconciling`: boolean.
- `reconciledBackupTime`: number (to track the time of the backup used for reconciliation).

### Reconciliation Logic:
Implement a helper function to determine the status of an action relative to the `currentFarmState`.

**Status Criteria:**
- **Buy Research**: `farm.commonResearches[id] >= plannedLevel`
- **Buy Habs**: `farm.habs[slotIndex] >= plannedHabId`
- **Buy Vehicles**: `farm.vehicles[slotIndex].vehicleId >= plannedVehicleId`
- **Buy Silos**: `farm.numSilos >= plannedCount`
- **Wait for TE**:
  - Incorporate "eggs laid since backup" using `(now - lastBackupTime) * avgELR`.
  - Check if `pendingTE` (from current + extra eggs) is greater than or equal to the target TE in the plan.

## 3. Component Updates

### `ActionHistoryItem.vue`
Update the template to display status icons when `isReconciling` is active.

- **Green Check**: Action is completed.
- **Timer Icon**: Action is pending.
- **N/A**: Action is not audited (e.g., `toggle_sale`, `equip_artifact_set`).

### `ActionGroup.vue` (Shift Header)
- If **every** audited action in a shift is either "N/A" or "Completed", the shift header gets a **green check**.
- If there is **at least one** "Pending" (timer icon) audited action, the shift header gets a **timer icon**.

## 4. Reconciliation Status Mapping

| Action Type | Reconciled If... |
| :--- | :--- |
| `buy_research` | Current level >= Planned level |
| `buy_hab` | Hab ID in slot >= Planned Hab ID |
| `buy_vehicle` | Vehicle ID in slot >= Planned Vehicle ID |
| `buy_train_car` | Vehicle in slot is Hyperloop AND train length >= Planned length |
| `buy_silo` | Silos owned >= Planned count |
| `wait_for_te` | Target TE for that specific egg is reached (Earned + Pending from Delivered) |
| *Others* | N/A (Always valid for shift completion) |

## 5. Catch-up Calculation for `wait_for_te`

When reconciling, the "Current State" for Truth Eggs should be:
1. `deliveredEggs` from backup.
2. `extraEggs` laid since `lastBackupTime`.
   - `elapsed = Date.now() / 1000 - lastBackupTime`
   - `extraEggs = avgELR * elapsed`
   - `avgELR` estimated by simulating population growth since backup.

If `theoreticalTE(deliveredEggs + extraEggs) >= targetTE`, the action is marked completed.

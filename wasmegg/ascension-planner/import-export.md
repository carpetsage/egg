# Ascension Plan Import/Export Feature

## Objective
Enable users to share their ascension plans by exporting them to a JSON file and importing them back. This allows for collaborative planning and saving different scenarios without relying on server-side storage for the plans themselves.

## Feature Overview
- **Export**: Generates a JSON file containing the initial player state and the full sequence of actions.
- **Import**: Allows the user to upload a previously exported JSON file, which recreates the plan in the application.
- **Privacy**: sensitive information (playerId, nickname) is redacted during export to ensure anonymity when sharing.
- **No Server Storage**: Plans are processed entirely on the client side.

## Technical Plan

### 1. Data Structure (Export Format)
The exported file will be a JSON object with the following structure:
```json
{
  "version": 1,
  "timestamp": 1739130000000,
  "initialState": {
    "playerId": "EIxxxxxxxxxx",
    "nickname": "Redacted",
    "lastBackupTime": 0,
    "soulEggs": 1.23e25,
    "epicResearchLevels": { ... },
    "colleggtibleTiers": { ... },
    "artifactLoadout": [ ... ],
    "currentFarmState": { ... }
  },
  "virtueState": {
    "shiftCount": 5,
    "initialTE": 25,
    "tankLevel": 3,
    "virtueFuelAmounts": { ... },
    "eggsDelivered": { ... },
    "teEarnedPerEgg": { ... }
  },
  "actions": [
    { "type": "start_ascension", "payload": { ... }, ... },
    { "type": "buy_research", "payload": { ... }, ... },
    ...
  ]
}
```

### 2. File Changes

#### `src/utils/export.ts` (New File)
Utility for triggering file downloads in the browser.
- `downloadFile(filename: string, content: string, contentType: string)`: Creates a blob and a temporary link to start the download.

#### `src/stores/initialState.ts`
Add a new action to hydrate the store from an exported state.
- `hydrate(data: any)`: Sets all state fields directly from the imported data.

#### `src/stores/actions.ts`
Add actions for export and import logic.
- `exportPlan()`:
  - Gathers data from `initialStateStore`, `virtueStore`, `fuelTankStore`, `truthEggsStore`, and its own `actions`.
  - **Redaction**: Replaces `playerId` with "EIxxxxxxxxxx", `nickname` with "Redacted", and `lastBackupTime` with `0`.
  - Formats the data into the JSON structure.
  - Calls `downloadFile`.
- `importPlan(jsonString: string)`:
  - Parses and validates the input.
  - Updates `initialStateStore`, `virtueStore`, etc.
  - Replaces `actions` array.
  - Calls `recalculateAll()` to sync all derived states.

#### `src/components/ActionHistory.vue`
Update the UI to include Import/Export controls.
- Add "Export Plan" and "Import Plan" buttons in the footer (next to "Clear All").
- Implement a hidden `<input type="file">` for the import function.
- Add a confirmation dialog before importing if existing actions will be overwritten.

#### `src/components/presenters/InitialStateDisplay.vue`
Update the display logic for imported plans.
- If `lastBackupTime` is `0`, display "imported plan" instead of a timestamp.

### 3. Implementation Steps

1.  **Create Utility**: Implement `src/utils/export.ts` for file downloading.
2.  **Enhance Stores**:
    -   Add `hydrate` method to `initialStateStore`.
    -   Add `exportPlan` and `importPlan` to `actionsStore`.
    -   Ensure `importPlan` correctly distributes data to `virtueStore`, `fuelTankStore`, and `truthEggsStore`.
3.  **Update UI**:
    -   Modify `ActionHistory.vue` to add buttons and file input handler.
    -   Update `InitialStateDisplay.vue` to handle the "imported plan" label.
    -   Add basic validation for the imported JSON file.
4.  **Testing**:
    -   Create a plan, export it, clear all, and import it back.
    -   Verify all metrics (cost, time, TE gained) match perfectly.
    -   Verify that the imported plan shows "Redacted" and "imported plan" in the UI.

## Files to be created/updated
- `src/utils/export.ts` (New)
- `src/stores/initialState.ts` (Update)
- `src/stores/actions.ts` (Update)
- `src/components/ActionHistory.vue` (Update)
- `src/components/presenters/InitialStateDisplay.vue` (Update)

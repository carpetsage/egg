# Artifact Sets Implementation Plan

Implement the ability for players to save and switch between two artifact sets: **Earnings** and **ELR** (Egg Laying Rate).

## 1. Data Model & State Updates

### `src/types/index.ts` or `src/types/actions.ts`
- Define `ArtifactSetName` as `'earnings' | 'elr'`.
- Update `CalculationsSnapshot` to include:
  - `activeArtifactSet: ArtifactSetName | null`.
  - `artifactSets: Record<ArtifactSetName, ArtifactSlotPayload[]>`.

### `src/engine/types.ts`
- Update `EngineState` to include:
  - `activeArtifactSet: ArtifactSetName | null`.
  - `artifactSets: Record<ArtifactSetName, ArtifactSlotPayload[]>`.

### `src/stores/initialState.ts`
- Add `artifactSets: Record<ArtifactSetName, EquippedArtifact[] | null>` to store.
- Add `activeArtifactSet: ArtifactSetName | null`.
- Update `artifactLoadout` to be a computed-like property or keep it as the "currently active" loadout for backward compatibility, sync'd with the active set.
- Add actions:
  - `saveCurrentToSet(setName: ArtifactSetName)`: Saves current `artifactLoadout` to the specified set and makes it active.
  - `updateSet(setName: ArtifactSetName, loadout: EquippedArtifact[])`: Updates a set's content.
  - `setActiveSet(setName: ArtifactSetName)`: Switches the active set.

## 2. Action System

### New Action Types
- `equip_artifact_set`: Switch the active set.
  - Payload: `{ setName: ArtifactSetName }`.
- `update_artifact_set`: Change the contents of a set.
  - Payload: `{ setName: ArtifactSetName, newLoadout: ArtifactSlotPayload[] }`.

### Action Executors
- Implement executors in `src/lib/actions/executors/`.
- `equip_artifact_set` executor:
  - Updates `activeArtifactSet` in engine state.
  - Updates `artifactLoadout` to match the contents of the newly active set.
- `update_artifact_set` executor:
  - Updates the content of the specified set in engine state.
  - If the set is currently active, also updates `artifactLoadout`.

### Action Summary Formatting
- Create a utility to summarize a loadout: `T4L {artifact}, T4R {artifact}, 4x {stone}, 2x {stone}`.
- Artifacts in slot order (1-4).
- Stones grouped by type and count, ordered by their appearance in the selector dropdown.

## 3. UI Implementation

### `src/components/presenters/InitialStateDisplay.vue`
- If no sets are saved:
  - Show "Current Loadout" (existing `ArtifactSelector`).
  - Add "Save as Earnings" and "Save as ELR" buttons.
- If sets are saved:
  - Show Tabs: "Earnings Set" and "ELR Set".
  - Each tab contains an `ArtifactSelector` for that set.
  - Edits to these sets in Initial State should immediately update the store and trigger recalculation.

### `src/components/actions/ArtifactActions.vue`
- Display both "Earnings" and "ELR" sets side-by-side or in tabs.
- Highlight the active set.
- Add "Equip" button for the inactive set (creates `equip_artifact_set` action).
- Manage local "dirty" state for sets:
  - If a set is edited, show "Unsaved Changes", "Save", and "Undo" buttons.
  - "Save" creates an `update_artifact_set` action.
  - "Undo" reverts local changes to match the current state in `actionsStore.lastSnapshot`.

## 4. Import/Export Updates

### `src/stores/actions.ts`
- Update `exportPlan()`:
  - Add `artifactSets` and `activeArtifactSet` to the `initialState` object in the export payload.
- Update `importPlan()`:
  - Ensure the `initialStateStore.hydrate()` call (which will be updated) correctly handles the new artifact set data from the imported JSON.

## 5. Documentation & Cleanup
- Ensure `artifact-sets.md` is updated with this plan.
- Don't modify other files until approved.

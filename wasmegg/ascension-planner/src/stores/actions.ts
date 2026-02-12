import { defineStore } from 'pinia';
import { markRaw } from 'vue';
import type {
  Action,
  CalculationsSnapshot,
  UndoValidation,
  VirtueEgg,
} from '@/types';
import {
  createEmptySnapshot,
  createEmptyUndoValidation,
  generateActionId,
} from '@/types';
import { computeDeltas } from '@/lib/actions/snapshot';
import { downloadFile } from '@/utils/export';
import { useInitialStateStore } from '@/stores/initialState';
import { useVirtueStore } from '@/stores/virtue';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useTruthEggsStore } from '@/stores/truthEggs';

// Engine imports
import { simulate } from '@/engine/simulate';
import { applyAction, computePassiveEggsDelivered, applyPassiveEggs } from '@/engine/apply';
import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState, syncStoresToSnapshot } from '@/engine/adapter';

/**
 * Actions store - THE source of truth for calculation state.
 *
 * Current state = Initial State + All Actions applied in order.
 * Uses a pure simulation engine to compute state history without mutating
 * Pinia stores during history traversal.
 */

export interface ActionsState {
  actions: Action[];
  _initialSnapshot: CalculationsSnapshot | null;
  // ID of the group (header action) currently being edited, or null if editing current period
  editingGroupId: string | null;
  // IDs of groups that are currently expanded
  expandedGroupIds: Set<string>;
}

/**
 * Create the default start_ascension action.
 * This is always the first action and cannot be removed.
 */
function createDefaultStartAction(initialEgg: VirtueEgg = 'curiosity'): Action<'start_ascension'> {
  return {
    id: generateActionId(),
    index: 0,
    timestamp: Date.now(),
    type: 'start_ascension',
    payload: { initialEgg },
    cost: 0,
    elrDelta: 0,
    offlineEarningsDelta: 0,
    eggValueDelta: 0,
    habCapacityDelta: 0,
    layRateDelta: 0,
    shippingCapacityDelta: 0,
    ihrDelta: 0,
    endState: createEmptySnapshot(), // Placeholder, will be computed by engine
    dependsOn: [],
    dependents: [],
  };
}

export const useActionsStore = defineStore('actions', {
  state: (): ActionsState => ({
    actions: [createDefaultStartAction()],
    _initialSnapshot: null,
    editingGroupId: null,
    expandedGroupIds: new Set(),
  }),

  getters: {
    /**
     * Get state after all actions (this IS the "current" state).
     */
    currentSnapshot(): CalculationsSnapshot {
      if (this.actions.length === 0) {
        return this._initialSnapshot ?? createEmptySnapshot();
      }
      return this.actions[this.actions.length - 1].endState;
    },

    /**
     * Get state before any actions.
     */
    initialSnapshot(): CalculationsSnapshot {
      return this._initialSnapshot ?? createEmptySnapshot();
    },

    /**
     * Total cost of all actions.
     */
    totalCost(): number {
      return this.actions.reduce((sum, a) => sum + a.cost, 0);
    },

    /**
     * Get count of actions (excluding start_ascension).
     */
    actionCount(): number {
      return this.actions.filter(a => a.type !== 'start_ascension').length;
    },

    /**
     * Check if start_ascension action exists.
     */
    hasStartAction(): boolean {
      return this.actions.some(a => a.type === 'start_ascension');
    },

    /**
     * Get the snapshot to use for available actions.
     * When editing a past group, returns that group's end state.
     * Otherwise returns the current snapshot.
     */
    effectiveSnapshot(): CalculationsSnapshot {
      if (!this.editingGroupId) {
        return this.currentSnapshot;
      }

      // Find the editing group's header action
      const headerIndex = this.actions.findIndex(a => a.id === this.editingGroupId);
      if (headerIndex === -1) {
        return this.currentSnapshot;
      }

      // Find the next shift after this header
      const nextShiftIndex = this.actions.findIndex(
        (a, idx) => idx > headerIndex && a.type === 'shift'
      );

      if (nextShiftIndex === -1) {
        // No next shift, use current snapshot
        return this.currentSnapshot;
      }

      // The effective snapshot is the state just before the next shift
      // i.e., the end state of the action right before the next shift
      const actionBeforeNextShift = this.actions[nextShiftIndex - 1];
      return actionBeforeNextShift?.endState ?? this.currentSnapshot;
    },

    /**
     * Get the index where new actions should be inserted when editing a past group.
     * Returns -1 if not editing a past group (meaning append to end).
     */
    editingInsertIndex(): number {
      if (!this.editingGroupId) {
        return -1;
      }

      // Find the next shift after the editing group's header
      const headerIndex = this.actions.findIndex(a => a.id === this.editingGroupId);
      if (headerIndex === -1) {
        return -1;
      }

      const nextShiftIndex = this.actions.findIndex(
        (a, idx) => idx > headerIndex && a.type === 'shift'
      );

      // Insert before the next shift, or at end if no next shift
      return nextShiftIndex === -1 ? -1 : nextShiftIndex;
    },

    /**
     * Get the actions that exist before the current insertion point.
     * Used for dependency computation.
     */
    actionsBeforeInsertion(): Action[] {
      const index = this.editingInsertIndex;
      if (index === -1) {
        return this.actions;
      }
      return this.actions.slice(0, index);
    },
  },

  actions: {
    /**
     * Set the initial snapshot (called when player data is loaded or initial state changes).
     * Updates the start_ascension action's endState via simulation.
     */
    setInitialSnapshot(snapshot: CalculationsSnapshot) {
      this._initialSnapshot = snapshot;

      // Ensure we have a start_ascension action
      if (this.actions.length === 0) {
        this.actions.push(createDefaultStartAction());
      }

      // Re-run simulation to update start_ascension and all subsequent actions
      // This ensures everything is in sync with the new initial conditions
      this.recalculateAll();
    },

    /**
     * Get all actions that depend on a given action (recursive).
     */
    getDependentActions(actionId: string): Action[] {
      const result: Action[] = [];
      const visited = new Set<string>();

      const collectDependents = (id: string) => {
        const action = this.actions.find(a => a.id === id);
        if (!action || visited.has(id)) return;
        visited.add(id);

        for (const depId of action.dependents) {
          const depAction = this.actions.find(a => a.id === depId);
          if (depAction && !visited.has(depId)) {
            result.push(depAction);
            collectDependents(depId);
          }
        }
      };

      collectDependents(actionId);
      return result.sort((a, b) => a.index - b.index);
    },

    /**
     * Add a new action.
     * Uses the pure engine to compute the result and updates history.
     */
    pushAction(action: Omit<Action, 'index' | 'dependents'> & { dependsOn: string[] }) {
      // 1. Get Context
      const context = getSimulationContext();

      // 2. Get Previous State
      // If no actions, start from base. If actions exist, use last one's endState (which behaves as EngineState)
      let prevState = this.actions.length > 0
        ? this.actions[this.actions.length - 1].endState
        : createBaseEngineState(this.initialSnapshot);

      // 3. Compute new state pure
      const fullAction = {
        ...action,
        index: this.actions.length,
        dependents: [],
        // Temporary placeholder, will be overwritten
        endState: createEmptySnapshot(),
      } as Action;

      // 3b. Get previous snapshot for deltas and passive egg computation
      const prevSnapshot = this.actions.length > 0
        ? this.actions[this.actions.length - 1].endState
        : (this._initialSnapshot ?? createEmptySnapshot());

      let newState = applyAction(prevState, fullAction);

      // Add passively delivered eggs during this action's duration
      const passiveEggs = computePassiveEggsDelivered(fullAction, prevSnapshot);
      newState = applyPassiveEggs(newState, passiveEggs);

      const newSnapshot = computeSnapshot(newState, context);

      // 4. Compute deltas

      const deltas = computeDeltas(prevSnapshot, newSnapshot);

      // 5. Update Action with result
      const finalAction: Action = {
        ...fullAction,
        ...deltas,
        endState: markRaw(newSnapshot),
      };

      // 6. Update dependents
      for (const depId of action.dependsOn) {
        const depAction = this.actions.find(a => a.id === depId);
        if (depAction) {
          depAction.dependents.push(finalAction.id);
        }
      }

      this.actions.push(finalAction);

      // 7. Auto-expand new shifts and collapse others if needed
      if (finalAction.type === 'shift' || finalAction.type === 'start_ascension') {
        this.expandedGroupIds.clear();
        this.expandedGroupIds.add(finalAction.id);
      }

      // Syncing is now handled automatically by pushAction's logic 
      // (Wait, pushAction actually needs to call recalculateAll or sync manually)
      // Actually pushAction is one place where we DON'T call recalculateAll 
      // because we already have the newSnapshot. So keeping it is fine.
      syncStoresToSnapshot(newSnapshot);
    },

    /**
     * Validate an undo operation.
     */
    prepareUndo(actionId: string): UndoValidation {
      const action = this.actions.find(a => a.id === actionId);
      if (!action) {
        return createEmptyUndoValidation();
      }

      if (action.type === 'start_ascension') {
        return createEmptyUndoValidation();
      }

      const dependents = this.getDependentActions(actionId);
      return {
        valid: true,
        action,
        dependentActions: dependents,
        needsRecursiveUndo: dependents.length > 0,
      };
    },

    /**
     * Execute undo after user confirmation.
     */
    executeUndo(
      actionId: string,
      includeDependents: boolean,
      restoreCallback?: (snapshot: CalculationsSnapshot) => void // Optional now as we handle it
    ) {
      const validation = this.prepareUndo(actionId);
      if (!validation.valid) return;

      // Collect all actions to remove
      const toRemove = new Set<string>([actionId]);
      if (includeDependents && validation.dependentActions) {
        for (const dep of validation.dependentActions) {
          toRemove.add(dep.id);
        }
      }

      // Determine remaining actions and clean up dependents
      const newActions = this.actions.filter(a => !toRemove.has(a.id));
      for (const action of newActions) {
        action.dependents = action.dependents.filter(depId => !toRemove.has(depId));
      }

      // We need to re-simulate everything to ensure indices and states are correct.
      // We do this by updating the actions list and then calling recalculateAll.
      this.actions = newActions;
      this.recalculateAll();

      // RecalculateAll automatically syncs stores to the effective snapshot.
      if (restoreCallback) restoreCallback(this.effectiveSnapshot);
    },

    /**
     * Clear all actions except start_ascension.
     */
    clearAll(resetCallback?: () => void) {
      const startAction = this.getStartAction();

      // Reset to just the start action or a new default one
      if (startAction) {
        this.actions = [startAction];
      } else {
        this.actions = [createDefaultStartAction()];
      }

      // Force a full recalculation to reset everything cleanly
      this.recalculateAll();

      if (resetCallback) resetCallback();
    },

    /**
     * Get the start_ascension action.
     */
    getStartAction(): Action<'start_ascension'> | undefined {
      return this.actions.find(a => a.type === 'start_ascension') as Action<'start_ascension'> | undefined;
    },

    /**
     * Check if an action can be undone.
     */
    canUndo(actionId: string): boolean {
      const action = this.actions.find(a => a.id === actionId);
      return action !== undefined && action.type !== 'start_ascension';
    },

    getAction(actionId: string): Action | undefined {
      return this.actions.find(a => a.id === actionId);
    },

    getActionByIndex(index: number): Action | undefined {
      return this.actions[index];
    },

    /**
     * Update the initial egg.
     */
    setInitialEgg(egg: VirtueEgg) {
      const startAction = this.actions.find(a => a.type === 'start_ascension') as Action<'start_ascension'> | undefined;
      if (startAction) {
        startAction.payload.initialEgg = egg;
        // Re-simulate to propagate change
        this.recalculateAll();
      }
    },

    setEditingGroup(groupId: string | null) {
      this.editingGroupId = groupId;
      // When entering edit mode, ensure the group is expanded
      if (groupId) {
        this.expandedGroupIds.add(groupId);
      }

      // When entering edit mode, we might want to restore state to that point?
      // For now, let's leave it as is. The UI handles "effectiveSnapshot".
      if (groupId === null) {
        // When leaving edit mode, restore to current head
        syncStoresToSnapshot(this.currentSnapshot);
      } else {
        // When entering edit mode, sync to effective snapshot
        syncStoresToSnapshot(this.effectiveSnapshot);
      }
    },

    /**
     * Insert an action at the editing position.
     * Uses pure engine simulation for re-calculation.
     */
    insertAction(
      action: Omit<Action, 'index' | 'dependents'> & { dependsOn: string[] },
      replayCallback?: any // unused now, kept for signature partial compat if needed
    ) {
      const insertIndex = this.editingInsertIndex;

      if (insertIndex === -1) {
        // Cast to satisfy TS if needed, though they should match now
        this.pushAction(action);
        return;
      }

      // Create full action
      const fullAction: Action = {
        ...action,
        index: insertIndex,
        dependents: [],
        endState: createEmptySnapshot(), // Placeholder
      } as Action;

      // Update dependents
      for (const depId of action.dependsOn) {
        const depAction = this.actions.find(a => a.id === depId);
        if (depAction) {
          depAction.dependents.push(fullAction.id);
        }
      }

      // Insert
      this.actions.splice(insertIndex, 0, fullAction);

      // Auto-expand/collapse if it's a shift
      if (fullAction.type === 'shift') {
        this.expandedGroupIds.clear();
        this.expandedGroupIds.add(fullAction.id);
      }

      // Re-calculate everything from insertion point (or just all for simplicity)
      // RecalculateAll uses the optimized Engine, so it's fast (O(N) non-reactive).
      // It also automatically syncs stores to effectiveSnapshot.
      this.recalculateAll();
    },

    /**
     * Recalculate all actions using the Engine.
     * Non-blocking, pure calculation.
     */
    recalculateAll() {
      const context = getSimulationContext();
      const baseState = createBaseEngineState(this._initialSnapshot);

      // Run simulation on entire history
      const newActions = simulate(this.actions, context, baseState);

      // Update actions with new results (preserving reactivity of the array, but replacing objects)
      // To avoid full array replacement if possible (Vue behavior), we can map.
      // But simulate returns new objects.

      // Mark snapshots as raw to avoid Vue deep reactivity cost
      newActions.forEach(a => {
        a.endState = markRaw(a.endState);
      });

      this.actions = newActions;

      // Sync stores to the effective snapshot.
      // If NOT editing, effectiveSnapshot === currentSnapshot (the head).
      // If editing, effectiveSnapshot is the end of the editing group.
      // This ensures the rest of the app (UI) always sees the relevant state.
      syncStoresToSnapshot(this.effectiveSnapshot);
    },

    toggleGroupExpansion(groupId: string) {
      if (this.expandedGroupIds.has(groupId)) {
        this.expandedGroupIds.delete(groupId);
      } else {
        this.expandedGroupIds.add(groupId);
      }
    },

    setGroupExpanded(groupId: string, expanded: boolean) {
      if (expanded) {
        this.expandedGroupIds.add(groupId);
      } else {
        this.expandedGroupIds.delete(groupId);
      }
    },

    /**
     * Export the current plan to a JSON file.
     */
    exportPlan() {
      const initialStateStore = useInitialStateStore();
      const virtueStore = useVirtueStore();
      const fuelTankStore = useFuelTankStore();
      const truthEggsStore = useTruthEggsStore();

      const exportData = {
        version: 1,
        timestamp: Date.now(),
        initialState: {
          playerId: 'EIxxxxxxxxxx', // Redacted
          nickname: 'Redacted',
          lastBackupTime: 0, // Set to 0 for imported plans
          soulEggs: initialStateStore.soulEggs,
          epicResearchLevels: initialStateStore.epicResearchLevels,
          colleggtibleTiers: initialStateStore.colleggtibleTiers,
          artifactLoadout: initialStateStore.artifactLoadout,
          artifactSets: initialStateStore.artifactSets,
          activeArtifactSet: initialStateStore.activeArtifactSet,
          currentFarmState: initialStateStore.currentFarmState,
          assumeDoubleEarnings: initialStateStore.assumeDoubleEarnings,
        },
        virtueState: {
          shiftCount: virtueStore.initialShiftCount,
          initialTE: virtueStore.initialTE,
          ascensionDate: virtueStore.ascensionDate,
          ascensionTime: virtueStore.ascensionTime,
          ascensionTimezone: virtueStore.ascensionTimezone,
        },
        fuelTankState: {
          tankLevel: fuelTankStore.tankLevel,
          fuelAmounts: fuelTankStore.fuelAmounts,
        },
        truthEggsState: {
          eggsDelivered: truthEggsStore.eggsDelivered,
          teEarned: truthEggsStore.teEarned,
        },
        actions: this.actions,
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const filename = `ascension-plan-${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(filename, jsonString, 'application/json');
    },

    /**
     * Import a plan from a JSON string.
     */
    importPlan(jsonString: string) {
      try {
        const data = JSON.parse(jsonString);

        // Basic validation
        if (!data.version || !data.actions || !data.initialState) {
          throw new Error('Invalid plan file format');
        }

        const initialStateStore = useInitialStateStore();
        const virtueStore = useVirtueStore();
        const fuelTankStore = useFuelTankStore();
        const truthEggsStore = useTruthEggsStore();

        // 1. Hydrate Initial State
        initialStateStore.hydrate(data.initialState);

        // 2. Hydrate Virtue Store
        if (data.virtueState) {
          virtueStore.setInitialState(data.virtueState.shiftCount || 0, data.virtueState.initialTE || 0);
          if (data.virtueState.ascensionDate) virtueStore.setAscensionDate(data.virtueState.ascensionDate);
          if (data.virtueState.ascensionTime) virtueStore.setAscensionTime(data.virtueState.ascensionTime);
          if (data.virtueState.ascensionTimezone) virtueStore.setAscensionTimezone(data.virtueState.ascensionTimezone);
        }

        // 3. Hydrate Fuel Tank
        if (data.fuelTankState) {
          fuelTankStore.setTankLevel(data.fuelTankState.tankLevel || 0);
          for (const [egg, amount] of Object.entries((data.fuelTankState.fuelAmounts || {}) as Record<string, number>)) {
            fuelTankStore.setFuelAmount(egg as VirtueEgg, amount);
          }
        }

        // 4. Hydrate Truth Eggs
        if (data.truthEggsState) {
          for (const [egg, amount] of Object.entries((data.truthEggsState.eggsDelivered || {}) as Record<string, number>)) {
            truthEggsStore.setEggsDelivered(egg as VirtueEgg, amount);
          }
          for (const [egg, count] of Object.entries((data.truthEggsState.teEarned || {}) as Record<string, number>)) {
            truthEggsStore.setTEEarned(egg as VirtueEgg, count);
          }
        }

        // 5. Hydrate Actions
        this.actions = data.actions;
        // Reset initial snapshot so that recalculateAll uses the hydrated stores as base
        this._initialSnapshot = null;

        // 6. Recalculate everything
        this.recalculateAll();

        return true;
      } catch (error) {
        console.error('Failed to import plan:', error);
        throw error;
      }
    },
  },
});

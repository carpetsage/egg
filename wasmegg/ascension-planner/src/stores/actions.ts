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

// Engine imports
import { simulate } from '@/engine/simulate';
import { applyAction } from '@/engine/apply';
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

      const newState = applyAction(prevState, fullAction);
      const newSnapshot = computeSnapshot(newState, context);

      // 4. Compute deltas
      const prevSnapshot = this.actions.length > 0
        ? this.actions[this.actions.length - 1].endState
        : (this._initialSnapshot ?? createEmptySnapshot());

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

      // 7. Sync stores to match the new reality
      // This ensures the rest of the app (which relies on stores) sees the update
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

      // Filter to remaining actions
      const newActions = this.actions.filter(a => !toRemove.has(a.id));

      // Clean up dependents references
      for (const action of newActions) {
        action.dependents = action.dependents.filter(depId => !toRemove.has(depId));
      }

      // We need to re-simulate everything to ensure indices and states are correct
      // (Removing an action might change the state of subsequent independent actions if we're not careful,
      //  but assuming independence, they might be fine. BUT safe bet is to re-sim).
      // However, re-simulating everything from scratch is safest.

      // Reset actions to the new list (temporarily) so recalculateAll picks them up
      this.actions = newActions;

      // Recalculate everything to fix indices and states
      this.recalculateAll();

      // Restore stores to the end state
      if (this.actions.length > 0) {
        const lastSnapshot = this.actions[this.actions.length - 1].endState;
        syncStoresToSnapshot(lastSnapshot);
        if (restoreCallback) restoreCallback(lastSnapshot);
      } else {
        // Should not happen as start_ascension is kept
      }
    },

    /**
     * Clear all actions except start_ascension.
     */
    clearAll(resetCallback?: () => void) {
      const startAction = this.actions.find(a => a.type === 'start_ascension');

      // Reset to just the start action
      if (startAction) {
        this.actions = [startAction];
        // Re-calculate to reset start action state if needed
        this.recalculateAll();
      } else {
        this.actions = [createDefaultStartAction()];
        this.recalculateAll();
      }

      // Restore stores
      if (this.actions.length > 0) {
        syncStoresToSnapshot(this.actions[0].endState);
      }

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

      // Re-calculate everything from insertion point (or just all for simplicity)
      // RecalculateAll uses the optimized Engine, so it's fast (O(N) non-reactive).
      this.recalculateAll();

      // Update stores to effective snapshot (since we are still editing)
      syncStoresToSnapshot(this.effectiveSnapshot);
    },

    /**
     * Recalculate all actions using the Engine.
     * Non-blocking, pure calculation.
     */
    recalculateAll() {
      const context = getSimulationContext();
      const baseState = createBaseEngineState(this.initialSnapshot);

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

      // Sync stores to the new head state if not editing
      if (!this.editingGroupId) {
        if (this.actions.length > 0) {
          syncStoresToSnapshot(this.actions[this.actions.length - 1].endState);
        }
      }
    },
  },
});

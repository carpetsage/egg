import { defineStore } from 'pinia';
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

/**
 * Actions store - THE source of truth for calculation state.
 *
 * Current state = Initial State + All Actions applied in order.
 * The existing calculation stores are mutated by actions, and snapshots
 * capture the state after each action.
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
    endState: createEmptySnapshot(),
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
      const headerAction = this.actions.find(a => a.id === this.editingGroupId);
      if (!headerAction) {
        return this.currentSnapshot;
      }

      // Find the next shift after this header
      const headerIndex = this.actions.findIndex(a => a.id === this.editingGroupId);
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
  },

  actions: {
    /**
     * Set the initial snapshot (called when player data is loaded or initial state changes).
     * Updates the start_ascension action's endState.
     */
    setInitialSnapshot(snapshot: CalculationsSnapshot) {
      this._initialSnapshot = snapshot;

      // Update the start_ascension action's endState
      const startAction = this.actions.find(a => a.type === 'start_ascension');
      if (startAction) {
        startAction.endState = snapshot;
      }
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
     * This is called by the action executors after they've computed
     * the cost, applied changes to stores, and created the snapshot.
     */
    pushAction(action: Omit<Action, 'index' | 'dependents'> & { dependsOn: string[] }) {
      const fullAction: Action = {
        ...action,
        index: this.actions.length,
        dependents: [],
      } as Action;

      // Update dependents on referenced actions
      for (const depId of action.dependsOn) {
        const depAction = this.actions.find(a => a.id === depId);
        if (depAction) {
          depAction.dependents.push(fullAction.id);
        }
      }

      this.actions.push(fullAction);
    },

    /**
     * Validate an undo operation.
     * Returns info about dependent actions for UI confirmation.
     * start_ascension cannot be undone.
     */
    prepareUndo(actionId: string): UndoValidation {
      const action = this.actions.find(a => a.id === actionId);
      if (!action) {
        return createEmptyUndoValidation();
      }

      // Cannot undo start_ascension
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
     * @param actionId - The action to undo
     * @param includeDependents - Whether to also undo dependent actions
     * @param restoreCallback - Function to restore stores to a snapshot
     */
    executeUndo(
      actionId: string,
      includeDependents: boolean,
      restoreCallback: (snapshot: CalculationsSnapshot) => void
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

      // Filter to remaining actions and re-index them
      this.actions = this.actions
        .filter(a => !toRemove.has(a.id))
        .map((a, idx) => ({ ...a, index: idx }));

      // Clear dependents references for remaining actions
      for (const action of this.actions) {
        action.dependents = action.dependents.filter(depId => !toRemove.has(depId));
      }

      // Restore stores to the state of the last remaining action
      const lastAction = this.actions[this.actions.length - 1];
      if (lastAction) {
        restoreCallback(lastAction.endState);
      }
    },

    /**
     * Clear all actions except start_ascension.
     * @param resetCallback - Function to reset stores to initial state
     */
    clearAll(resetCallback: () => void) {
      // Keep only start_ascension
      const startAction = this.actions.find(a => a.type === 'start_ascension');
      this.actions = startAction ? [startAction] : [];
      resetCallback();
    },

    /**
     * Get the start_ascension action (always the first action).
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

    /**
     * Get action by ID.
     */
    getAction(actionId: string): Action | undefined {
      return this.actions.find(a => a.id === actionId);
    },

    /**
     * Get action by index.
     */
    getActionByIndex(index: number): Action | undefined {
      return this.actions[index];
    },

    /**
     * Update the initial egg for the start_ascension action.
     * Also updates the snapshot's currentEgg.
     */
    setInitialEgg(egg: VirtueEgg) {
      const startAction = this.actions.find(a => a.type === 'start_ascension') as Action<'start_ascension'> | undefined;
      if (startAction) {
        startAction.payload.initialEgg = egg;
        startAction.endState.currentEgg = egg;
      }
    },

    /**
     * Set the group being edited.
     * Pass null to stop editing and return to current state.
     */
    setEditingGroup(groupId: string | null) {
      this.editingGroupId = groupId;
    },

    /**
     * Insert an action at the editing position and recompute subsequent snapshots.
     * If not editing a past group, this behaves like pushAction.
     * @param action - The action to insert (without index and dependents)
     * @param replayCallback - Function to replay an action and return its new snapshot
     */
    insertAction(
      action: Omit<Action, 'index' | 'dependents'> & { dependsOn: string[] },
      replayCallback: (action: Action, previousSnapshot: CalculationsSnapshot) => CalculationsSnapshot
    ) {
      const insertIndex = this.editingInsertIndex;

      if (insertIndex === -1) {
        // Not editing a past group, just push normally
        this.pushAction(action);
        return;
      }

      // Create the full action
      const fullAction: Action = {
        ...action,
        index: insertIndex,
        dependents: [],
      } as Action;

      // Update dependents on referenced actions
      for (const depId of action.dependsOn) {
        const depAction = this.actions.find(a => a.id === depId);
        if (depAction) {
          depAction.dependents.push(fullAction.id);
        }
      }

      // Insert the action at the correct position
      this.actions.splice(insertIndex, 0, fullAction);

      // Re-index all actions after the insertion point
      for (let i = insertIndex; i < this.actions.length; i++) {
        this.actions[i].index = i;
      }

      // Replay all subsequent actions to recompute their snapshots
      for (let i = insertIndex + 1; i < this.actions.length; i++) {
        const prevSnapshot = this.actions[i - 1].endState;
        const newSnapshot = replayCallback(this.actions[i], prevSnapshot);

        // Compute deltas
        const prevActionSnapshot = i > 0 ? this.actions[i - 1].endState : this._initialSnapshot ?? createEmptySnapshot();
        this.actions[i].elrDelta = newSnapshot.elr - prevActionSnapshot.elr;
        this.actions[i].offlineEarningsDelta = newSnapshot.offlineEarnings - prevActionSnapshot.offlineEarnings;
        this.actions[i].endState = newSnapshot;
      }
    },
  },
});

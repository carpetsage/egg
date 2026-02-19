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
  type ToggleSalePayload,
  type UpdateArtifactSetPayload,
} from '@/types';
import { computeDeltas } from '@/lib/actions/snapshot';
import { downloadFile } from '@/utils/export';
import { useInitialStateStore } from '@/stores/initialState';
import { useVirtueStore } from '@/stores/virtue';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useTruthEggsStore } from '@/stores/truthEggs';

// Engine imports
import { simulate, simulateAsync } from '@/engine/simulate';
import { applyAction, computePassiveEggsDelivered, applyPassiveEggs, getActionDuration } from '@/engine/apply';
import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState, syncStoresToSnapshot } from '@/engine/adapter';
import { computeDependencies } from '@/lib/actions/executor';
import { getResearchById, TIER_UNLOCK_THRESHOLDS } from '@/calculations/commonResearch';
import type { BuyResearchPayload } from '@/types';

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
  isRecalculating: boolean;
  recalculationProgress: { current: number; total: number };
  batchMode: boolean;
  minBatchIndex: number;
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
    totalTimeSeconds: 0,
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
    isRecalculating: false,
    recalculationProgress: { current: 0, total: 0 },
    batchMode: false,
    minBatchIndex: Infinity,
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
    async setInitialSnapshot(snapshot: CalculationsSnapshot) {
      this._initialSnapshot = snapshot;

      // Ensure we have a start_ascension action
      if (this.actions.length === 0) {
        this.actions.push(createDefaultStartAction());
      }

      // Re-run simulation to update start_ascension and all subsequent actions
      // This ensures everything is in sync with the new initial conditions
      await this.recalculateFrom(0);
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
    pushAction(action: Omit<Action, 'index' | 'dependents' | 'totalTimeSeconds'> & { dependsOn: string[] }) {
      // 0. Check for redundant sequential toggle_sale
      if (action.type === 'toggle_sale') {
        const payload = action.payload as ToggleSalePayload;
        const lastAction = this.actions[this.actions.length - 1];
        if (
          lastAction &&
          lastAction.type === 'toggle_sale'
        ) {
          const lastPayload = lastAction.payload as ToggleSalePayload;
          if (
            lastPayload.saleType === payload.saleType &&
            lastPayload.active !== payload.active &&
            lastAction.dependents.length === 0
          ) {
            // It's a redundant toggle! Remove the last one instead of adding this one.
            this.executeUndo(lastAction.id, 'dependents');
            return;
          }
        }
      }

      // 0b. Merge sequential update_artifact_set
      if (action.type === 'update_artifact_set') {
        const payload = action.payload as UpdateArtifactSetPayload;
        const lastAction = this.actions[this.actions.length - 1];
        if (
          lastAction &&
          lastAction.type === 'update_artifact_set'
        ) {
          const lastPayload = lastAction.payload as UpdateArtifactSetPayload;
          if (
            lastPayload.setName === payload.setName &&
            lastAction.dependents.length === 0
          ) {
            // Sequential updates to the same set!
            // Remove the previous one and let the new one replace it.
            this.executeUndo(lastAction.id, 'dependents');
            // Continue to push the new action...
          }
        }
      }

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
        totalTimeSeconds: 0,
        // Temporary placeholder, will be overwritten
        endState: createEmptySnapshot(),
      } as Action;

      // 3b. Get previous snapshot for deltas and passive egg computation
      const prevSnapshot = this.actions.length > 0
        ? this.actions[this.actions.length - 1].endState
        : (this._initialSnapshot ?? createEmptySnapshot());

      let newState = applyAction(prevState, fullAction);

      // Add passively delivered eggs during this action's duration
      const durationSeconds = getActionDuration(fullAction, prevSnapshot);
      const passiveEggs = computePassiveEggsDelivered(fullAction, prevSnapshot);
      newState = applyPassiveEggs(newState, passiveEggs);

      const newSnapshot = computeSnapshot(newState, context);

      // 4. Compute deltas

      const deltas = computeDeltas(prevSnapshot, newSnapshot);

      // 5. Update Action with result
      const finalAction: Action = {
        ...fullAction,
        ...deltas,
        totalTimeSeconds: durationSeconds,
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

      // Sync stores unless in batch mode
      if (!this.batchMode) {
        syncStoresToSnapshot(newSnapshot);
      }
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

      const toRemove = this.getActionsRequiringRemoval(new Set([actionId]));
      const dependents = toRemove.filter(a => a.id !== actionId);

      return {
        valid: true,
        action,
        dependentActions: dependents,
        needsRecursiveUndo: dependents.length > 0,
      };
    },

    /**
     * Validate an "undo until next shift" operation.
     * Collects the target action and all actions after it up to (but not including) the next shift.
     * Also recursively collects any dependents (like tier locks) even if they are in later shifts.
     */
    prepareUndoUntilShift(actionId: string): UndoValidation {
      const action = this.actions.find(a => a.id === actionId);
      if (!action) {
        return createEmptyUndoValidation();
      }

      if (action.type === 'start_ascension') {
        return createEmptyUndoValidation();
      }

      const index = this.actions.findIndex(a => a.id === actionId);
      const initialToRemove = new Set<string>();

      // Add the action itself and all actions after it until the next shift (or end of list)
      for (let i = index; i < this.actions.length; i++) {
        if (i > index && this.actions[i].type === 'shift') {
          break;
        }
        initialToRemove.add(this.actions[i].id);
      }

      const toRemove = this.getActionsRequiringRemoval(initialToRemove);
      const dependents = toRemove.filter(a => a.id !== actionId);

      return {
        valid: true,
        action,
        dependentActions: dependents,
        needsRecursiveUndo: dependents.length > 0,
      };
    },

    /**
     * Given a set of actions to remove, find all other actions that MUST also be removed
     * because they either explicitly depend on them or their requirements (like research tiers) 
     * are no longer met after the removal.
     */
    getActionsRequiringRemoval(initialIds: Set<string>): Action[] {
      const toRemove = new Set<string>(initialIds);
      let changed = true;

      while (changed) {
        changed = false;
        const currentCount = toRemove.size;

        // 1. Explicit dependents (recursive)
        // We do this by checking every action's dependsOn for anything currently in toRemove
        for (const action of this.actions) {
          if (toRemove.has(action.id)) continue;

          for (const depId of action.dependsOn) {
            if (toRemove.has(depId)) {
              toRemove.add(action.id);
              break;
            }
          }
        }

        // 2. Tier locks
        // We need to count research purchases in chronological order, skipping actions to be removed
        let researchPurchases = 0;
        const sortedActions = [...this.actions].sort((a, b) => a.index - b.index);

        for (const action of sortedActions) {
          if (toRemove.has(action.id)) continue;

          if (action.type === 'buy_research') {
            const payload = action.payload as BuyResearchPayload;
            const research = getResearchById(payload.researchId);

            // Check tier unlock
            if (research && research.tier > 1) {
              const threshold = TIER_UNLOCK_THRESHOLDS[research.tier - 1];
              if (researchPurchases < threshold) {
                // Tier is LOCKED! Must remove this action.
                toRemove.add(action.id);
                // No need to check other conditions for this action
                continue;
              }
            }

            // Count purchases for unlocking future tiers
            researchPurchases += (payload.toLevel - payload.fromLevel);
          }
        }

        if (toRemove.size > currentCount) {
          changed = true;
        }
      }

      return this.actions
        .filter(a => toRemove.has(a.id))
        .sort((a, b) => a.index - b.index);
    },

    /**
     * Execute undo after user confirmation.
     */
    async executeUndo(
      actionId: string,
      mode: 'dependents' | 'truncate' = 'dependents',
      restoreCallback?: (snapshot: CalculationsSnapshot) => void
    ) {
      const validation = mode === 'dependents'
        ? this.prepareUndo(actionId)
        : this.prepareUndoUntilShift(actionId);

      if (!validation.valid) return;

      // Collect all actions to remove
      const toRemove = new Set<string>([actionId]);
      if (validation.dependentActions) {
        for (const dep of validation.dependentActions) {
          toRemove.add(dep.id);
        }
      }

      // Determine remaining actions and clean up dependents
      const newActions = this.actions.filter(a => !toRemove.has(a.id));
      for (const action of newActions) {
        action.dependents = action.dependents.filter(depId => !toRemove.has(depId));
      }
      this.actions = newActions;

      // We need to re-simulate everything from the first change point.
      // Since we filtered actions, the indices have shifted.
      // We should find the lowest index that was modified or removed.
      // Actually, since we replaced this.actions, we can just find the first point of divergence?
      // Simpler: Find the index of the first action that was removed.
      // But we already filtered them out.
      // Improvement: The caller passes the ID. We can find its index BEFORE removal.
      // However, we've already done removal in the lines above.

      // Correct strategy:
      // The `newActions` list is valid up to the point of the first removal.
      // But `executeUndo` is complex because it can remove non-contiguous actions?
      // Actually `prepareUndo` logic (dependent actions) usually means a tree of dependents.
      // If we remove X at index 10, dependents are usually > 10.
      // So effectively we need to recalc from the first removal index.

      // Since we don't know the index easily after filtering, and this is an "undo" operation 
      // (less frequent than bulk buy), we can search for the first action that doesn't match 
      // the known state, OR just recalc from 0 to be safe for now, OR:
      // We can optimize later. For now, let's assume undo might be dirty.
      // BUT user specifically asked for "Undo option A or B" to be smooth.
      // Option B (truncate) removes everything after X. No future actions to recalc!
      // Option A (dependents) might remove X and Y (where Y > X).
      // So effectively we need to recalc from the index where X was.

      // Let's rely on finding the first action that has a different previous action than before?
      // No, let's just use `recalculateAll` for `executeUndo` for safety unless we pass the index.
      // Given the request specifically mentioned undo, let's stick to full recalc for Undo 
      // UNLESS we are in batch mode? Undo isn't batched typically.
      await this.recalculateFrom(0);

      // RecalculateAll automatically syncs stores to the effective snapshot.
      if (restoreCallback) restoreCallback(this.effectiveSnapshot);
    },

    /**
     * Remove multiple actions by ID and their dependents.
     */
    async removeActions(ids: string[]) {
      const toRemove = new Set(ids);
      const fullToRemove = this.getActionsRequiringRemoval(toRemove);
      const fullIds = new Set(fullToRemove.map(a => a.id));

      this.actions = this.actions.filter(a => !fullIds.has(a.id));

      // Cleanup remaining dependents
      this.actions.forEach(a => {
        a.dependents = a.dependents.filter(d => !fullIds.has(d));
      });

      await this.recalculateAll();
    },

    /**
     * Clear all actions except start_ascension.
     */
    async clearAll(resetCallback?: () => void) {
      const startAction = this.getStartAction();

      // Reset to just the start action or a new default one
      if (startAction) {
        this.actions = [startAction];
      } else {
        this.actions = [createDefaultStartAction()];
      }

      // Force a full calculation to reset everything cleanly
      await this.recalculateFrom(0);

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
    async setInitialEgg(egg: VirtueEgg) {
      const startAction = this.actions.find(a => a.type === 'start_ascension') as Action<'start_ascension'> | undefined;
      if (startAction) {
        startAction.payload.initialEgg = egg;
        // Re-simulate from start since initial conditions changed
        await this.recalculateFrom(0);
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
    async insertAction(
      action: Omit<Action, 'index' | 'dependents' | 'totalTimeSeconds'> & { dependsOn: string[] },
      replayCallback?: any // unused now, kept for signature partial compat if needed
    ) {
      const insertIndex = this.editingInsertIndex;

      if (insertIndex === -1) {
        // Cast to satisfy TS if needed, though they should match now
        this.pushAction(action);
        return;
      }

      // 0. Check for redundant sequential toggle_sale
      if (action.type === 'toggle_sale') {
        const payload = action.payload as ToggleSalePayload;
        const prevAction = this.actions[insertIndex - 1];
        if (
          prevAction &&
          prevAction.type === 'toggle_sale'
        ) {
          const prevPayload = prevAction.payload as ToggleSalePayload;
          if (
            prevPayload.saleType === payload.saleType &&
            prevPayload.active !== payload.active &&
            prevAction.dependents.length === 0
          ) {
            // Redundant toggle! Remove the previous one instead of adding this one.
            this.executeUndo(prevAction.id, 'dependents');
            return;
          }
        }
      }

      // 0b. Merge sequential update_artifact_set
      if (action.type === 'update_artifact_set') {
        const payload = action.payload as UpdateArtifactSetPayload;
        const prevAction = this.actions[insertIndex - 1];
        if (
          prevAction &&
          prevAction.type === 'update_artifact_set'
        ) {
          const prevPayload = prevAction.payload as UpdateArtifactSetPayload;
          if (
            prevPayload.setName === payload.setName &&
            prevAction.dependents.length === 0
          ) {
            // Sequential updates to the same set!
            // Remove the previous one and let the new one replace it.
            this.executeUndo(prevAction.id, 'dependents');
            await this.insertAction(action);
            return;
          }
        }
      }

      // Create full action
      const fullAction: Action = {
        ...action,
        index: insertIndex,
        dependents: [],
        totalTimeSeconds: 0,
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

      if (this.batchMode) {
        // Track the earliest insertion point (plus one, as that's where recalc starts)
        // If we insert at 5, action 5 is NEW and VALID (locally computed).
        // Action 6 (was 5) needs recalc. So start from insertIndex + 1.
        this.minBatchIndex = Math.min(this.minBatchIndex, insertIndex + 1);

        // In batch mode, we compute the state locally for THIS action so that subsequent
        // actions in the batch can depend on it (via effectiveSnapshot/endState).
        // depending actions *after* the insertion point will be stale until commitBatch()

        const context = getSimulationContext();

        // Logic similar to pushAction but we must find the correct prev state
        const prevAction = this.actions[insertIndex - 1]; // This is the action before the one we just inserted
        const prevSnapshot = prevAction
          ? prevAction.endState
          : (this._initialSnapshot ?? createEmptySnapshot());

        // Compute state
        // We need to re-apply logic because fullAction.endState is currently empty
        // And we need the 'newState' (EngineState) to compute snapshot
        const prevState = prevAction
          ? prevAction.endState // Snapshots are compatible with EngineState
          : createBaseEngineState(this.initialSnapshot);

        let newState = applyAction(prevState, fullAction);

        // Add passive eggs
        const durationSeconds = getActionDuration(fullAction, prevSnapshot);
        const passiveEggs = computePassiveEggsDelivered(fullAction, prevSnapshot);
        newState = applyPassiveEggs(newState, passiveEggs);

        const newSnapshot = computeSnapshot(newState, context);
        const deltas = computeDeltas(prevSnapshot, newSnapshot);

        // Update the action in-place
        Object.assign(fullAction, {
          ...deltas,
          totalTimeSeconds: durationSeconds,
          endState: markRaw(newSnapshot)
        });

      } else {
        // Re-calculate everything from insertion point
        // RecalculateAll uses the optimized Engine, so it's fast (O(N) non-reactive).
        // It also automatically syncs stores to effectiveSnapshot.
        await this.recalculateFrom(insertIndex + 1);
      }
    },

    startBatch() {
      if (this.batchMode) return;
      this.batchMode = true;
      this.minBatchIndex = Infinity;
    },

    async commitBatch() {
      if (!this.batchMode) return;
      this.batchMode = false;

      // Optimization: if we have a recorded minimum modified index, recalc from there.
      // If minBatchIndex is Infinity, we only appended, so no recalc needed for existing items.
      if (this.minBatchIndex < Infinity) {
        await this.recalculateFrom(this.minBatchIndex);
      } else {
        // Just sync if we only appended
        syncStoresToSnapshot(this.currentSnapshot);
      }
    },



    /**
     * Recalculate all actions using the Engine.
     * Async, yields to UI.
     * @param candidateActions Optional list of actions to simulate (defaults to this.actions)
     */
    /**
     * Recalculate actions starting from a specific index.
     * Actions before this index are assumed to be valid and their endState is used as base.
     */
    async recalculateFrom(startIndex: number) {
      if (startIndex >= this.actions.length) {
        // Nothing to recalculate, just sync?
        syncStoresToSnapshot(this.effectiveSnapshot);
        return;
      }

      // Ensure startIndex is non-negative
      startIndex = Math.max(0, startIndex);

      if (this.isRecalculating) {
        console.warn('Recalculation already in progress');
        // In a real implementation we might queue this, but for now we assume blocking overlay prevents it.
      }

      this.isRecalculating = true;

      try {
        const context = getSimulationContext();

        // Determine base state
        let baseState: any; // EngineState
        if (startIndex === 0) {
          baseState = createBaseEngineState(this._initialSnapshot);
        } else {
          // Use the end state of the action immediately before startIndex
          // We can cast the Snapshot to EngineState because they share structure
          // (though we might want createBaseEngineState to be safe if types diverge)
          baseState = this.actions[startIndex - 1].endState;
        }

        // Actions to simulate
        const actionsToSimulate = this.actions.slice(startIndex);

        this.recalculationProgress = { current: 0, total: actionsToSimulate.length };

        const newActionsSegment = await simulateAsync(
          actionsToSimulate,
          context,
          baseState,
          (current, total) => {
            this.recalculationProgress = { current, total };
          },
          startIndex // Pass offset so indices are correct
        );

        // Splice the new results back into the main array
        // We replace everything from startIndex to the end with the new segment
        // This relies on Vue 3 reactivity handling splice efficiently
        this.actions.splice(startIndex, newActionsSegment.length, ...newActionsSegment);

        // If the simulation produced fewer items than existed (unlikely unless we removed), 
        // the splice handles it. If it produced same count, it replaces.

        this.relinkDependencies();
        syncStoresToSnapshot(this.effectiveSnapshot);
      } finally {
        this.isRecalculating = false;
        this.batchMode = false; // Implicitly end batch mode if we recalc?
        this.minBatchIndex = Infinity;
      }
    },

    /**
     * Recalculate all actions using the Engine.
     */
    async recalculateAll() {
      return this.recalculateFrom(0);
    },

    /**
     * Re-build the dependency graph for all actions.
     * Tier locks and level requirements are captured here.
     */
    relinkDependencies() {
      // 1. Clear existing linkages
      for (const action of this.actions) {
        action.dependsOn = [];
        action.dependents = [];
      }

      // 2. Recompute and build
      for (let i = 0; i < this.actions.length; i++) {
        const action = this.actions[i];
        const existingActions = this.actions.slice(0, i);

        // Compute new dependsOn
        action.dependsOn = computeDependencies(action.type, action.payload, existingActions);

        // Update dependents on the parent actions
        for (const depId of action.dependsOn) {
          const depAction = this.actions.find(a => a.id === depId);
          if (depAction) {
            depAction.dependents.push(action.id);
          }
        }
      }
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
          initialFuelAmounts: initialStateStore.initialFuelAmounts,
          initialEggsDelivered: initialStateStore.initialEggsDelivered,
          initialTeEarned: initialStateStore.initialTeEarned,
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
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const filename = `ascension-plan-${year}-${month}-${day}.json`;
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

        // 6. Initialize initial snapshot from the hydrated baseline
        const context = getSimulationContext();
        const baseState = createBaseEngineState(null);
        this._initialSnapshot = markRaw(computeSnapshot(baseState, context));

        // 7. Recalculate everything
        this.recalculateAll();

        return true;
      } catch (error) {
        console.error('Failed to import plan:', error);
        throw error;
      }
    },
  },
});

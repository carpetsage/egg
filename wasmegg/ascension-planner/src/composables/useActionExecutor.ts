/**
 * Composable for executing actions with support for editing past shifts.
 *
 * When editing a past shift, actions are inserted at the correct position
 * and subsequent actions are replayed to update their snapshots.
 */

import { computed } from 'vue';
import type { Action, CalculationsSnapshot } from '@/types';
import { useActionsStore } from '@/stores/actions';
import { replayAction } from '@/lib/actions/replay';
import { restoreFromSnapshot, computeCurrentSnapshot, computeDeltas } from '@/lib/actions/snapshot';

export function useActionExecutor() {
  const actionsStore = useActionsStore();

  /**
   * Whether we're currently editing a past group.
   */
  const isEditingPastGroup = computed(() => actionsStore.editingGroupId !== null);

  /**
   * The snapshot to use as the "before" state for new actions.
   * When editing a past group, this is the end state of the last action in that group.
   */
  const beforeSnapshot = computed(() => actionsStore.effectiveSnapshot);

  /**
   * Prepare for executing an action by restoring stores to the correct state.
   * Call this before applying changes to stores.
   * Returns the "before" snapshot for computing deltas.
   */
  function prepareExecution(): CalculationsSnapshot {
    if (isEditingPastGroup.value) {
      // Restore stores to the effective snapshot state before applying the action
      restoreFromSnapshot(actionsStore.effectiveSnapshot);
    }
    return actionsStore.effectiveSnapshot;
  }

  /**
   * Complete an action execution by computing the snapshot and adding to history.
   * Call this after applying changes to stores.
   */
  function completeExecution(
    action: Omit<Action, 'index' | 'dependents' | 'elrDelta' | 'offlineEarningsDelta' | 'eggValueDelta' | 'habCapacityDelta' | 'layRateDelta' | 'shippingCapacityDelta' | 'ihrDelta' | 'endState'> & {
      dependsOn: string[];
    },
    beforeSnapshotArg: CalculationsSnapshot
  ): void {
    // Compute the new snapshot after the action
    const afterSnapshot = computeCurrentSnapshot();
    const deltas = computeDeltas(beforeSnapshotArg, afterSnapshot);

    // Build the full action
    const fullAction = {
      ...action,
      ...deltas,
      endState: afterSnapshot,
    };

    if (isEditingPastGroup.value) {
      // Insert at the correct position and replay subsequent actions
      actionsStore.insertAction(fullAction, replayAction);

      // Restore to the state after all replays (current state)
      restoreFromSnapshot(actionsStore.currentSnapshot);
    } else {
      // Normal push to end
      actionsStore.pushAction(fullAction as Omit<Action, 'index' | 'dependents'> & { dependsOn: string[] });
    }
  }

  return {
    isEditingPastGroup,
    beforeSnapshot,
    prepareExecution,
    completeExecution,
  };
}

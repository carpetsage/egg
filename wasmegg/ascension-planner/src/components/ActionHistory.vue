<template>
  <div class="space-y-2">
    <!-- Header with total cost -->
    <div class="flex justify-between items-center px-2">
      <span class="text-sm text-gray-600">{{ actionCount }} action{{ actionCount === 1 ? '' : 's' }}</span>
      <span class="text-sm font-mono text-amber-600">
        Total: {{ formatNumber(totalCost, 0) }} gems
      </span>
    </div>

    <!-- Empty state (only show if no start_ascension exists) -->
    <div v-if="!hasStartAction" class="text-center py-8 text-gray-500">
      <p>Load player data to start planning.</p>
    </div>

    <!-- Action list with grouping -->
    <div v-else class="border border-gray-200 rounded-lg overflow-hidden">
      <template v-for="(item, idx) in groupedActions" :key="item.key">
        <!-- Individual action -->
        <ActionHistoryItem
          v-if="item.type === 'single'"
          :action="item.action"
          :previous-offline-earnings="item.previousOfflineEarnings"
          :class="{ 'border-t border-gray-100': idx > 0 && groupedActions[idx - 1]?.type !== 'group' }"
          @show-details="$emit('show-details', item.action)"
          @undo="handleUndoRequest(item.action)"
          @edit="$emit('edit-start')"
        />

        <!-- Grouped actions (shift period) -->
        <ActionGroup
          v-else-if="item.type === 'group'"
          :shift-action="item.shiftAction"
          :actions="item.actions"
          :previous-actions-offline-earnings="item.previousOfflineEarnings"
          :time-elapsed-seconds="item.timeElapsedSeconds"
          :shift-timestamp="item.shiftTimestamp"
          :class="{ 'border-t border-gray-100': idx > 0 }"
          @show-details="$emit('show-details', $event)"
          @undo="handleUndoRequest($event)"
          @edit="$emit('edit-start')"
        />
      </template>
    </div>

    <!-- Clear all button (only show if there are actions beyond start_ascension) -->
    <div v-if="actionCount > 0" class="flex justify-end">
      <button
        class="text-sm text-red-600 hover:text-red-800 px-3 py-1"
        @click="handleClearAll"
      >
        Clear All
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Action, StoreFuelPayload, WaitForTEPayload } from '@/types';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { formatNumber } from '@/lib/format';
import ActionHistoryItem from './ActionHistoryItem.vue';
import ActionGroup from './ActionGroup.vue';

const emit = defineEmits<{
  'show-details': [action: Action];
  'undo': [action: Action, dependentActions: Action[]];
  'clear-all': [];
  'edit-start': [];
}>();

const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();

const actions = computed(() => actionsStore.actions);
const totalCost = computed(() => actionsStore.totalCost);
const actionCount = computed(() => actionsStore.actionCount);
const hasStartAction = computed(() => actionsStore.hasStartAction);

/**
 * Get the ascension start time as a Date object.
 */
const ascensionStartTime = computed(() => {
  const { ascensionDate, ascensionTime } = virtueStore;

  // Parse the date and time
  // Format: "YYYY-MM-DD HH:MM"
  const dateTimeStr = `${ascensionDate}T${ascensionTime}:00`;

  try {
    // Parse the date (assumes local timezone for simplicity)
    // A more robust solution would use a proper timezone library
    return new Date(dateTimeStr);
  } catch {
    return new Date();
  }
});

/**
 * Represents a single action displayed individually.
 */
interface SingleItem {
  type: 'single';
  key: string;
  action: Action;
  previousOfflineEarnings: number;
}

/**
 * Represents a group of actions collapsed under a shift.
 */
interface GroupItem {
  type: 'group';
  key: string;
  shiftAction: Action<'shift'>;
  actions: Action[];
  previousOfflineEarnings: number[];
  timeElapsedSeconds: number;
  shiftTimestamp: Date;
}

type GroupedItem = SingleItem | GroupItem;

/**
 * Calculate the time in seconds for an action.
 * - For time-based actions (store_fuel, wait_for_te): use the explicit timeSeconds
 * - For other actions: calculate from cost / previousOfflineEarnings
 */
function getActionTimeSeconds(action: Action, previousOfflineEarnings: number): number {
  // Time-based actions have explicit time in their payload
  if (action.type === 'store_fuel') {
    return (action.payload as StoreFuelPayload).timeSeconds;
  }
  if (action.type === 'wait_for_te') {
    return (action.payload as WaitForTEPayload).timeSeconds;
  }

  // For cost-based actions, calculate time to save
  if (action.cost > 0 && previousOfflineEarnings > 0) {
    return action.cost / previousOfflineEarnings;
  }

  return 0;
}

/**
 * Group actions by shift periods.
 *
 * Logic:
 * - start_ascension is always shown individually
 * - Actions leading up to and including a shift are grouped together
 * - Actions after the last shift (current work) are shown individually
 */
const groupedActions = computed<GroupedItem[]>(() => {
  const result: GroupedItem[] = [];
  const allActions = actions.value;

  if (allActions.length === 0) return result;

  // Find all shift indices
  const shiftIndices: number[] = [];
  allActions.forEach((action, idx) => {
    if (action.type === 'shift') {
      shiftIndices.push(idx);
    }
  });

  let currentIndex = 0;
  let cumulativeTimeSeconds = 0;

  // Always show start_ascension individually
  if (allActions[0]?.type === 'start_ascension') {
    result.push({
      type: 'single',
      key: allActions[0].id,
      action: allActions[0],
      previousOfflineEarnings: 0,
    });
    currentIndex = 1;
  }

  // Process each shift period
  for (const shiftIdx of shiftIndices) {
    // Collect actions from currentIndex to shiftIdx (inclusive)
    const groupActions = allActions.slice(currentIndex, shiftIdx + 1);
    const shiftAction = allActions[shiftIdx] as Action<'shift'>;

    if (groupActions.length > 0) {
      // Get previous offline earnings for each action in the group
      const previousOfflineEarnings = groupActions.map((_, idx) => {
        const globalIdx = currentIndex + idx;
        return getPreviousOfflineEarnings(globalIdx);
      });

      // Calculate time elapsed in this group
      let groupTimeSeconds = 0;
      groupActions.forEach((action, idx) => {
        groupTimeSeconds += getActionTimeSeconds(action, previousOfflineEarnings[idx]);
      });

      // Calculate the shift timestamp (ascension start + cumulative time + group time)
      const shiftTimestamp = new Date(
        ascensionStartTime.value.getTime() + (cumulativeTimeSeconds + groupTimeSeconds) * 1000
      );

      result.push({
        type: 'group',
        key: `group_${shiftAction.id}`,
        shiftAction,
        actions: groupActions,
        previousOfflineEarnings,
        timeElapsedSeconds: groupTimeSeconds,
        shiftTimestamp,
      });

      // Update cumulative time for next group
      cumulativeTimeSeconds += groupTimeSeconds;
    }

    currentIndex = shiftIdx + 1;
  }

  // Show remaining actions (after last shift) individually
  for (let i = currentIndex; i < allActions.length; i++) {
    result.push({
      type: 'single',
      key: allActions[i].id,
      action: allActions[i],
      previousOfflineEarnings: getPreviousOfflineEarnings(i),
    });
  }

  return result;
});

function handleUndoRequest(action: Action) {
  const validation = actionsStore.prepareUndo(action.id);
  if (validation.valid && validation.action) {
    emit('undo', validation.action, validation.dependentActions);
  }
}

function handleClearAll() {
  emit('clear-all');
}

/**
 * Get the offline earnings rate from the previous action's end state.
 * This is used to calculate how long it takes to save for the current action.
 */
function getPreviousOfflineEarnings(index: number): number {
  if (index === 0) {
    // For start_ascension, return 0 (it has no cost anyway)
    return 0;
  }
  // Get the previous action's end state offline earnings
  const previousAction = actions.value[index - 1];
  return previousAction?.endState?.offlineEarnings ?? 0;
}
</script>

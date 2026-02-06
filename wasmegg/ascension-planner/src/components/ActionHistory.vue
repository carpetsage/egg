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
        <!-- Individual action (current work after last shift) -->
        <ActionHistoryItem
          v-if="item.type === 'single'"
          :action="item.action"
          :previous-offline-earnings="item.previousOfflineEarnings"
          :class="{ 'border-t border-gray-100': idx > 0 }"
          @show-details="$emit('show-details', item.action)"
          @undo="handleUndoRequest(item.action)"
          @edit="$emit('edit-start')"
        />

        <!-- Grouped actions (start or shift period) -->
        <ActionGroup
          v-else-if="item.type === 'group'"
          :header-action="item.headerAction"
          :actions="item.actions"
          :previous-actions-offline-earnings="item.previousOfflineEarnings"
          :time-elapsed-seconds="item.timeElapsedSeconds"
          :period-end-timestamp="item.periodEndTimestamp"
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
 * Represents a group of actions collapsed under a header (start_ascension or shift).
 */
interface GroupItem {
  type: 'group';
  key: string;
  headerAction: Action<'start_ascension'> | Action<'shift'>;
  actions: Action[];  // Actions AFTER the header, until next shift
  previousOfflineEarnings: number[];
  timeElapsedSeconds: number;
  periodEndTimestamp: Date;  // When this period ended
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
 * Group actions by periods.
 *
 * Logic:
 * - start_ascension + actions AFTER it (until first shift) = first group
 * - Each shift + actions AFTER it (until next shift) = subsequent groups
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

  let cumulativeTimeSeconds = 0;

  // Handle start_ascension
  if (allActions[0]?.type === 'start_ascension') {
    const startAction = allActions[0] as Action<'start_ascension'>;

    if (shiftIndices.length > 0) {
      // There are shifts - group start_ascension with actions until first shift
      const firstShiftIdx = shiftIndices[0];
      // Actions between start_ascension (exclusive) and first shift (exclusive)
      const groupActions = allActions.slice(1, firstShiftIdx);

      // Get previous offline earnings for each action in the group
      const previousOfflineEarnings = groupActions.map((_, idx) => {
        const globalIdx = 1 + idx;  // +1 because we start after start_ascension
        return getPreviousOfflineEarnings(globalIdx);
      });

      // Calculate time elapsed in this period
      let periodTimeSeconds = 0;
      groupActions.forEach((action, idx) => {
        periodTimeSeconds += getActionTimeSeconds(action, previousOfflineEarnings[idx]);
      });

      // The period end timestamp is when the first shift happened
      const periodEndTimestamp = new Date(
        ascensionStartTime.value.getTime() + periodTimeSeconds * 1000
      );

      result.push({
        type: 'group',
        key: `group_start`,
        headerAction: startAction,
        actions: groupActions,
        previousOfflineEarnings,
        timeElapsedSeconds: periodTimeSeconds,
        periodEndTimestamp,
      });

      cumulativeTimeSeconds = periodTimeSeconds;
    } else {
      // No shifts yet - show start_ascension individually
      result.push({
        type: 'single',
        key: startAction.id,
        action: startAction,
        previousOfflineEarnings: 0,
      });

      // Show remaining actions individually (current work)
      for (let i = 1; i < allActions.length; i++) {
        result.push({
          type: 'single',
          key: allActions[i].id,
          action: allActions[i],
          previousOfflineEarnings: getPreviousOfflineEarnings(i),
        });
      }
      return result;
    }
  }

  // Process each shift period
  for (let i = 0; i < shiftIndices.length; i++) {
    const shiftIdx = shiftIndices[i];
    const nextShiftIdx = shiftIndices[i + 1];
    const shiftAction = allActions[shiftIdx] as Action<'shift'>;
    const isLastShift = nextShiftIdx === undefined;

    // Actions AFTER this shift, until next shift (or end of list)
    const endIdx = isLastShift ? allActions.length : nextShiftIdx;
    const groupActions = allActions.slice(shiftIdx + 1, endIdx);

    // Get previous offline earnings for each action in the group
    const previousOfflineEarnings = groupActions.map((_, idx) => {
      const globalIdx = shiftIdx + 1 + idx;
      return getPreviousOfflineEarnings(globalIdx);
    });

    // Calculate time elapsed in this period
    let periodTimeSeconds = 0;
    groupActions.forEach((action, idx) => {
      periodTimeSeconds += getActionTimeSeconds(action, previousOfflineEarnings[idx]);
    });

    if (isLastShift) {
      // Last shift - show shift and remaining actions individually (current work)
      result.push({
        type: 'single',
        key: shiftAction.id,
        action: shiftAction,
        previousOfflineEarnings: getPreviousOfflineEarnings(shiftIdx),
      });

      // Show remaining actions individually
      for (let j = 0; j < groupActions.length; j++) {
        result.push({
          type: 'single',
          key: groupActions[j].id,
          action: groupActions[j],
          previousOfflineEarnings: previousOfflineEarnings[j],
        });
      }
    } else {
      // Not the last shift - create a group for this shift period
      const periodEndTimestamp = new Date(
        ascensionStartTime.value.getTime() + (cumulativeTimeSeconds + periodTimeSeconds) * 1000
      );

      result.push({
        type: 'group',
        key: `group_${shiftAction.id}`,
        headerAction: shiftAction,
        actions: groupActions,
        previousOfflineEarnings,
        timeElapsedSeconds: periodTimeSeconds,
        periodEndTimestamp,
      });

      cumulativeTimeSeconds += periodTimeSeconds;
    }
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

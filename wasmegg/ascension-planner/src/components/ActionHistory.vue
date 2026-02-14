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
          :class="{ 'border-t border-gray-100': idx > 0 }"
          @show-details="$emit('show-details', item.action)"
          @undo="handleUndoRequest(item.action, $event)"
        />

        <!-- Grouped actions (start or shift period) -->
        <ActionGroup
          v-else-if="item.type === 'group'"
          :header-action="item.headerAction"
          :actions="item.actions"
          :time-elapsed-seconds="item.timeElapsedSeconds"
          :period-timestamp="item.periodTimestamp"
          :eggs-delivered="item.eggsDelivered"
          :is-editing="actionsStore.editingGroupId === item.headerAction.id"
          :is-current="item.isCurrent"
          :class="{ 'border-t border-gray-100': idx > 0 }"
          @show-details="$emit('show-details', $event)"
          @undo="handleUndoRequest"
          @start-editing="handleStartEditing"
          @stop-editing="handleStopEditing"
        />
      </template>
    </div>

    <!-- Clear all button (only show if there are actions beyond start_ascension) -->
    <!-- Footer Actions -->
    <div class="flex justify-end items-center px-2 pt-4 border-t border-gray-100">
      <button
        v-if="actionCount > 0"
        class="text-sm text-red-600 hover:text-red-800 px-3 py-1 transition-colors"
        @click="handleClearAll"
      >
        Clear All
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Action, StoreFuelPayload, WaitForTEPayload, LaunchMissionsPayload } from '@/types';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { formatNumber } from '@/lib/format';
import ActionHistoryItem from './ActionHistoryItem.vue';
import ActionGroup from './ActionGroup.vue';

const emit = defineEmits<{
  'show-details': [action: Action];
  'undo': [action: Action, options?: { skipConfirmation: boolean }];
  'clear-all': [options?: { skipConfirmation: boolean }];
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
}

/**
 * Represents a group of actions collapsed under a header (start_ascension or shift).
 */
interface GroupItem {
  type: 'group';
  key: string;
  headerAction: Action<'start_ascension'> | Action<'shift'>;
  actions: Action[];  // Actions AFTER the header, until next shift
  timeElapsedSeconds: number;
  periodTimestamp: Date;  // When this period started
  eggsDelivered: number;  // Total eggs delivered during this period (for the current egg)
  isCurrent: boolean;  // Whether this is the current (last) period
}

type GroupedItem = SingleItem | GroupItem;

// getActionTimeSeconds removed, usage replaced by action.totalTimeSeconds

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

      // Calculate time elapsed in this period
      let periodTimeSeconds = 0;
      groupActions.forEach((action) => {
        periodTimeSeconds += (action.totalTimeSeconds || 0);
      });



      result.push({
        type: 'group',
        key: `group_start`,
        headerAction: startAction,
        actions: groupActions,
        timeElapsedSeconds: periodTimeSeconds,
        periodTimestamp: ascensionStartTime.value,
        eggsDelivered: computePeriodEggsDelivered(startAction, groupActions),
        isCurrent: false,
      });

      cumulativeTimeSeconds = periodTimeSeconds;
    } else {
      // No shifts yet - show start_ascension as a group (current period)
      const groupActions = allActions.slice(1);
      let periodTimeSeconds = 0;
      groupActions.forEach((action) => {
        periodTimeSeconds += (action.totalTimeSeconds || 0);
      });



      result.push({
        type: 'group',
        key: `group_start`,
        headerAction: startAction,
        actions: groupActions,
        timeElapsedSeconds: periodTimeSeconds,
        periodTimestamp: ascensionStartTime.value,
        eggsDelivered: computePeriodEggsDelivered(startAction, groupActions),
        isCurrent: true,
      });
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

    // Calculate time elapsed in this period
    let periodTimeSeconds = 0;
    groupActions.forEach((action) => {
      periodTimeSeconds += (action.totalTimeSeconds || 0);
    });



    result.push({
      type: 'group',
      key: `group_${shiftAction.id}`,
      headerAction: shiftAction,
      actions: groupActions,
      timeElapsedSeconds: periodTimeSeconds,
      periodTimestamp: new Date(ascensionStartTime.value.getTime() + cumulativeTimeSeconds * 1000),
      eggsDelivered: computePeriodEggsDelivered(shiftAction, groupActions),
      isCurrent: isLastShift,
    });

    cumulativeTimeSeconds += periodTimeSeconds;
  }

  return result;
});

function handleUndoRequest(action: Action, options?: { skipConfirmation: boolean }) {
  emit('undo', action, options);
}

function handleClearAll(event: MouseEvent) {
  emit('clear-all', { skipConfirmation: event.shiftKey });
}

function handleStartEditing(groupId: string) {
  actionsStore.setEditingGroup(groupId);
}

function handleStopEditing() {
  actionsStore.setEditingGroup(null);
}

/**
 * Calculate eggs delivered during a period.
 * Uses the delta of eggsDelivered[egg] between the header action and the last action in the group.
 */
function computePeriodEggsDelivered(
  headerAction: Action<'start_ascension'> | Action<'shift'>,
  groupActions: Action[]
): number {
  const egg = headerAction.endState.currentEgg;
  const startDelivered = headerAction.endState.eggsDelivered[egg] || 0;
  const lastAction = groupActions.length > 0 ? groupActions[groupActions.length - 1] : null;
  const endDelivered = lastAction ? (lastAction.endState.eggsDelivered[egg] || 0) : startDelivered;
  return Math.max(0, endDelivered - startDelivered);
}

// getPreviousOfflineEarnings removed
</script>

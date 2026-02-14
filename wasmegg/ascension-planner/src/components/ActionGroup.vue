<template>
  <div
    class="border-l-4 transition-colors"
    :class="groupClasses"
  >
    <!-- Collapsible header -->
    <button
      class="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-100/50 transition-colors"
      @click="toggleExpanded"
    >
      <!-- Expand/collapse icon -->
      <svg
        class="w-4 h-4 text-purple-500 transition-transform"
        :class="{ 'rotate-90': isExpanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>

      <!-- Egg icon (shows the egg we're ON during this period) -->
      <div class="w-6 h-6 flex-shrink-0 bg-white rounded-full border border-purple-200 p-0.5 shadow-sm overflow-hidden">
        <img
          :src="iconURL(`egginc/egg_${currentEgg}.png`, 64)"
          class="w-full h-full object-contain"
          :alt="currentEgg"
        />
      </div>

      <!-- Header text -->
      <div class="flex-1 text-left">
        <div class="font-medium text-purple-900">
          {{ headerText }}
        </div>
      </div>

      <!-- Time info -->
      <div class="text-right shrink-0">
        <div class="text-xs font-medium text-purple-700">
          {{ formattedTimestamp }}
        </div>
        <div class="text-[10px] text-purple-500">
          {{ formattedTimeElapsed }} elapsed
        </div>
        <div v-if="props.eggsDelivered > 0" class="text-[10px] text-purple-500">
          {{ formatNumber(props.eggsDelivered, 3) }} delivered
        </div>
      </div>

      <!-- Shift info (only for shift actions) -->
      <div v-if="isShiftAction && headerAction.cost > 0" class="flex items-center gap-2">
        <!-- Cost badge -->
        <div 
          class="flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded border border-purple-200 shadow-sm"
        >
          <span class="text-[10px] font-bold text-purple-700">
            {{ formatNumber(headerAction.cost, 3) }}
          </span>
          <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3.5 h-3.5" alt="SE" />
        </div>
      </div>

      <!-- Status/Editor Actions -->
      <div class="flex items-center gap-2" @click.stop>
        <!-- Status Badges -->
        <span
          v-if="isEditing || (isCurrent && !actionsStore.editingGroupId)"
          class="text-[10px] font-black uppercase tracking-wider text-green-700 bg-green-200 px-2 py-0.5 rounded"
        >
          {{ isEditing ? 'Editing' : 'Current' }}
        </span>

        <span
          v-else-if="isCurrent"
          class="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-100 px-2 py-0.5 rounded"
        >
          Current
        </span>

        <!-- Edit/Done toggle -->
        <button
          v-if="!isEditing && !(isCurrent && !actionsStore.editingGroupId)"
          class="p-1 px-2 text-purple-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 border border-transparent hover:border-blue-200"
          title="Edit this shift"
          @click="$emit('start-editing', headerAction.id)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        <button
          v-if="isEditing"
          class="p-1 px-2 text-green-700 hover:text-white hover:bg-green-600 rounded transition-colors flex items-center gap-1 border border-green-300"
          title="Finish editing"
          @click="$emit('stop-editing')"
        >
          <span class="text-[10px] font-bold uppercase">Done</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <!-- Undo button (only for shift actions) -->
        <button
          v-if="isShiftAction"
          class="p-1.5 text-purple-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Undo this shift and all its actions"
          @click="handleUndo($event, headerAction)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
      </div>
    </button>

    <!-- Expanded content (summary + action details) -->
    <div
      v-if="isExpanded"
      class="border-t border-purple-200"
    >
      <!-- Egg Summary (for the egg we were ON during this period) -->
      <component
        :is="summaryComponent"
        :header-action="headerAction"
        :actions="actions"
      />

      <div
        ref="scrollContainer"
        class="max-h-[400px] overflow-y-auto bg-white/30"
      >
        <!-- Action list -->
        <ActionHistoryItem
          v-for="(action, idx) in actions"
          :key="action.id"
          :action="action"
          @show-details="$emit('show-details', action)"
          @undo="handleUndo($event, action)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, watch, nextTick } from 'vue';
import { iconURL } from 'lib';
import { useActionsStore } from '@/stores/actions';
import type { Action, VirtueEgg, StartAscensionPayload, ShiftPayload } from '@/types';
import { VIRTUE_EGG_NAMES } from '@/types';
import { formatNumber } from '@/lib/format';
import ActionHistoryItem from './ActionHistoryItem.vue';

// Lazy load summary components
const CuriositySummary = defineAsyncComponent(() => import('./summaries/CuriositySummary.vue'));
const IntegritySummary = defineAsyncComponent(() => import('./summaries/IntegritySummary.vue'));
const HumilitySummary = defineAsyncComponent(() => import('./summaries/HumilitySummary.vue'));
const ResilienceSummary = defineAsyncComponent(() => import('./summaries/ResilienceSummary.vue'));
const KindnessSummary = defineAsyncComponent(() => import('./summaries/KindnessSummary.vue'));

const summaryComponents: Record<VirtueEgg, ReturnType<typeof defineAsyncComponent>> = {
  curiosity: CuriositySummary,
  integrity: IntegritySummary,
  humility: HumilitySummary,
  resilience: ResilienceSummary,
  kindness: KindnessSummary,
};

const props = defineProps<{
  headerAction: Action<'start_ascension'> | Action<'shift'>;
  actions: Action[];
  timeElapsedSeconds: number;
  periodTimestamp: Date;
  eggsDelivered: number;
  isEditing?: boolean;
  isCurrent?: boolean;  // Whether this is the current (last) period
}>();

const emit = defineEmits<{
  'show-details': [action: Action];
  'undo': [action: Action, options: { skipConfirmation: boolean }];
  'start-editing': [groupId: string];
  'stop-editing': [];
}>();

const actionsStore = useActionsStore();

// Internal state for manually collapsing/expanding the current group
// This is now managed by the store, but we keep the ref if needed for transition (actually we can remove it)

/**
 * Determine if the group should be expanded.
 * - If editing this group: expanded
 * - If force collapsed (another group being edited): collapsed
 * - If current period: expanded by default, but can be manually collapsed
 * - Otherwise: collapsed
 */
const isExpanded = computed(() => {
  if (props.isEditing) return true;
  return actionsStore.expandedGroupIds.has(props.headerAction.id);
});

const scrollContainer = ref<HTMLElement | null>(null);

// Scroll to bottom when actions change and we are expanded
watch(() => props.actions.length, async () => {
  if (isExpanded.value) {
    await nextTick();
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  }
});

function toggleExpanded() {
  actionsStore.toggleGroupExpansion(props.headerAction.id);
}

/**
 * Whether the header is a shift action (vs start_ascension).
 */
const isShiftAction = computed(() => props.headerAction.type === 'shift');

/**
 * CSS classes for the group container based on state.
 */
const groupClasses = computed(() => {
  const isBeingEdited = props.isEditing || (props.isCurrent && !actionsStore.editingGroupId);
  if (isBeingEdited) {
    return 'border-green-500 bg-green-50/50';
  }
  return 'border-purple-200 bg-purple-50/30';
});

/**
 * The egg we're ON during this period.
 * - For start_ascension: the initial egg
 * - For shift: the egg we shifted TO
 */
const currentEgg = computed<VirtueEgg>(() => {
  if (props.headerAction.type === 'start_ascension') {
    return (props.headerAction.payload as StartAscensionPayload).initialEgg;
  } else {
    return (props.headerAction.payload as ShiftPayload).toEgg;
  }
});

/**
 * The header text to display.
 */
const headerText = computed(() => {
  if (props.headerAction.type === 'start_ascension') {
    return `Start: ${VIRTUE_EGG_NAMES[currentEgg.value]}`;
  } else {
    return `Shift to ${VIRTUE_EGG_NAMES[currentEgg.value]}`;
  }
});

/**
 * Get the appropriate summary component for the current egg.
 */
const summaryComponent = computed(() => summaryComponents[currentEgg.value]);

/**
 * Format the period timestamp as "Mon Jan 5, 2:30 PM"
 */
const formattedTimestamp = computed(() => {
  const date = props.periodTimestamp;
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
});

/**
 * Format the time elapsed in a human-readable way.
 */
const formattedTimeElapsed = computed(() => {
  const totalSeconds = props.timeElapsedSeconds;

  if (totalSeconds < 60) {
    return '<1m';
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const minutes = totalMinutes % 60;
  const hours = totalHours % 24;

  if (totalDays === 0) {
    if (totalHours === 0) {
      return `${minutes}m`;
    }
    return `${totalHours}h ${minutes}m`;
  }

  if (totalDays > 999) {
    return '>999d';
  }

  if (hours === 0) {
    return `${totalDays}d`;
  }
  return `${totalDays}d ${hours}h`;
});

// getPreviousOfflineEarnings removed

function handleUndo(event: MouseEvent | { skipConfirmation: boolean }, action: Action) {
  const skipConfirmation = 'shiftKey' in event ? event.shiftKey : event.skipConfirmation;
  emit('undo', action, { skipConfirmation });
}
</script>

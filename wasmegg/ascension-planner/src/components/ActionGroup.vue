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
          {{ formattedPeriodEndTime }}
        </div>
        <div class="text-[10px] text-purple-500">
          {{ formattedTimeElapsed }} elapsed
        </div>
      </div>

      <!-- Shift number badge (only for shift actions) -->
      <span
        v-if="isShiftAction"
        class="text-xs font-bold text-purple-600 bg-purple-200 px-2 py-0.5 rounded-full"
      >
        #{{ (headerAction as Action<'shift'>).payload.newShiftCount }}
      </span>

      <!-- Current badge -->
      <span
        v-if="isCurrent && !isEditing"
        class="text-xs font-bold text-green-600 bg-green-200 px-2 py-0.5 rounded-full"
      >
        Current
      </span>

      <!-- Editing badge -->
      <span
        v-if="isEditing"
        class="text-xs font-bold text-blue-600 bg-blue-200 px-2 py-0.5 rounded-full"
      >
        Editing
      </span>
    </button>

    <!-- Egg Summary (for the egg we were ON during this period) -->
    <component
      :is="summaryComponent"
      :header-action="headerAction"
      :actions="actions"
    />

    <!-- Expanded content (action details) -->
    <div
      v-if="isExpanded"
      ref="scrollContainer"
      class="border-t border-purple-200 max-h-[400px] overflow-y-auto"
    >
      <!-- Action list -->
      <ActionHistoryItem
        v-for="(action, idx) in actions"
        :key="action.id"
        :action="action"
        :previous-offline-earnings="getPreviousOfflineEarnings(idx)"
        @show-details="$emit('show-details', action)"
        @undo="$emit('undo', action)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, watch, nextTick } from 'vue';
import { iconURL } from 'lib';
import type { Action, VirtueEgg, StartAscensionPayload, ShiftPayload } from '@/types';
import { VIRTUE_EGG_NAMES } from '@/types';
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
  previousActionsOfflineEarnings: number[];
  timeElapsedSeconds: number;
  periodEndTimestamp: Date;
  isEditing?: boolean;
  isCurrent?: boolean;  // Whether this is the current (last) period
  forceCollapsed?: boolean;  // Force collapse when another group is being edited
}>();

const emit = defineEmits<{
  'show-details': [action: Action];
  'undo': [action: Action];
  'start-editing': [groupId: string];
  'stop-editing': [];
}>();

// Internal state for manually collapsing/expanding the current group
const manuallyCollapsed = ref(false);

/**
 * Determine if the group should be expanded.
 * - If editing this group: expanded
 * - If force collapsed (another group being edited): collapsed
 * - If current period: expanded by default, but can be manually collapsed
 * - Otherwise: collapsed
 */
const isExpanded = computed(() => {
  if (props.isEditing) return true;
  if (props.forceCollapsed) return false;
  if (props.isCurrent) return !manuallyCollapsed.value;
  return false;
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
  if (props.isEditing) {
    // Currently editing this group, stop editing
    emit('stop-editing');
  } else if (props.isCurrent) {
    // Current group: just toggle expand/collapse without entering edit mode
    manuallyCollapsed.value = !manuallyCollapsed.value;
  } else {
    // Past group: start editing
    emit('start-editing', props.headerAction.id);
  }
}

/**
 * Whether the header is a shift action (vs start_ascension).
 */
const isShiftAction = computed(() => props.headerAction.type === 'shift');

/**
 * CSS classes for the group container based on state.
 */
const groupClasses = computed(() => {
  if (props.isEditing) {
    return 'border-blue-500 bg-blue-50/50';
  }
  if (props.isCurrent) {
    return 'border-green-400 bg-green-50/50';
  }
  return 'border-purple-300 bg-purple-50/50';
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
 * Format the period end timestamp as "Mon Jan 5, 2:30 PM"
 */
const formattedPeriodEndTime = computed(() => {
  const date = props.periodEndTimestamp;
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

function getPreviousOfflineEarnings(index: number): number {
  return props.previousActionsOfflineEarnings[index] ?? 0;
}
</script>

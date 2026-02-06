<template>
  <div class="border-l-4 border-purple-300 bg-purple-50/50">
    <!-- Collapsible header -->
    <button
      class="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-100/50 transition-colors"
      @click="isExpanded = !isExpanded"
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
    </button>

    <!-- Egg Summary (for the egg we were ON during this period) -->
    <component
      :is="summaryComponent"
      :actions="actions"
    />

    <!-- Expanded content (action details) -->
    <div v-if="isExpanded" class="border-t border-purple-200">
      <!-- Action list -->
      <ActionHistoryItem
        v-for="(action, idx) in actions"
        :key="action.id"
        :action="action"
        :previous-offline-earnings="getPreviousOfflineEarnings(idx)"
        @show-details="$emit('show-details', action)"
        @undo="$emit('undo', action)"
        @edit="$emit('edit')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
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
}>();

defineEmits<{
  'show-details': [action: Action];
  'undo': [action: Action];
  'edit': [];
}>();

const isExpanded = ref(false);

/**
 * Whether the header is a shift action (vs start_ascension).
 */
const isShiftAction = computed(() => props.headerAction.type === 'shift');

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

  if (hours === 0) {
    return `${totalDays}d`;
  }
  return `${totalDays}d ${hours}h`;
});

function getPreviousOfflineEarnings(index: number): number {
  return props.previousActionsOfflineEarnings[index] ?? 0;
}
</script>

<template>
  <div class="border-l-4 border-purple-300 bg-purple-50/50">
    <!-- Egg Summary (for the egg we just left) - shown above shift line -->
    <component
      :is="summaryComponent"
      :actions="actions"
    />

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

      <!-- Shift icon (shows egg we're shifting TO) -->
      <div class="w-6 h-6 flex-shrink-0 bg-white rounded-full border border-purple-200 p-0.5 shadow-sm overflow-hidden">
        <img
          :src="iconURL(`egginc/egg_${shiftAction.payload.toEgg}.png`, 64)"
          class="w-full h-full object-contain"
          :alt="shiftAction.payload.toEgg"
        />
      </div>

      <!-- Summary -->
      <div class="flex-1 text-left">
        <div class="font-medium text-purple-900">
          Shift to {{ VIRTUE_EGG_NAMES[shiftAction.payload.toEgg] }}
        </div>
      </div>

      <!-- Time info -->
      <div class="text-right shrink-0">
        <div class="text-xs font-medium text-purple-700">
          {{ formattedShiftTime }}
        </div>
        <div class="text-[10px] text-purple-500">
          {{ formattedTimeElapsed }} elapsed
        </div>
      </div>

      <!-- Shift number badge -->
      <span class="text-xs font-bold text-purple-600 bg-purple-200 px-2 py-0.5 rounded-full">
        #{{ shiftAction.payload.newShiftCount }}
      </span>
    </button>

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
import type { Action, VirtueEgg } from '@/types';
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
  shiftAction: Action<'shift'>;
  actions: Action[];
  previousActionsOfflineEarnings: number[];
  timeElapsedSeconds: number;
  shiftTimestamp: Date;
}>();

defineEmits<{
  'show-details': [action: Action];
  'undo': [action: Action];
  'edit': [];
}>();

const isExpanded = ref(false);

const actionCount = computed(() => props.actions.length);
const totalCost = computed(() => props.actions.reduce((sum, a) => sum + a.cost, 0));

// The egg we just left (fromEgg in the shift payload)
const fromEgg = computed(() => props.shiftAction.payload.fromEgg);

// Get the appropriate summary component
const summaryComponent = computed(() => summaryComponents[fromEgg.value]);

/**
 * Format the shift timestamp as "Mon Jan 5, 2:30 PM"
 */
const formattedShiftTime = computed(() => {
  const date = props.shiftTimestamp;
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

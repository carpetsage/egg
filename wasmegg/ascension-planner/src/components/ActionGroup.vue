<template>
  <div class="border-l-4 transition-all duration-300" :class="groupClasses">
    <!-- Collapsible header -->
    <button
      class="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/50 transition-colors"
      @click="toggleExpanded"
    >
      <!-- Expand/collapse icon -->
      <svg
        class="w-4 h-4 text-slate-400 transition-transform duration-300"
        :class="{ 'rotate-90 text-slate-900': isExpanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>

      <!-- Egg icon (shows the egg we're ON during this period) -->
      <div
        class="w-8 h-8 flex-shrink-0 bg-white rounded-xl border border-slate-100 p-1 shadow-sm overflow-hidden group-hover:scale-110 transition-transform"
      >
        <img
          :src="iconURL(`egginc/egg_${currentEgg}.png`, 64)"
          class="w-full h-full object-contain"
          :alt="currentEgg"
        />
      </div>

      <!-- Header text -->
      <div class="flex-1 text-left">
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Shift</div>
        <div class="font-bold text-slate-800">
          <span class="text-slate-900 uppercase tracking-tight">{{ headerText }}</span>
        </div>
      </div>

      <!-- Time info -->
      <div class="text-right shrink-0">
        <div class="text-[10px] font-black text-slate-700 tracking-widest leading-none mb-1">
          {{ formattedTimestamp }}
        </div>
        <div class="flex flex-col items-end gap-0.5">
          <div class="text-[10px] font-bold text-slate-400 tracking-tight">Time: {{ formattedTimeElapsed }}</div>
          <div v-if="props.eggsDelivered > 0" class="text-[10px] font-black text-slate-900 tracking-widest">
            {{ formatNumber(props.eggsDelivered, 3) }} Eggs
          </div>
        </div>
      </div>

      <!-- Shift info (only for shift actions) -->
      <div v-if="isShiftAction && headerAction.cost > 0" class="flex items-center gap-2">
        <!-- Cost badge -->
        <div class="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-100 shadow-sm">
          <span class="text-[10px] font-bold text-slate-700 font-mono-premium">
            {{ formatNumber(headerAction.cost, 3) }}
          </span>
          <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3.5 h-3.5" alt="SE" />
        </div>
      </div>

      <!-- Status/Editor Actions -->
      <div class="flex items-center gap-2" @click.stop>
        <!-- Edit/Done toggle -->
        <button
          v-if="!isEditing && !(isCurrent && !actionsStore.editingGroupId)"
          class="p-2 text-slate-400 hover:text-slate-900 hover:bg-brand-primary/5 rounded-xl transition-all active:scale-95"
          v-tippy="'Edit this shift'"
          @click="$emit('start-editing', headerAction.id)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>

        <button
          v-if="isEditing"
          class="p-1 px-3 bg-brand-primary text-white rounded-xl shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 border border-brand-primary/20"
          v-tippy="'Finish editing'"
          @click="$emit('stop-editing')"
        >
          <span class="text-[9px] font-black uppercase tracking-widest">Done</span>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <!-- Undo button (only for shift actions) -->
        <button
          v-if="isShiftAction"
          class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
          v-tippy="'Undo this shift and all its actions'"
          @click="handleUndo($event, headerAction)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </button>
      </div>
    </button>

    <!-- Expanded content (summary + action details) -->
    <div v-if="isExpanded" class="border-t border-slate-300">
      <!-- Egg Summary (for the egg we were ON during this period) -->
      <component :is="summaryComponent" :header-action="headerAction" :actions="actions" />

      <div ref="scrollContainer" class="max-h-[400px] overflow-y-auto bg-white">
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
import { formatNumber, formatDuration } from '@/lib/format';
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
  isCurrent?: boolean; // Whether this is the current (last) period
  visitCount?: number;
}>();

const emit = defineEmits<{
  'show-details': [action: Action];
  undo: [action: Action, options: { skipConfirmation: boolean }];
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
watch(
  () => props.actions.length,
  async () => {
    if (isExpanded.value) {
      await nextTick();
      if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
      }
    }
  }
);

function toggleExpanded() {
  actionsStore.toggleGroupExpansion(props.headerAction.id);
}

/**
 * Whether the header is a shift action (vs start_ascension).
 */
const isShiftAction = computed(() => props.headerAction.type === 'shift');

const groupClasses = computed(() => {
  const isBeingEdited = props.isEditing || (props.isCurrent && !actionsStore.editingGroupId);
  if (isBeingEdited) {
    return 'border-brand-primary bg-slate-200 shadow-sm';
  }
  return 'border-slate-300 bg-slate-200';
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
  const name = VIRTUE_EGG_NAMES[currentEgg.value];
  const letter = name.charAt(0).toUpperCase();
  const count = props.visitCount || 1;
  return `${letter}${count}`;
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
  return formatDuration(props.timeElapsedSeconds);
});

// getPreviousOfflineEarnings removed

function handleUndo(event: MouseEvent | { skipConfirmation: boolean }, action: Action) {
  const skipConfirmation = 'shiftKey' in event ? event.shiftKey : event.skipConfirmation;
  emit('undo', action, { skipConfirmation });
}
</script>

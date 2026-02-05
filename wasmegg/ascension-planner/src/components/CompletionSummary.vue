<template>
  <div
    v-if="steps.length > 0"
    class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 transition-all duration-300"
    :class="collapsed ? 'max-h-12' : 'max-h-96'"
  >
    <div class="max-w-5xl mx-auto">
      <!-- Header bar (always visible) -->
      <div
        class="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50"
        @click="collapsed = !collapsed"
      >
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Completion Summary
          </span>
          <span class="text-sm text-gray-500">
            {{ steps.length }} step{{ steps.length !== 1 ? 's' : '' }}
          </span>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-sm">
            <span class="text-gray-500">Total:</span>
            <span class="font-mono font-medium text-blue-700 ml-1">
              {{ formatTotalDuration }}
            </span>
          </div>
          <div class="text-sm">
            <span class="text-gray-500">Complete:</span>
            <span class="font-mono font-medium text-green-700 ml-1">
              {{ formatCompletionDate }}
            </span>
          </div>
          <component
            :is="collapsed ? 'ChevronUpIcon' : 'ChevronDownIcon'"
            class="h-5 w-5 text-gray-400"
          />
        </div>
      </div>

      <!-- Expanded content -->
      <div v-show="!collapsed" class="border-t border-gray-100">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left font-medium text-gray-500">Step</th>
                <th class="px-4 py-2 text-left font-medium text-gray-500">Egg</th>
                <th class="px-4 py-2 text-right font-medium text-gray-500">Arrival</th>
                <th class="px-4 py-2 text-right font-medium text-gray-500">Departure</th>
                <th class="px-4 py-2 text-right font-medium text-gray-500">Duration</th>
                <th class="px-4 py-2 text-center font-medium text-gray-500">Type</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in timeline"
                :key="entry.stepId"
                class="border-b border-gray-100 hover:bg-gray-50"
              >
                <td class="px-4 py-2">
                  <span
                    class="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                    :class="getEggBadgeClass(entry.eggType)"
                  >
                    {{ getStepLabel(entry) }}
                  </span>
                </td>
                <td class="px-4 py-2 font-medium text-gray-900">
                  {{ getEggName(entry.eggType) }}
                </td>
                <td class="px-4 py-2 text-right font-mono text-gray-600">
                  {{ formatTimestamp(entry.arrivalTimestamp) }}
                </td>
                <td class="px-4 py-2 text-right font-mono text-gray-600">
                  {{ formatTimestamp(entry.departureTimestamp) }}
                </td>
                <td class="px-4 py-2 text-right font-mono font-medium text-blue-700">
                  {{ formatDuration(entry.duration) }}
                </td>
                <td class="px-4 py-2 text-center">
                  <span
                    class="px-2 py-0.5 rounded text-xs font-medium"
                    :class="entry.isFinalVisit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
                  >
                    {{ entry.isFinalVisit ? 'Final' : 'Intermediate' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer totals -->
        <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div class="text-sm text-gray-600">
            <span class="font-medium">Start:</span>
            <span class="font-mono ml-1">{{ formatTimestamp(initialData?.startTime || Date.now()) }}</span>
          </div>
          <div class="text-sm">
            <span class="text-gray-600">Total Duration:</span>
            <span class="font-mono font-bold text-blue-700 ml-1">{{ formatTotalDuration }}</span>
          </div>
          <div class="text-sm">
            <span class="text-gray-600">Completion:</span>
            <span class="font-mono font-bold text-green-700 ml-1">{{ formatCompletionDate }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from 'vue';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/solid';
import type { AscensionStep, InitialData, VirtueEgg, StepMetrics } from '@/types';
import { VIRTUE_EGG_ABBREV, VIRTUE_EGG_NAMES } from '@/types';
import { computeTimeline, type StepTimeline } from '@/lib/duration_calculations';
import { computeStepMetrics, formatStepDuration as formatDur } from '@/lib/step_metrics';

export default defineComponent({
  components: {
    ChevronDownIcon,
    ChevronUpIcon,
  },
  props: {
    steps: {
      type: Array as PropType<AscensionStep[]>,
      required: true,
    },
    initialData: {
      type: Object as PropType<InitialData>,
      default: undefined,
    },
  },
  setup(props) {
    const collapsed = ref(false);

    // Compute timeline for all steps
    const timeline = computed<(StepTimeline & { isFinalVisit: boolean })[]>(() => {
      if (!props.initialData || props.steps.length === 0) {
        return [];
      }

      // Helper to get metrics for a step
      const getMetrics = (step: AscensionStep, previousSteps: AscensionStep[]): StepMetrics => {
        return computeStepMetrics(step, previousSteps, props.initialData!);
      };

      const timelineEntries = computeTimeline(props.steps, props.initialData, getMetrics);

      // Add isFinalVisit flag from the step
      return timelineEntries.map((entry, index) => ({
        ...entry,
        isFinalVisit: props.steps[index]?.isFinalVisit || false,
      }));
    });

    // Total duration in seconds
    const totalDuration = computed(() => {
      return timeline.value.reduce((sum, entry) => sum + entry.duration, 0);
    });

    // Total completion timestamp
    const totalCompletionTimestamp = computed(() => {
      const lastEntry = timeline.value.at(-1);
      return lastEntry?.departureTimestamp || (props.initialData?.startTime || Date.now());
    });

    // Format total duration
    const formatTotalDuration = computed(() => {
      return formatDur(totalDuration.value);
    });

    // Format completion date
    const formatCompletionDate = computed(() => {
      return formatTimestamp(totalCompletionTimestamp.value);
    });

    // Format duration
    const formatDuration = (seconds: number): string => {
      return formatDur(seconds);
    };

    // Format timestamp
    const formatTimestamp = (timestamp: number): string => {
      const date = new Date(timestamp);
      const now = new Date();

      // If same day, just show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      }

      // If within a week, show day name and time
      const diffDays = Math.abs((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        return date.toLocaleDateString(undefined, {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      // Otherwise show full date
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    // Get step label (e.g., "C1", "I2")
    const getStepLabel = (entry: StepTimeline): string => {
      return `${VIRTUE_EGG_ABBREV[entry.eggType]}${entry.visitNumber}`;
    };

    // Get egg name
    const getEggName = (eggType: VirtueEgg): string => {
      return VIRTUE_EGG_NAMES[eggType];
    };

    // Get badge class for egg type
    const getEggBadgeClass = (eggType: VirtueEgg): string => {
      const classes: Record<VirtueEgg, string> = {
        curiosity: 'bg-blue-500',
        integrity: 'bg-green-500',
        kindness: 'bg-pink-500',
        humility: 'bg-purple-500',
        resilience: 'bg-orange-500',
      };
      return classes[eggType] || 'bg-gray-500';
    };

    return {
      collapsed,
      timeline,
      totalDuration,
      formatTotalDuration,
      formatCompletionDate,
      formatDuration,
      formatTimestamp,
      getStepLabel,
      getEggName,
      getEggBadgeClass,
    };
  },
});
</script>

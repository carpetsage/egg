<template>
  <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-4 border border-gray-200">
    <!-- Metrics Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <!-- ELR -->
      <div>
        <div class="text-gray-500 text-xs uppercase tracking-wide">ELR</div>
        <div class="font-mono font-medium text-gray-900">
          {{ formatRate(metrics.elr) }}
        </div>
      </div>

      <!-- Offline IHR -->
      <div>
        <div class="text-gray-500 text-xs uppercase tracking-wide">Offline IHR</div>
        <div class="font-mono font-medium text-gray-900">
          {{ formatIHR(metrics.offlineIHR) }}
        </div>
      </div>

      <!-- Time to Fill Habs -->
      <div>
        <div class="text-gray-500 text-xs uppercase tracking-wide">Habs Fill</div>
        <div class="font-mono font-medium text-gray-900">
          {{ formatDuration(metrics.timeToFillHabs) }}
        </div>
      </div>

      <!-- Hab Capacity -->
      <div>
        <div class="text-gray-500 text-xs uppercase tracking-wide">Hab Cap</div>
        <div class="font-mono font-medium text-gray-900">
          {{ formatEggValue(metrics.habCapacity) }}
        </div>
      </div>
    </div>

    <!-- Earnings Row -->
    <div class="mt-3 pt-3 border-t border-gray-200">
      <div class="flex items-center justify-between text-sm">
        <div class="text-gray-500 text-xs uppercase tracking-wide">Offline Earnings</div>
        <div class="font-mono">
          <span class="text-gray-600">{{ formatRate(metrics.offlineEarningsInitial) }}</span>
          <span class="text-gray-400 mx-1">→</span>
          <span class="font-medium text-green-700">{{ formatRate(metrics.offlineEarningsProjected) }}</span>
          <span class="text-gray-400 text-xs ml-1">(at max pop)</span>
        </div>
      </div>
    </div>

    <!-- Timeline Row -->
    <div v-if="arrivalTime && departureTime" class="mt-3 pt-3 border-t border-gray-200">
      <div class="flex items-center justify-between text-sm">
        <div>
          <span class="text-gray-500 text-xs uppercase tracking-wide mr-2">Arrival</span>
          <span class="font-mono text-gray-700">{{ formatTimestamp(arrivalTime) }}</span>
        </div>
        <div>
          <span class="text-gray-500 text-xs uppercase tracking-wide mr-2">Departure</span>
          <span class="font-mono text-gray-700">{{ formatTimestamp(departureTime) }}</span>
        </div>
        <div v-if="stepDuration > 0">
          <span class="text-gray-500 text-xs uppercase tracking-wide mr-2">Duration</span>
          <span class="font-mono font-medium text-blue-700">{{ formatDuration(stepDuration) }}</span>
        </div>
      </div>
    </div>

    <!-- Unit Toggle -->
    <div class="mt-3 flex justify-end">
      <div class="inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-l-md border',
            displayUnit === 'hourly'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          ]"
          @click="displayUnit = 'hourly'"
        >
          /hr
        </button>
        <button
          type="button"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-r-md border-t border-b border-r',
            displayUnit === 'daily'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          ]"
          @click="displayUnit = 'daily'"
        >
          /day
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from 'vue';
import type { AscensionStep, InitialData, StepMetrics } from '@/types';
import { computeStepMetrics } from '@/lib/step_metrics';
import { formatEggNotation, formatStepDuration as formatDur } from '@/lib/step_metrics';

export default defineComponent({
  props: {
    step: {
      type: Object as PropType<AscensionStep>,
      required: true,
    },
    previousSteps: {
      type: Array as PropType<AscensionStep[]>,
      default: () => [],
    },
    initialData: {
      type: Object as PropType<InitialData>,
      default: undefined,
    },
    arrivalTime: {
      type: Number,
      default: undefined,
    },
    departureTime: {
      type: Number,
      default: undefined,
    },
  },
  setup(props) {
    const displayUnit = ref<'hourly' | 'daily'>('hourly');

    // Compute metrics for this step
    const metrics = computed<StepMetrics>(() => {
      if (!props.initialData) {
        // Return default metrics if no initial data
        return {
          elr: 0,
          offlineIHR: 0,
          timeToFillHabs: 0,
          offlineEarningsInitial: 0,
          offlineEarningsProjected: 0,
          habCapacity: 0,
          shippingCapacity: 0,
        };
      }
      return computeStepMetrics(props.step, props.previousSteps, props.initialData);
    });

    // Compute step duration from arrival/departure
    const stepDuration = computed(() => {
      if (props.arrivalTime && props.departureTime) {
        return (props.departureTime - props.arrivalTime) / 1000; // Convert ms to seconds
      }
      return 0;
    });

    // Format rate based on display unit (per second input → per hour or per day output)
    const formatRate = (perSecondValue: number): string => {
      if (!isFinite(perSecondValue) || perSecondValue === 0) return '0';

      const multiplier = displayUnit.value === 'hourly' ? 3600 : 86400;
      const value = perSecondValue * multiplier;
      const suffix = displayUnit.value === 'hourly' ? '/hr' : '/day';

      return formatEggNotation(value) + suffix;
    };

    // Format IHR (already in chickens/min, convert to per hour or per day)
    const formatIHR = (perMinuteValue: number): string => {
      if (!isFinite(perMinuteValue) || perMinuteValue === 0) return '0';

      const multiplier = displayUnit.value === 'hourly' ? 60 : 1440;
      const value = perMinuteValue * multiplier;
      const suffix = displayUnit.value === 'hourly' ? '/hr' : '/day';

      return formatEggNotation(value) + suffix;
    };

    // Format egg values
    const formatEggValue = (value: number): string => {
      return formatEggNotation(value);
    };

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

      // Otherwise show date and time
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return {
      displayUnit,
      metrics,
      stepDuration,
      formatRate,
      formatIHR,
      formatEggValue,
      formatDuration,
      formatTimestamp,
    };
  },
});
</script>

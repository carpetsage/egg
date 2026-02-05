<template>
  <div class="space-y-4">
    <!-- Final Result -->
    <div class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
      <div class="flex justify-between items-center mb-2">
        <div class="text-sm text-emerald-700 font-medium">Effective Lay Rate</div>
        <!-- Time Unit Toggle -->
        <div class="flex gap-1">
          <button
            v-for="unit in timeUnits"
            :key="unit.value"
            class="px-2 py-1 text-xs rounded"
            :class="timeUnit === unit.value
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'"
            @click="$emit('set-time-unit', unit.value)"
          >
            {{ unit.label }}
          </button>
        </div>
      </div>
      <div class="text-3xl font-bold text-emerald-900">
        {{ formatNumber(convertedELR, 2) }}/{{ timeUnitLabel }}
      </div>
      <div class="text-sm mt-1" :class="limitedByClass">
        {{ limitedByText }}
      </div>
    </div>

    <!-- Rate Breakdown -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Rate Comparison</h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div class="px-4 py-3 flex justify-between items-center">
          <span class="text-gray-600">Egg Laying Rate</span>
          <span
            class="font-mono"
            :class="output.limitedBy === 'laying' ? 'text-red-600 font-semibold' : 'text-gray-700'"
          >
            {{ formatNumber(convertedLayRate, 2) }}/{{ timeUnitLabel }}
          </span>
        </div>
        <div class="px-4 py-3 flex justify-between items-center">
          <span class="text-gray-600">Shipping Capacity</span>
          <span
            class="font-mono"
            :class="output.limitedBy === 'shipping' ? 'text-red-600 font-semibold' : 'text-gray-700'"
          >
            {{ formatNumber(convertedShipping, 2) }}/{{ timeUnitLabel }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EffectiveLayRateOutput, TimeUnit } from '@/types';
import { formatNumber } from '@/lib/format';
import { computed } from 'vue';

const props = defineProps<{
  output: EffectiveLayRateOutput;
  timeUnit: TimeUnit;
}>();

defineEmits<{
  'set-time-unit': [unit: TimeUnit];
}>();

const timeUnits = [
  { value: 'minute' as const, label: '/min' },
  { value: 'hour' as const, label: '/hr' },
  { value: 'day' as const, label: '/day' },
];

const timeUnitLabel = computed(() => {
  switch (props.timeUnit) {
    case 'minute': return 'min';
    case 'hour': return 'hr';
    case 'day': return 'day';
  }
});

const timeMultiplier = computed(() => {
  switch (props.timeUnit) {
    case 'minute': return 60;
    case 'hour': return 3600;
    case 'day': return 86400;
  }
});

const convertedLayRate = computed(() => props.output.layRate * timeMultiplier.value);
const convertedShipping = computed(() => props.output.shippingCapacity * timeMultiplier.value);
const convertedELR = computed(() => props.output.effectiveLayRate * timeMultiplier.value);

const limitedByText = computed(() => {
  switch (props.output.limitedBy) {
    case 'laying': return 'Limited by egg laying rate';
    case 'shipping': return 'Limited by shipping capacity';
    case 'equal': return 'Laying and shipping are balanced';
  }
});

const limitedByClass = computed(() => {
  switch (props.output.limitedBy) {
    case 'laying': return 'text-yellow-600';
    case 'shipping': return 'text-blue-600';
    case 'equal': return 'text-emerald-600';
  }
});
</script>

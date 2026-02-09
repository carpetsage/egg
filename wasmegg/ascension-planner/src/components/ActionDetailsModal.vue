<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50"
        @click="$emit('close')"
      />

      <!-- Modal -->
      <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center z-10">
          <div>
            <h2 class="font-semibold text-gray-900">
              {{ action ? `State After Action #${action.index + 1}` : 'Current Calculation Details' }}
            </h2>
            <p v-if="action" class="text-sm text-gray-500">{{ displayName }}</p>
            <p v-else class="text-sm text-gray-500">Full breakdown of current multipliers and rates</p>
          </div>
          <button
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            @click="$emit('close')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-4">
          <!-- Deltas from previous (only show for non-start actions) -->
          <div v-if="action && action.type !== 'start_ascension'" class="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Change from Previous State</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">ELR:</span>
                <span :class="deltaClass(action.elrDelta)" class="font-mono">
                  {{ formatDelta(action.elrDelta * 3600) }}/hr
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Offline Earnings:</span>
                <span :class="deltaClass(action.offlineEarningsDelta)" class="font-mono">
                  {{ formatDelta(action.offlineEarningsDelta * 3600) }}/hr
                </span>
              </div>
            </div>
          </div>

          <!-- Full Calculation Details (reuse CalculationSummary) -->
          <CalculationSummary />
        </div>

        <!-- Footer -->
        <div class="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-end">
          <button
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
            @click="$emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Action } from '@/types';
import { getExecutor } from '@/lib/actions';
import { formatNumber } from '@/lib/format';
import CalculationSummary from './CalculationSummary.vue';

const props = defineProps<{
  action?: Action | null;
}>();

defineEmits<{
  'close': [];
}>();

const displayName = computed(() => {
  if (!props.action) return '';
  const executor = getExecutor(props.action.type);
  return executor.getDisplayName(props.action.payload);
});

function deltaClass(delta: number): string {
  if (delta > 0) return 'text-green-600';
  if (delta < 0) return 'text-red-600';
  return 'text-gray-400';
}

function formatDelta(delta: number): string {
  if (Math.abs(delta) < 0.001) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatNumber(delta, 2)}`;
}
</script>

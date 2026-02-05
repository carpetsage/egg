<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50"
        @click="$emit('cancel')"
      />

      <!-- Dialog -->
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 class="font-semibold text-lg text-gray-900 mb-2">Undo Action</h3>

        <p class="text-gray-600 mb-4">
          Are you sure you want to undo "{{ actionName }}"?
        </p>

        <!-- Dependent actions warning -->
        <div
          v-if="dependentActions.length > 0"
          class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4"
        >
          <p class="text-amber-800 font-medium mb-2">
            This will also undo {{ dependentActions.length }} dependent action{{ dependentActions.length > 1 ? 's' : '' }}:
          </p>
          <ul class="text-sm text-amber-700 space-y-1 max-h-40 overflow-y-auto">
            <li v-for="dep in dependentActions" :key="dep.id" class="flex items-start gap-2">
              <span class="text-amber-400 mt-0.5">•</span>
              <span>{{ getActionName(dep) }}</span>
            </li>
          </ul>
        </div>

        <!-- Cost refund info -->
        <div class="text-sm text-gray-500 mb-4">
          <span>Total refund: </span>
          <span class="font-mono text-amber-600">{{ formatNumber(totalRefund, 0) }} gems</span>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded"
            @click="$emit('confirm')"
          >
            {{ dependentActions.length > 0 ? 'Undo All' : 'Undo' }}
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

const props = defineProps<{
  action: Action;
  dependentActions: Action[];
}>();

defineEmits<{
  'confirm': [];
  'cancel': [];
}>();

const actionName = computed(() => {
  const executor = getExecutor(props.action.type);
  return executor.getDisplayName(props.action.payload);
});

const totalRefund = computed(() => {
  let total = props.action.cost;
  for (const dep of props.dependentActions) {
    total += dep.cost;
  }
  return total;
});

function getActionName(action: Action): string {
  const executor = getExecutor(action.type);
  return executor.getDisplayName(action.payload);
}
</script>

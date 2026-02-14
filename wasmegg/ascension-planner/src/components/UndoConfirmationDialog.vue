<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50"
        @click="$emit('cancel')"
      />

      <!-- Dialog -->
      <div class="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <h3 class="font-semibold text-xl text-gray-900 mb-2">Undo Action</h3>

        <p class="text-gray-600 mb-6">
          How would you like to undo "{{ actionName }}"?
        </p>

        <div class="space-y-4">
          <!-- Option A: Direct Dependents -->
          <button
            class="w-full text-left p-4 rounded-lg border-2 transition-all group border-gray-100 hover:border-blue-100 hover:bg-blue-50"
            @click="$emit('confirm', 'dependents')"
          >
            <div class="flex justify-between items-start mb-1">
              <span class="font-bold text-gray-900 group-hover:text-blue-700">
                {{ dependentsA.length > 0 ? 'Option A: Smart Undo' : 'Option A: Undo Action' }}
              </span>
              <span class="text-xs font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Refund: {{ formatNumber(refundA, 0) }}</span>
            </div>
            <p class="text-sm text-gray-500 mb-3">
              {{ dependentsA.length > 0 
                ? 'Undoes this action and any other actions that directly depend on its effects.' 
                : 'Removes only this action from your history.' }}
            </p>
            <div
              v-if="dependentsA.length > 0"
              class="bg-white/50 rounded p-2 text-xs text-gray-600 space-y-1"
            >
              <p class="font-semibold text-amber-700">Also undoes {{ dependentsA.length }} dependent{{ dependentsA.length > 1 ? 's' : '' }}:</p>
              <ul class="list-disc list-inside">
                <li v-for="dep in dependentsA.slice(0, 3)" :key="dep.id" class="truncate">
                  {{ getActionName(dep) }}
                </li>
                <li v-if="dependentsA.length > 3" class="italic">
                  + {{ dependentsA.length - 3 }} more...
                </li>
              </ul>
            </div>
            <p v-else class="text-xs italic text-gray-400">No other actions affected.</p>
          </button>

          <!-- Option B: Until Shift -->
          <button
            class="w-full text-left p-4 rounded-lg border-2 transition-all group border-gray-100 hover:border-purple-100 hover:bg-purple-50"
            @click="$emit('confirm', 'truncate')"
          >
            <div class="flex justify-between items-start mb-1">
              <span class="font-bold text-gray-900 group-hover:text-purple-700">Option B: Undo Until Shift</span>
              <span class="text-xs font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Refund: {{ formatNumber(refundB, 0) }}</span>
            </div>
            <p class="text-sm text-gray-500 mb-3">
              Undoes this action and EVERY action that follows it within the current egg period.
            </p>
            <div
              v-if="dependentsB.length > 0"
              class="bg-white/50 rounded p-2 text-xs text-gray-600 space-y-1"
            >
              <p class="font-semibold text-purple-700">Also undoes {{ dependentsB.length }} following action{{ dependentsB.length > 1 ? 's' : '' }}:</p>
              <ul class="list-disc list-inside">
                <li v-for="dep in dependentsB.slice(0, 3)" :key="dep.id" class="truncate">
                  {{ getActionName(dep) }}
                </li>
                <li v-if="dependentsB.length > 3" class="italic">
                  + {{ dependentsB.length - 3 }} more...
                </li>
              </ul>
            </div>
            <p v-else class="text-xs italic text-gray-400">This is the last action in this period.</p>
          </button>
        </div>

        <!-- Cancel Button -->
        <div class="mt-6 flex justify-end">
          <button
            class="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            @click="$emit('cancel')"
          >
            Cancel
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
  dependentsA: Action[];
  dependentsB: Action[];
}>();

defineEmits<{
  'confirm': [mode: 'dependents' | 'truncate'];
  'cancel': [];
}>();

const actionName = computed(() => {
  const executor = getExecutor(props.action.type);
  return executor.getDisplayName(props.action.payload);
});

const refundA = computed(() => {
  let total = props.action.cost;
  for (const dep of props.dependentsA) {
    total += dep.cost;
  }
  return total;
});

const refundB = computed(() => {
  let total = props.action.cost;
  for (const dep of props.dependentsB) {
    total += dep.cost;
  }
  return total;
});

function getActionName(action: Action): string {
  const executor = getExecutor(action.type);
  return executor.getDisplayName(action.payload);
}
</script>

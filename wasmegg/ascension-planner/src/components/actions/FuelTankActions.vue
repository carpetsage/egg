<template>
  <div class="space-y-4">
    <p class="text-sm text-gray-500 mb-4">
      Store eggs in your fuel tank for space missions.
    </p>

    <!-- Current Tank State -->
    <div class="bg-gray-50 rounded-lg p-4">
      <div class="flex justify-between items-center mb-3">
        <span class="text-sm font-medium text-gray-700">Tank Capacity</span>
        <span class="text-lg font-mono">
          {{ formatNumber(fuelTankStore.totalFuel, 1) }} / {{ formatNumber(fuelTankStore.tankCapacity, 1) }}
        </span>
      </div>

      <!-- Capacity Bar -->
      <div class="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          class="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
          :style="{ width: `${fuelTankStore.fillPercent}%` }"
        />
      </div>

      <!-- Per-Egg Breakdown -->
      <div class="space-y-2">
        <div
          v-for="egg in VIRTUE_FUEL_ORDER"
          :key="egg"
          class="flex items-center gap-2"
        >
          <div class="w-6 h-6 flex-shrink-0">
            <img
              :src="iconURL(`egginc/egg_${egg}.png`, 64)"
              class="w-full h-full object-contain"
              :alt="egg"
            />
          </div>
          <span class="text-xs text-gray-600 w-20">{{ VIRTUE_EGG_NAMES[egg] }}</span>
          <span class="text-sm font-mono text-gray-700 flex-1 text-right">
            {{ formatNumber(fuelTankStore.fuelAmounts[egg], 1) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Store Fuel Section -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-6 h-6 flex-shrink-0">
          <img
            :src="iconURL(`egginc/egg_${virtueStore.currentEgg}.png`, 64)"
            class="w-full h-full object-contain"
            :alt="virtueStore.currentEgg"
          />
        </div>
        <span class="text-sm font-medium text-gray-700">
          Store {{ VIRTUE_EGG_NAMES[virtueStore.currentEgg] }} Eggs
        </span>
      </div>

      <div class="flex items-center gap-2 mb-3">
        <input
          v-model="amountInput"
          type="text"
          placeholder="e.g., 50B, 100T"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          @keyup.enter="handleStoreFuel"
        />
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canStore"
          @click="handleStoreFuel"
        >
          Store
        </button>
      </div>

      <!-- Time Estimate -->
      <div v-if="parsedAmount > 0" class="text-sm space-y-1">
        <div class="flex justify-between text-gray-600">
          <span>Amount:</span>
          <span class="font-mono">{{ formatNumber(parsedAmount, 1) }} eggs</span>
        </div>
        <div class="flex justify-between text-gray-600">
          <span>Time to store:</span>
          <span class="font-mono">{{ formatDuration(timeToStoreSeconds) }}</span>
        </div>
        <div v-if="exceedsCapacity" class="text-red-500 text-xs mt-1">
          Exceeds tank capacity by {{ formatNumber(parsedAmount - fuelTankStore.availableCapacity, 1) }}
        </div>
      </div>
    </div>

    <!-- Tank Level Info -->
    <div class="bg-gray-50 rounded-lg p-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-700">Tank Level</p>
        </div>
        <div class="text-right">
          <span class="text-sm font-medium text-gray-900">
            Level {{ fuelTankStore.tankLevel }}/7
          </span>
        </div>
      </div>
      <div class="mt-2 text-xs text-gray-500">
        Capacity: <span class="font-medium text-blue-600">{{ formatNumber(fuelTankStore.tankCapacity, 1) }}</span>
      </div>
    </div>

    <p class="text-xs text-gray-400">
      Fuel is stored based on your current lay rate at max hab capacity.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { iconURL } from 'lib';
import { useFuelTankStore, timeToStore } from '@/stores/fuelTank';
import { useVirtueStore } from '@/stores/virtue';
import { useActionsStore } from '@/stores/actions';
import { useLayRate } from '@/composables/useLayRate';
import { useTruthEggsStore } from '@/stores/truthEggs';
import { computeDependencies } from '@/lib/actions/executor';
import { formatNumber, formatDuration, parseNumber } from '@/lib/format';
import { generateActionId, VIRTUE_EGG_NAMES } from '@/types';
import { VIRTUE_FUEL_ORDER } from '@/stores/fuelTank';
import { useActionExecutor } from '@/composables/useActionExecutor';

const fuelTankStore = useFuelTankStore();
const truthEggsStore = useTruthEggsStore();
const virtueStore = useVirtueStore();
const actionsStore = useActionsStore();
const { output: layRateOutput } = useLayRate();
const { prepareExecution, completeExecution } = useActionExecutor();

const amountInput = ref('');

// Parse input amount
const parsedAmount = computed(() => {
  if (!amountInput.value.trim()) return 0;
  const parsed = parseNumber(amountInput.value);
  return isNaN(parsed) ? 0 : parsed;
});

// Time calculation
const timeToStoreSeconds = computed(() => {
  if (parsedAmount.value <= 0) return 0;
  return timeToStore(parsedAmount.value, layRateOutput.value.totalRatePerSecond);
});

// Validation
const exceedsCapacity = computed(() => parsedAmount.value > fuelTankStore.availableCapacity);
const canStore = computed(() =>
  parsedAmount.value > 0 &&
  !exceedsCapacity.value &&
  isFinite(timeToStoreSeconds.value)
);

function handleStoreFuel() {
  if (!canStore.value) return;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  const payload = {
    egg: beforeSnapshot.currentEgg,
    amount: parsedAmount.value,
    timeSeconds: timeToStoreSeconds.value,
  };

  const dependencies = computeDependencies('store_fuel', payload, actionsStore.actions);

  // Apply to store
  fuelTankStore.addFuel(payload.egg, payload.amount);
  truthEggsStore.addEggsDelivered(payload.egg, payload.amount);

  // Complete execution
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'store_fuel',
    payload,
    cost: 0, // Free action
    dependsOn: dependencies,
  }, beforeSnapshot);

  // Clear input
  amountInput.value = '';
}
</script>

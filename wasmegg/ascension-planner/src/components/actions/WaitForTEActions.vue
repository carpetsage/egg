<template>
  <div class="space-y-4">
    <p class="text-sm text-gray-500 mb-4">
      Wait for Truth Eggs to accumulate by shipping eggs.
    </p>

    <!-- Current Egg Info -->
    <div class="bg-gray-50 rounded-lg p-4">
      <div class="flex items-center gap-3 mb-3">
        <img
          :src="iconURL(`egginc/egg_${virtueStore.currentEgg}.png`, 64)"
          class="w-10 h-10 object-contain"
          :alt="virtueStore.currentEgg"
        />
        <div>
          <div class="text-sm font-medium text-gray-700">
            {{ VIRTUE_EGG_NAMES[virtueStore.currentEgg] }}
          </div>
          <div class="text-xs text-gray-500">
            Current Egg
          </div>
        </div>
      </div>

      <!-- Current TE State -->
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-gray-500">Eggs Delivered:</span>
          <span class="ml-2 font-mono">{{ formatNumber(currentEggsDelivered, 3) }}</span>
        </div>
        <div>
          <span class="text-gray-500">TE Earned:</span>
          <span class="ml-2 font-mono">{{ currentTE }} / 98</span>
        </div>
        <div>
          <span class="text-gray-500">Pending TE:</span>
          <span class="ml-2 font-mono text-amber-600">{{ pendingTE }}</span>
        </div>
        <div>
          <span class="text-gray-500">Total TE:</span>
          <span class="ml-2 font-mono">{{ truthEggsStore.totalTE }} / 490</span>
        </div>
      </div>
    </div>

    <!-- Target TE Selection -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="flex items-center gap-2 mb-3">
        <img
          :src="iconURL('egginc/egg_truth.png', 64)"
          class="w-6 h-6 object-contain"
          alt="Truth Egg"
        />
        <span class="text-sm font-medium text-gray-700">
          Target TE for {{ VIRTUE_EGG_NAMES[virtueStore.currentEgg] }}
        </span>
      </div>

      <!-- Target TE input with +/- buttons -->
      <div class="flex items-center gap-3 mb-4">
        <span class="text-sm text-gray-500">Target TE:</span>
        <div class="flex items-center">
          <button
            class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-l border border-gray-300 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="targetTE <= currentTE + 1"
            @click="targetTE = Math.max(currentTE + 1, targetTE - 1)"
          >
            −
          </button>
          <input
            v-model.number="targetTE"
            type="number"
            :min="currentTE + 1"
            :max="98"
            class="w-16 text-center text-sm border-t border-b border-gray-300 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
            :disabled="currentTE >= 98"
          />
          <button
            class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-r border border-gray-300 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="targetTE >= 98"
            @click="targetTE = Math.min(98, targetTE + 1)"
          >
            +
          </button>
        </div>
      </div>

      <!-- Calculated values -->
      <div v-if="teGained > 0" class="space-y-2 text-sm border-t border-gray-100 pt-3">
        <div class="flex justify-between">
          <span class="text-gray-600">TE Gained:</span>
          <span class="font-mono font-medium text-amber-600">+{{ teGained }} TE</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Eggs to Lay:</span>
          <span class="font-mono">{{ formatNumber(eggsToLay, 3) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Time Required:</span>
          <span class="font-mono">{{ formatDuration(timeToLaySeconds) }}</span>
        </div>
      </div>

      <!-- Wait button -->
      <button
        class="mt-4 w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        :disabled="!canWait"
        @click="handleWaitForTE"
      >
        <img
          :src="iconURL('egginc/egg_truth.png', 64)"
          class="w-5 h-5 object-contain"
          alt="Truth Egg"
        />
        Wait for TE
      </button>
    </div>

    <!-- Max TE notice -->
    <div v-if="currentTE >= 98" class="bg-green-50 border border-green-200 rounded-lg p-3">
      <p class="text-sm text-green-700">
        You have reached the maximum TE (98) for {{ VIRTUE_EGG_NAMES[virtueStore.currentEgg] }}!
      </p>
    </div>

    <p class="text-xs text-gray-400">
      TE provides a 1.1× multiplier per egg to IHR and earnings. Time is based on your current lay rate at max hab capacity.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { iconURL } from 'lib';
import { useTruthEggsStore } from '@/stores/truthEggs';
import { useVirtueStore } from '@/stores/virtue';
import { useActionsStore } from '@/stores/actions';
import { useLayRate } from '@/composables/useLayRate';
import { computeDependencies } from '@/lib/actions/executor';
import { formatNumber, formatDuration } from '@/lib/format';
import { generateActionId, VIRTUE_EGG_NAMES } from '@/types';
import { eggsNeededForTE, countTEThresholdsPassed } from '@/lib/truthEggs';
import { useActionExecutor } from '@/composables/useActionExecutor';

const truthEggsStore = useTruthEggsStore();
const virtueStore = useVirtueStore();
const actionsStore = useActionsStore();
const { output: layRateOutput } = useLayRate();
const { prepareExecution, completeExecution } = useActionExecutor();

// Current egg state
const currentEggsDelivered = computed(() => truthEggsStore.eggsDelivered[virtueStore.currentEgg]);
const currentTE = computed(() => countTEThresholdsPassed(currentEggsDelivered.value));
const pendingTE = computed(() => truthEggsStore.pendingTEForEgg(virtueStore.currentEgg));

// Target TE selection
const targetTE = ref(Math.min(98, currentTE.value + 1));

// Reset target when egg changes
watch(() => virtueStore.currentEgg, () => {
  targetTE.value = Math.min(98, currentTE.value + 1);
});

// Ensure target is valid
watch(currentTE, (newCurrentTE) => {
  if (targetTE.value <= newCurrentTE) {
    targetTE.value = Math.min(98, newCurrentTE + 1);
  }
});

// Calculated values
const teGained = computed(() => Math.max(0, targetTE.value - currentTE.value));

const eggsToLay = computed(() => {
  if (teGained.value <= 0) return 0;
  return eggsNeededForTE(currentEggsDelivered.value, targetTE.value);
});

const timeToLaySeconds = computed(() => {
  if (eggsToLay.value <= 0) return 0;
  const ratePerSecond = layRateOutput.value.totalRatePerSecond;
  if (ratePerSecond <= 0) return Infinity;
  return eggsToLay.value / ratePerSecond;
});

// Validation
const canWait = computed(() =>
  teGained.value > 0 &&
  eggsToLay.value > 0 &&
  isFinite(timeToLaySeconds.value) &&
  targetTE.value <= 98
);

function handleWaitForTE() {
  if (!canWait.value) return;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  const payload = {
    egg: beforeSnapshot.currentEgg,
    targetTE: targetTE.value,
    teGained: teGained.value,
    eggsToLay: eggsToLay.value,
    timeSeconds: timeToLaySeconds.value,
  };

  const dependencies = computeDependencies('wait_for_te', payload, actionsStore.actions);

  // Apply to store - add eggs delivered (TE is calculated from thresholds)
  truthEggsStore.addEggsDelivered(payload.egg, payload.eggsToLay);

  // Complete execution
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'wait_for_te',
    payload,
    cost: 0, // Free action
    dependsOn: dependencies,
  }, beforeSnapshot);

  // Reset target for next action
  targetTE.value = Math.min(98, currentTE.value + 1);
}
</script>

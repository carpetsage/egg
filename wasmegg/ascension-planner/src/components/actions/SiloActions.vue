<template>
  <div class="space-y-4">
    <p class="text-sm text-gray-500 mb-4">
      Purchase silos to extend your offline/away time.
    </p>

    <!-- Current State -->
    <div class="bg-gray-50 rounded-lg p-4">
      <div class="flex justify-between items-center mb-3">
        <span class="text-sm font-medium text-gray-700">Silos Owned</span>
        <span class="text-lg font-mono">{{ siloOutput.siloCount }}/{{ siloOutput.maxSilos }}</span>
      </div>

      <!-- Silo Visual Grid -->
      <div class="grid grid-cols-5 gap-2 mb-4">
        <div
          v-for="index in siloOutput.maxSilos"
          :key="index"
          class="relative border-2 rounded-lg p-1 h-10 flex items-center justify-center transition-all"
          :class="
            index <= siloOutput.siloCount
              ? 'border-purple-300 bg-purple-50'
              : 'border-dashed border-gray-300 bg-gray-50'
          "
        >
          <img 
            v-if="index <= siloOutput.siloCount" 
            :src="`${baseUrl}static/img/silo.png`" 
            class="w-6 h-6 object-contain"
            alt="silo"
          />
          <span v-else class="text-gray-300">○</span>
          <span class="absolute -top-1 -right-1 text-[10px] text-gray-400">#{{ index }}</span>
        </div>
      </div>

      <!-- Total Away Time -->
      <div class="bg-purple-50 rounded-lg p-3 text-center">
        <p class="text-xs text-gray-500 mb-1">Total Away Time</p>
        <p class="text-2xl font-bold text-purple-700">{{ siloOutput.formatted }}</p>
        <p class="text-xs text-gray-500 mt-1">
          {{ siloOutput.siloCount }} silo{{ siloOutput.siloCount !== 1 ? 's' : '' }} × {{ siloOutput.minutesPerSilo }}m each
        </p>
      </div>
    </div>

    <!-- Silo Capacity Epic Research (info only) -->
    <div class="bg-gray-50 rounded-lg p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img :src="iconURL(getColleggtibleIconPath('silo_capacity'), 64)" class="w-6 h-6 object-contain" alt="Silo Capacity" />
          <div>
            <p class="text-sm font-medium text-gray-700">Silo Capacity</p>
            <p class="text-xs text-gray-500">Epic Research: +6 min/silo/level</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-sm font-medium text-gray-900">
            Level {{ siloOutput.siloCapacityLevel }}/20
          </span>
        </div>
      </div>
      <div class="mt-2 text-xs text-gray-500">
        Base: 60m +
        <span class="font-medium text-purple-600">{{ siloOutput.siloCapacityLevel * 6 }}m</span>
        = {{ siloOutput.minutesPerSilo }}m per silo
      </div>
    </div>

    <!-- Buy Silo Button -->
    <div v-if="siloOutput.canBuyMore">
      <button
        class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        @click="handleBuySilo"
      >
        <img :src="`${baseUrl}static/img/silo.png`" class="w-6 h-6 object-contain brightness-0 invert" alt="silo" />
        <span>Buy Silo #{{ siloOutput.siloCount + 1 }}</span>
        <span class="text-purple-200">·</span>
        <span class="font-medium">{{ formatNumber(siloOutput.nextSiloCost, 0) }} bocks</span>
      </button>
      <p class="text-xs text-gray-400 mt-2 text-center">
        +{{ siloOutput.minutesPerSilo }}m away time
      </p>
    </div>
    <div v-else class="text-center text-sm text-gray-500 py-2 bg-green-50 rounded-lg">
      Maximum silos reached (10/10)
    </div>

    <p class="text-xs text-gray-400">
      Silos store your offline earnings. More silos = longer time before production stops.
    </p>
  </div>
</template>

<script setup lang="ts">
import { useSiloTime } from '@/composables/useSiloTime';
import { useSilosStore } from '@/stores/silos';
import { useActionsStore } from '@/stores/actions';
import { computeCurrentSnapshot, computeDeltas } from '@/lib/actions/snapshot';
import { computeDependencies } from '@/lib/actions/executor';
import { formatNumber } from '@/lib/format';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';
import { generateActionId } from '@/types';

const silosStore = useSilosStore();
const actionsStore = useActionsStore();
const { output: siloOutput } = useSiloTime();

const baseUrl = import.meta.env.BASE_URL;

function handleBuySilo() {
  if (!siloOutput.value.canBuyMore) return;

  const fromCount = siloOutput.value.siloCount;
  const toCount = fromCount + 1;

  // Get state before action
  const beforeSnapshot = actionsStore.currentSnapshot;

  // Build payload
  const payload = {
    fromCount,
    toCount,
  };

  // Compute dependencies
  const dependencies = computeDependencies('buy_silo', payload, actionsStore.actions);

  // Apply to store
  silosStore.buySilo();

  // Get state after action
  const afterSnapshot = computeCurrentSnapshot();
  const deltas = computeDeltas(beforeSnapshot, afterSnapshot);

  // Cost is calculated based on fromCount (silos owned before purchase)
  const cost = siloOutput.value.nextSiloCost;

  // Add action to history
  actionsStore.pushAction({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'buy_silo',
    payload,
    cost,
    elrDelta: deltas.elrDelta,
    offlineEarningsDelta: deltas.offlineEarningsDelta,
    endState: afterSnapshot,
    dependsOn: dependencies,
  });
}
</script>

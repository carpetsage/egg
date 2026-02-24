<template>
  <div class="overflow-x-auto">
    <table class="w-full text-xs border-collapse">
      <thead>
        <tr class="border-b border-gray-300">
          <th class="text-left p-2 w-28">Ship</th>
          <th class="text-center p-2" v-for="dur in ALL_DURATIONS" :key="dur">
            {{ DURATION_NAMES[dur] }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="ship in ALL_SHIPS"
          :key="ship"
          class="border-b border-gray-100"
          :class="{ 'opacity-40': !canAfford(ship) }"
        >
          <!-- Ship column -->
          <td class="p-2 align-top">
            <div class="flex items-center gap-1.5 mb-0.5">
              <img
                :src="iconURL(SHIP_INFO[ship].iconPath, 64)"
                class="w-6 h-6 object-contain flex-shrink-0"
                :alt="SHIP_INFO[ship].displayName"
              />
              <span class="font-medium text-gray-800 leading-tight">
                {{ SHIP_INFO[ship].displayName }}
              </span>
            </div>
            <div class="text-gray-500 pl-7.5">
              {{ formatGemPrice(SHIP_INFO[ship].price) }}
            </div>
            <div class="text-gray-400 pl-7.5">
              save: {{ formatDuration(saveTime(ship)) }}
            </div>
          </td>

          <!-- Duration cells -->
          <td
            v-for="dur in ALL_DURATIONS"
            :key="dur"
            class="p-2 align-top text-center"
          >
            <!-- Duration -->
            <div class="font-mono text-gray-700 mb-0.5">
              {{ formatDuration(getEffectiveDuration(ship, dur, ftlLevel)) }}
            </div>

            <!-- Fuel requirements as egg icons -->
            <div class="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 mb-1">
              <span
                v-for="req in VIRTUE_FUEL_REQUIREMENTS[ship][dur]"
                :key="req.egg"
                class="inline-flex items-center gap-0.5"
              >
                <img
                  :src="iconURL(`egginc/egg_${req.egg}.png`, 32)"
                  class="w-3.5 h-3.5 object-contain"
                  :alt="req.egg"
                />
                <span class="text-gray-600">{{ formatNumber(req.amount, 0) }}</span>
              </span>
            </div>

            <!-- Max and input -->
            <div class="flex items-center justify-center gap-1">
              <span class="text-gray-400">max:{{ maxCount(ship, dur) > 99 ? '>99' : maxCount(ship, dur) }}</span>
              <input
                type="number"
                min="0"
                :max="maxCount(ship, dur)"
                :value="rocketsStore.getCount(ship, dur)"
                :disabled="maxCount(ship, dur) === 0 && rocketsStore.getCount(ship, dur) === 0"
                class="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs
                       focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none
                       disabled:opacity-40 disabled:cursor-not-allowed"
                :class="{ 'border-red-400 bg-red-50': isOverMax(ship, dur) }"
                @input="handleInput(ship, dur, $event)"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { iconURL } from 'lib';
import { useRocketsStore } from '@/stores/rockets';
import { useActionsStore } from '@/stores/actions';
import {
  ALL_SHIPS,
  ALL_DURATIONS,
  DURATION_NAMES,
  SHIP_INFO,
  VIRTUE_FUEL_REQUIREMENTS,
  getEffectiveDuration,
  type Spaceship,
  type DurationType,
} from '@/lib/missions';
import { formatNumber, formatGemPrice, formatDuration } from '@/lib/format';
import { getTimeToSave } from '@/engine/apply';

const props = defineProps<{
  ftlLevel: number;
  earningsPerSecond: number;
}>();

const rocketsStore = useRocketsStore();
const actionsStore = useActionsStore();

function canAfford(ship: Spaceship): boolean {
  return props.earningsPerSecond > 0;
}

function saveTime(ship: Spaceship): number {
  const price = SHIP_INFO[ship].price;
  const snapshot = actionsStore.effectiveSnapshot;
  return getTimeToSave(price, snapshot);
}

function maxCount(ship: Spaceship, dur: DurationType): number {
  return rocketsStore.maxForMission(ship, dur);
}

function isOverMax(ship: Spaceship, dur: DurationType): boolean {
  return rocketsStore.getCount(ship, dur) > maxCount(ship, dur);
}

function handleInput(ship: Spaceship, dur: DurationType, event: Event) {
  const target = event.target as HTMLInputElement;
  let value = parseInt(target.value, 10);
  if (isNaN(value) || value < 0) value = 0;

  const max = maxCount(ship, dur);
  if (value > max) value = max;

  rocketsStore.setCount(ship, dur, value);
  target.value = String(value);
}
</script>

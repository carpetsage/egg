<template>
  <div class="space-y-4">
    <p class="text-sm text-gray-500">
      Plan rocket missions. Choose how many of each ship to send — fuel is drawn from your tank.
    </p>

    <!-- Fuel Tank Graphic -->
    <FuelTankGraphic
      :fuel-amounts="fuelTankStore.fuelAmounts"
      :committed="rocketsStore.totalFuelCost"
      :capacity="fuelTankStore.tankCapacity"
      :tank-level="fuelTankStore.tankLevel"
    />

    <!-- Mission Grid -->
    <MissionGrid
      :ftl-level="ftlLevel"
      :earnings-per-second="earningsPerSecond"
    />

    <!-- Mission Summary -->
    <MissionSummary
      :summary="summary"
      :schedule="schedule"
    />

    <!-- Launch Button -->
    <div v-if="rocketsStore.queuedMissions.length > 0" class="flex items-center gap-3">
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors
               disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        :disabled="rocketsStore.isOverBudget"
        @click="handleLaunch"
      >
        Launch {{ schedule.totalMissions }} Missions
      </button>
      <button
        class="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
        @click="rocketsStore.clearAll()"
      >
        Clear All
      </button>
      <span v-if="rocketsStore.isOverBudget" class="text-red-500 text-xs">
        Not enough fuel in tank
      </span>
    </div>

    <!-- Pre-shift Launch Option -->
    <div v-if="schedule.totalMissions === 3" class="flex items-center gap-2 px-1">
      <input
        type="checkbox"
        id="zero-time-launch"
        v-model="isZeroTime"
        class="rounded text-blue-600"
      />
      <label for="zero-time-launch" class="text-xs text-gray-600 font-medium cursor-pointer select-none">
        Launch for 0 time (pre-shift sends)
      </label>
    </div>

    <p class="text-[11px] text-gray-500 leading-relaxed italic border-l-2 border-gray-200 pl-3 py-0.5">
      If you choose 3 launches, you will have the option to launch for 0 time. This is to handle the case where you send ships right before shifting, so it should not add time to the length of your ascension.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useRocketsStore } from '@/stores/rockets';
import { useActionsStore } from '@/stores/actions';
import { useInitialStateStore } from '@/stores/initialState';
import { useEarnings } from '@/composables/useEarnings';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId, VIRTUE_EGGS } from '@/types';
import type { VirtueEgg, LaunchMissionEntry } from '@/types';

import FuelTankGraphic from './rockets/FuelTankGraphic.vue';
import MissionGrid from './rockets/MissionGrid.vue';
import MissionSummary from './rockets/MissionSummary.vue';

const fuelTankStore = useFuelTankStore();
const rocketsStore = useRocketsStore();
const actionsStore = useActionsStore();
const initialStateStore = useInitialStateStore();
const { output: earningsOutput } = useEarnings();
const { prepareExecution, completeExecution } = useActionExecutor();

const isZeroTime = ref(false);

const ftlLevel = computed(() =>
  initialStateStore.epicResearchLevels['afx_mission_time'] || 0
);

const earningsPerSecond = computed(() =>
  earningsOutput.value.onlineEarnings
);

const schedule = computed(() => rocketsStore.getSchedule(ftlLevel.value));
const summary = computed(() => rocketsStore.getSummary(ftlLevel.value));

function handleLaunch() {
  if (rocketsStore.isOverBudget || rocketsStore.queuedMissions.length === 0) return;

  const beforeSnapshot = prepareExecution();

  // Build mission entries for the payload
  const missions: LaunchMissionEntry[] = rocketsStore.queuedMissions.map(m => ({
    ship: m.ship,
    duration: m.duration,
    count: m.count,
  }));

  // Calculate total fuel consumed
  const fuelConsumed: Record<VirtueEgg, number> = {
    curiosity: 0, integrity: 0, humility: 0, resilience: 0, kindness: 0,
  };
  for (const egg of VIRTUE_EGGS) {
    fuelConsumed[egg] = rocketsStore.totalFuelCost[egg];
  }

  const scheduleResult = schedule.value;
  const isZeroTimeLaunch = isZeroTime.value && scheduleResult.totalMissions === 3;

  const payload = {
    missions,
    totalTimeSeconds: isZeroTimeLaunch ? 0 : scheduleResult.totalSeconds,
    totalMissions: scheduleResult.totalMissions,
    fuelConsumed,
  };

  const dependencies = computeDependencies('launch_missions', payload, actionsStore.actionsBeforeInsertion);

  // Deduct fuel from tank
  for (const egg of VIRTUE_EGGS) {
    if (fuelConsumed[egg] > 0) {
      const current = fuelTankStore.fuelAmounts[egg];
      fuelTankStore.setFuelAmount(egg, Math.max(0, current - fuelConsumed[egg]));
    }
  }

  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'launch_missions',
    payload,
    cost: 0,
    dependsOn: dependencies,
  }, beforeSnapshot);

  // Clear the mission queue
  rocketsStore.clearAll();
  isZeroTime.value = false;
}
</script>

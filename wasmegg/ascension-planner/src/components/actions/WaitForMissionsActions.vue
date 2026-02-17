<template>
  <div class="space-y-4">
    <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
      <p class="text-xs text-blue-700 leading-relaxed">
        <span class="font-bold">Info:</span> This tab displays missions that were in progress when your backup was taken. 
        You can "Wait" for them to return to account for their duration in your ascension plan.
      </p>
    </div>

    <ActiveMissionsDisplay
      :missions="initialStateStore.virtueMissions"
      :current-time-seconds="currentTimeSeconds"
      :start-unix="startUnix"
      @wait-missions="handleWaitMissions"
    />

    <div v-if="initialStateStore.virtueMissions.length === 0" class="flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
      <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
        <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.24 12.24a6 6 0 0 0-8.49-8.49M12 21.75V11.25m8.25 10.5h-16.5" />
        </svg>
      </div>
      <h3 class="text-sm font-bold text-gray-900 mb-1">No Active Missions</h3>
      <p class="text-xs text-gray-500 max-w-xs">
        There are no active virtue missions found in your last backup. 
        Once missions return, use the "Rockets" tab to plan new launches.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { generateActionId } from '@/types';
import { computeDependencies } from '@/lib/actions/executor';
import { useVirtueStore } from '@/stores/virtue';
import ActiveMissionsDisplay from './rockets/ActiveMissionsDisplay.vue';

const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();
const { prepareExecution, completeExecution } = useActionExecutor();

const currentTimeSeconds = computed(() => actionsStore.effectiveSnapshot.lastStepTime);

const startUnix = computed(() => {
  const { ascensionDate, ascensionTime } = virtueStore;
  const dateTimeStr = `${ascensionDate}T${ascensionTime}:00`;
  try {
    return new Date(dateTimeStr).getTime() / 1000;
  } catch {
    return Date.now() / 1000;
  }
});

function handleWaitMissions() {
  const missions = initialStateStore.virtueMissions;
  if (missions.length === 0) return;

  const maxReturn = Math.max(...missions.map(m => m.returnTimestamp || 0));
  const waitSeconds = Math.max(0, (maxReturn - startUnix.value) - currentTimeSeconds.value);

  if (waitSeconds <= 0) return;

  const beforeSnapshot = prepareExecution();

  const payload = {
    missions: JSON.parse(JSON.stringify(missions)),
    totalTimeSeconds: waitSeconds,
  };

  const dependencies = computeDependencies('wait_for_missions', payload, actionsStore.actionsBeforeInsertion);

  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'wait_for_missions',
    payload,
    cost: 0,
    dependsOn: dependencies,
  }, beforeSnapshot);
}
</script>

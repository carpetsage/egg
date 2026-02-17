<template>
  <div class="space-y-4">
    <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-2">
      <p class="text-xs text-indigo-700 leading-relaxed">
        <span class="font-bold">Info:</span> Log a period of rest or sleep.This is meant to allow you to schedule misisons in batches while allowing for sleep at night.
      </p>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="flex items-center gap-2 mb-4">
        <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden p-1">
          <img :src="iconURL('egginc/tiny_indicator_waiting.png', 64)" class="w-full h-full object-contain" />
        </div>
        <span class="text-sm font-medium text-gray-700">Add Sleep/Rest Period</span>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Duration
          </label>
          <div class="flex gap-2">
            <input
              v-model="inputDuration"
              type="text"
              placeholder="e.g. 8 or 8h30m"
              class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              @keyup.enter="handleWaitSleep"
            />
            <button
              class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!isValid"
              @click="handleWaitSleep"
            >
              Add Wait
            </button>
          </div>
          <p class="mt-2 text-[10px] text-gray-400">
            Enter hours (e.g. <span class="font-mono">8</span> for 8h) or format like <span class="font-mono">1d12h</span>.
          </p>
        </div>

        <div v-if="parsedSeconds > 0" class="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center transition-all animate-in fade-in slide-in-from-top-1">
          <span class="text-xs text-gray-500">Wait Duration:</span>
          <span class="text-sm font-mono font-bold text-indigo-600">
            {{ formatDuration(parsedSeconds) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { iconURL } from 'lib';
import { useActionsStore } from '@/stores/actions';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { generateActionId } from '@/types';
import { computeDependencies } from '@/lib/actions/executor';
import { formatDuration, parseDuration } from '@/lib/format';

const actionsStore = useActionsStore();
const { prepareExecution, completeExecution } = useActionExecutor();

const inputDuration = ref('');

const parsedSeconds = computed(() => {
  const seconds = parseDuration(inputDuration.value);
  return isNaN(seconds) ? 0 : seconds;
});

const isValid = computed(() => parsedSeconds.value > 0);

function handleWaitSleep() {
  if (!isValid.value) return;

  const beforeSnapshot = prepareExecution();

  const payload = {
    totalTimeSeconds: parsedSeconds.value,
  };

  const dependencies = computeDependencies('wait_for_sleep', payload, actionsStore.actionsBeforeInsertion);

  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'wait_for_sleep',
    payload,
    cost: 0,
    dependsOn: dependencies,
  }, beforeSnapshot);

  inputDuration.value = '';
}
</script>

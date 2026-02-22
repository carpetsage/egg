<template>
  <div class="space-y-6">
    <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div>
        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          Duration
        </label>
        <div class="flex gap-2">
          <input
            v-model="inputDuration"
            type="text"
            placeholder="e.g. 8 or 8h30m"
            class="flex-1 px-4 py-2.5 text-sm font-mono-premium font-bold bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 outline-none transition-all placeholder:text-slate-300"
            @keyup.enter="handleWaitTime"
          />
          <button
            class="btn-premium btn-primary px-6 py-2.5 text-xs flex-shrink-0"
            :disabled="!isValid"
            @click="handleWaitTime"
          >
            Add Wait
          </button>
        </div>
        <p class="mt-3 text-[10px] text-slate-400 font-medium leading-relaxed">
          Enter hours (e.g. <span class="font-mono-premium text-slate-600 bg-slate-100 px-1 py-0.5 rounded">8</span> for 8h) or format like <span class="font-mono-premium text-slate-600 bg-slate-100 px-1 py-0.5 rounded">1d12h</span>.
        </p>
      </div>

      <div v-if="parsedSeconds > 0" class="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center transition-all animate-in fade-in slide-in-from-top-2">
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wait Duration:</span>
        <span class="text-sm font-mono-premium font-black text-slate-900">
          {{ formatDuration(parsedSeconds) }}
        </span>
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

function handleWaitTime() {
  if (!isValid.value) return;

  const beforeSnapshot = prepareExecution();

  const payload = {
    totalTimeSeconds: parsedSeconds.value,
  };

  const dependencies = computeDependencies('wait_for_time', payload, actionsStore.actionsBeforeInsertion);

  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'wait_for_time',
    payload,
    cost: 0,
    dependsOn: dependencies,
  }, beforeSnapshot);

  inputDuration.value = '';
}
</script>

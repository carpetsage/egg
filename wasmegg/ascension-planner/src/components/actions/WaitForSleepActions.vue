<template>
  <div class="space-y-6">
    <div class="bg-slate-50 border border-slate-100/50 rounded-2xl p-5 shadow-inner">
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center p-1.5 flex-shrink-0">
          <svg class="w-full h-full text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-[11px] font-medium text-slate-700 leading-relaxed">
          <span class="font-black uppercase tracking-widest text-[9px] block mb-1">Info:</span>
          Log a period of rest or sleep.This is meant to allow you to schedule misisons in batches while allowing for sleep at night.
        </p>
      </div>
    </div>

    <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
        <div class="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm p-1.5">
          <img :src="iconURL('egginc/tiny_indicator_waiting.png', 64)" class="w-full h-full object-contain" />
        </div>
        <span class="text-xs font-bold text-slate-700 uppercase tracking-tight">Add Sleep/Rest Period</span>
      </div>

      <div class="space-y-5">
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
              @keyup.enter="handleWaitSleep"
            />
            <button
              class="btn-premium btn-primary px-6 py-2.5 text-xs flex-shrink-0"
              :disabled="!isValid"
              @click="handleWaitSleep"
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

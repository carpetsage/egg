<template>
  <div class="space-y-6">
    <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div>
        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3"> Duration </label>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            v-model="inputDuration"
            type="text"
            placeholder="e.g. 8 or 8h30m"
            class="w-full sm:flex-1 px-4 py-2.5 text-sm font-mono-premium font-bold bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 outline-none transition-all placeholder:text-slate-300"
            @keyup.enter="handleWaitTime"
          />
          <button
            class="btn-premium btn-primary w-full sm:w-auto px-6 py-2.5 text-xs flex-shrink-0"
            :disabled="!isValid"
            @click="handleWaitTime"
          >
            Add Wait
          </button>
        </div>
        <p class="mt-3 text-[10px] text-slate-400 font-medium leading-relaxed">
          Enter hours (e.g. <span class="font-mono-premium text-slate-600 bg-slate-100 px-1 py-0.5 rounded">8</span> for
          8h) or format like
          <span class="font-mono-premium text-slate-600 bg-slate-100 px-1 py-0.5 rounded">1d12h</span>.
        </p>
      </div>

      <div
        v-if="parsedSeconds > 0"
        class="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2"
      >
        <!-- Duration Display -->
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center transition-all">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wait Duration:</span>
          <span class="text-sm font-mono-premium font-black text-slate-900">
            {{ formatDuration(parsedSeconds) }}
          </span>
        </div>

        <!-- End Date/Time Display -->
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center transition-all">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimated End:</span>
          <div class="text-right">
            <div class="text-sm font-mono-premium font-black text-slate-900">
              {{ formatAbsoluteTime(parsedSeconds, baseTimestamp, virtueStore.ascensionTimezone) }}
            </div>
          </div>
        </div>

        <!-- Warning Message -->
        <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 transition-all">
          <svg class="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="text-[10px] text-amber-700 font-medium leading-relaxed">
            During this wait, you will not earn gems, your chicken population will not grow, and no eggs will be shipped.
          </p>
        </div>
      </div>
    </div>

    <EventExpiryDialog
      v-if="showExpiryDialog"
      :event-name="expiryData.eventName"
      :end-time="expiryData.endTime"
      :completion-time="expiryData.completionTime"
      @confirm="handleExpiryConfirm"
      @cancel="handleExpiryCancel"
      @deactivate="handleExpiryDeactivate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { generateActionId } from '@/types';
import { computeDependencies } from '@/lib/actions/executor';
import { formatDuration, parseDuration, formatAbsoluteTime } from '@/lib/format';
import { useEventExpiry } from '@/composables/useEventExpiry';
import EventExpiryDialog from '../EventExpiryDialog.vue';

const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();
const { prepareExecution, completeExecution } = useActionExecutor();
const {
  showExpiryDialog,
  expiryData,
  withExpiryCheck,
  confirm: handleExpiryConfirm,
  cancel: handleExpiryCancel,
  deactivateAndCancel: handleExpiryDeactivate,
} = useEventExpiry();

const inputDuration = ref('');

const parsedSeconds = computed(() => {
  const seconds = parseDuration(inputDuration.value);
  return isNaN(seconds) ? 0 : seconds;
});

const isValid = computed(() => parsedSeconds.value > 0);

const baseTimestamp = computed(() => {
  const startTime = virtueStore.planStartTime.getTime();
  const offset = actionsStore.planStartOffset;
  // Wall clock time = (Plan Start) + (Current Sim Time - Initial Sim Time)
  return startTime + (actionsStore.effectiveSnapshot.lastStepTime - offset) * 1000;
});

function handleWaitTime() {
  if (!isValid.value) return;

  const duration = parsedSeconds.value;

  // We check both events because any time addition could cross either
  withExpiryCheck(duration, true, () => {
    const beforeSnapshot = prepareExecution();

    const payload = {
      totalTimeSeconds: duration,
    };

    const dependencies = computeDependencies(
      'wait_for_no_earnings',
      payload,
      actionsStore.actionsBeforeInsertion,
      actionsStore.initialSnapshot.researchLevels
    );

    completeExecution(
      {
        id: generateActionId(),
        timestamp: Date.now(),
        type: 'wait_for_no_earnings',
        payload,
        cost: 0,
        dependsOn: dependencies,
      },
      beforeSnapshot
    );

    inputDuration.value = '';
  });
}
</script>

<template>
  <div class="card-premium p-4 mb-1">
    <div class="flex flex-col gap-3">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-slate-800">
          <div class="p-1 bg-brand-primary rounded shadow-sm text-white">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span class="text-xs font-bold uppercase tracking-widest">Smart Buy</span>
        </div>
        <div
          class="badge-premium transition-colors duration-300"
          :class="alwaysOn ? 'badge-brand' : 'bg-slate-100 text-slate-500'"
        >
          {{ alwaysOn ? 'Enabled' : 'Disabled' }}
        </div>
      </div>

      <!-- Description and Input -->
      <div class="space-y-2">
        <p class="text-[11px] text-slate-700 leading-relaxed font-medium">
          Smart-buy will auto-buy any research that requires less than
          <span
            class="font-mono font-bold text-brand-primary bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm mx-0.5"
            >{{ displayDuration }}</span
          >
          time to save.
        </p>

        <div class="relative group">
          <input
            v-model="timeValue"
            type="text"
            placeholder="Threshold (e.g. 1h 30m or 100s)"
            class="input-premium pl-3 pr-10"
          />
          <div
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 group-focus-within:text-brand-primary transition-colors uppercase tracking-widest pointer-events-none"
          >
            Time
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2 pt-0.5">
        <button
          :disabled="alwaysOn || isInvalid"
          @click="emit('buy', parsedSeconds)"
          class="btn-premium btn-primary flex-1 text-[10px]"
        >
          One-time Purchase
        </button>
        <button
          :disabled="isInvalid"
          @click="emit('update:alwaysOn', !alwaysOn)"
          class="btn-premium flex-1 text-[10px]"
          :class="alwaysOn ? 'btn-primary' : 'btn-secondary'"
        >
          Always On
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { formatDuration, parseDuration } from '@/lib/format';

const props = defineProps<{
  alwaysOn: boolean;
}>();

const emit = defineEmits<{
  (e: 'buy', thresholdSeconds: number): void;
  (e: 'update', state: { threshold: number; alwaysOn: boolean }): void;
  (e: 'update:alwaysOn', value: boolean): void;
}>();

const timeValue = ref('1s');

const parsedSeconds = computed(() => {
  const seconds = parseDuration(timeValue.value);
  return isNaN(seconds) ? 0 : seconds;
});

// Emit updates whenever state changes
watch(
  [parsedSeconds, () => props.alwaysOn],
  ([threshold, alwaysOn]) => {
    emit('update', { threshold, alwaysOn });
  },
  { immediate: true }
);

const isInvalid = computed(() => parsedSeconds.value <= 0 && timeValue.value !== '');

const displayDuration = computed(() => {
  if (parsedSeconds.value <= 0) return '0s';
  return formatDuration(parsedSeconds.value);
});

// Disable Always On whenever the user changes the threshold input
watch(timeValue, () => {
  emit('update:alwaysOn', false);
});
</script>

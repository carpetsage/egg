<template>
  <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm mb-1">
    <div class="flex flex-col gap-3">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-indigo-900">
          <div class="p-1 bg-indigo-500 rounded shadow-sm text-white">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span class="text-xs font-bold uppercase tracking-widest">Smart Buy</span>
        </div>
        <div 
          class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors duration-300"
          :class="isAlwaysOn ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-200 text-gray-500'"
        >
          {{ isAlwaysOn ? 'Enabled' : 'Disabled' }}
        </div>
      </div>

      <!-- Description and Input -->
      <div class="space-y-2">
        <p class="text-[11px] text-indigo-800 leading-relaxed font-medium">
          Smart-buy will auto-buy any research that requires less than 
          <span class="font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100 shadow-sm mx-0.5">{{ displayDuration }}</span> 
          time to save.
        </p>
        
        <div class="relative group">
          <input 
            v-model="timeValue"
            type="text" 
            placeholder="Threshold (e.g. 1h 30m or 100s)"
            class="w-full pl-3 pr-10 py-2 text-xs bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all shadow-inner"
          />
          <div class="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-300 group-focus-within:text-indigo-500 transition-colors uppercase tracking-widest pointer-events-none">
            Time
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2 pt-0.5 uppercase tracking-wider">
        <button 
          :disabled="isAlwaysOn || isInvalid"
          @click="emit('buy', parsedSeconds)"
          class="flex-1 px-3 py-2 text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all active:scale-[0.97] shadow-md hover:shadow-indigo-200 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none"
        >
          One-time Purchase
        </button>
        <button 
          :disabled="isInvalid"
          @click="isAlwaysOn = !isAlwaysOn"
          class="flex-1 px-3 py-2 text-[10px] font-black border-2 rounded-lg transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          :class="isAlwaysOn 
            ? 'bg-indigo-100 border-indigo-600 text-indigo-700 shadow-inner' 
            : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 shadow-sm'"
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

const emit = defineEmits<{
  (e: 'buy', thresholdSeconds: number): void;
  (e: 'update', state: { threshold: number; alwaysOn: boolean }): void;
}>();

const timeValue = ref('1s');
const isAlwaysOn = ref(false);

const parsedSeconds = computed(() => {
  const seconds = parseDuration(timeValue.value);
  return isNaN(seconds) ? 0 : seconds;
});

// Emit updates whenever state changes
watch([parsedSeconds, isAlwaysOn], ([threshold, alwaysOn]) => {
  emit('update', { threshold, alwaysOn });
}, { immediate: true });

const isInvalid = computed(() => parsedSeconds.value <= 0 && timeValue.value !== '');

const displayDuration = computed(() => {
  if (parsedSeconds.value <= 0) return '0s';
  return formatDuration(parsedSeconds.value);
});

// Disable Always On whenever the user changes the threshold input
watch(timeValue, () => {
  isAlwaysOn.value = false;
});
</script>

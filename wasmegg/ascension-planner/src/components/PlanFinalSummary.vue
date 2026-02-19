<template>
  <div
    class="fixed bottom-0 left-0 right-0 z-[5] bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] transition-all duration-300"
  >
    <div class="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-6">
      <!-- Start Date -->
      <div class="summary-item">
        <span class="summary-label">Start Date</span>
        <span class="summary-value text-slate-900">{{ formatDateTime(startDate) }}</span>
      </div>

      <!-- Duration -->
      <div class="summary-item">
        <span class="summary-label">Duration</span>
        <span class="summary-value font-mono-premium font-black text-slate-600">{{ formattedDuration }}</span>
      </div>

      <!-- End Date -->
      <div class="summary-item">
        <span class="summary-label">End Date</span>
        <span class="summary-value text-slate-900">{{ formatDateTime(endDate) }}</span>
      </div>

      <!-- Shifts -->
      <div class="summary-item">
        <span class="summary-label">Shifts</span>
        <div class="flex items-center gap-2">
          <span class="summary-value font-mono-premium font-black text-slate-600">{{ shiftCount }}</span>
          <span v-if="totalShiftCost > 0" class="badge-premium bg-slate-50 text-slate-700/70 border border-slate-100 px-2 py-0.5 whitespace-nowrap lowercase">
            ({{ formatNumber(totalShiftCost, 3) }} SE <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3.5 h-3.5 inline-block -mt-1 ml-0.5" alt="SE" />)
          </span>
        </div>
      </div>

      <!-- TE Gained -->
      <div class="summary-item">
        <span class="summary-label">TE Gained</span>
        <div class="flex items-center gap-2">
          <span class="summary-value font-mono-premium font-black text-slate-600">+{{ teGained }}</span>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
            (Total: {{ currentTE }})
          </span>
        </div>
      </div>

      <!-- Actions Group -->
      <div class="flex items-center gap-2">
        <div class="flex items-center rounded-2xl bg-slate-50 border border-slate-100 p-1 shadow-inner">
          <button
            class="btn-icon-premium"
            v-tippy="'Export and Download Plan'"
            @click="handleExport"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            class="btn-icon-premium"
            v-tippy="'Upload and Import Plan'"
            @click="triggerImport"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
        </div>
        
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleImport"
        />

        <div class="w-px h-8 bg-slate-100 mx-1"></div>

        <!-- Details Button -->
        <button
          class="btn-icon-premium bg-slate-900 border-slate-800 text-white hover:bg-slate-800 hover:scale-110 shadow-lg shadow-slate-200"
          v-tippy="'View final state calculation details'"
          @click="$emit('show-details')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        
        <span class="ml-4 text-[10px] text-slate-400 italic font-medium">Developed by <span @click="triggerCat" class="cursor-text select-text">joobrainie</span></span>
      </div>
    </div>

    <!-- Cat Gif Popup -->
    <div 
      v-if="showCat" 
      class="fixed inset-x-0 bottom-24 z-[100] flex justify-center pointer-events-none transition-opacity duration-1000 ease-out"
      :class="{ 'opacity-0': isFadingOut, 'opacity-100': !isFadingOut }"
    >
      <div class="bg-white p-2 rounded-2xl shadow-2xl border border-slate-100 transform rotate-2">
        <img 
          :src="catGifUrl" 
          class="max-w-[200px] max-h-[200px] rounded-xl object-cover block" 
          alt="Random Cat"
          @error="showCat = false" 
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useActionsStore } from '@/stores/actions';
import { useInitialStateStore } from '@/stores/initialState';
import { useVirtueStore } from '@/stores/virtue';

import { countTEThresholdsPassed } from '@/lib/truthEggs';
import { formatNumber } from '@/lib/format';
import { iconURL } from 'lib';

const actionsStore = useActionsStore();
const initialStateStore = useInitialStateStore();
const virtueStore = useVirtueStore();

defineEmits<{
  'show-details': [];
}>();

const calculateTotalPotentialTE = (snapshot: any) => {
  if (!snapshot || !snapshot.eggsDelivered) return 0;
  return Object.values(snapshot.eggsDelivered).reduce((sum: number, delivered: any) => {
    return sum + countTEThresholdsPassed(delivered as number);
  }, 0);
};

const startDate = computed(() => {
  // Use ascension date/time from virtue store as source of truth
  const dateStr = `${virtueStore.ascensionDate}T${virtueStore.ascensionTime}`;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
});

const totalDurationSeconds = computed(() => {
  return actionsStore.actions.reduce((sum, action) => {
    return sum + (action.totalTimeSeconds || 0);
  }, 0);
});

const formattedDuration = computed(() => {
  const seconds = totalDurationSeconds.value;
  if (seconds === 0) return '0s';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m${secs}s`;
  }

  return `${secs}s`;
});

const endDate = computed(() => {
  return new Date(startDate.value.getTime() + totalDurationSeconds.value * 1000);
});

const shiftCount = computed(() => {
  return actionsStore.actions.filter(a => a.type === 'shift').length;
});

const totalShiftCost = computed(() => {
  return actionsStore.actions
    .filter(a => a.type === 'shift')
    .reduce((sum, a) => sum + a.cost, 0);
});

const currentTE = computed(() => calculateTotalPotentialTE(actionsStore.currentSnapshot));
const initialClaimedTE = computed(() => virtueStore.initialTE);
const teGained = computed(() => currentTE.value - initialClaimedTE.value);

function formatDateTime(date: Date): string {
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Import/Export Logic
const fileInput = ref<HTMLInputElement | null>(null);

function handleExport() {
  actionsStore.exportPlan();
}

function triggerImport() {
  fileInput.value?.click();
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const jsonString = e.target?.result as string;
      
      if (actionsStore.actionCount > 0) {
        if (!confirm('Importing a plan will overwrite your current actions. Continue?')) {
          input.value = ''; // Reset input
          return;
        }
      }

      actionsStore.importPlan(jsonString);
    } catch (error) {
      console.error(error);
      alert('Failed to import plan: Invalid file format.');
    } finally {
      input.value = ''; // Reset for next use
    }
  };

  reader.readAsText(file);
}

// Cat Gif Logic
const showCat = ref(false);
const isFadingOut = ref(false);
const catGifUrl = ref('');
let fadeTimer: ReturnType<typeof setTimeout>;
let removeTimer: ReturnType<typeof setTimeout>;

function triggerCat() {
  clearTimeout(fadeTimer);
  clearTimeout(removeTimer);

  showCat.value = false;
  
  // Small delay to ensure DOM update if re-clicking
  setTimeout(() => {
    catGifUrl.value = `https://cataas.com/cat/gif?t=${Date.now()}`;
    showCat.value = true;
    isFadingOut.value = false;
    
    fadeTimer = setTimeout(() => {
      isFadingOut.value = true;
    }, 3000);

    removeTimer = setTimeout(() => {
      showCat.value = false;
    }, 4000); // 3s display + 1s fade
  }, 10);
}
</script>

<style scoped>
.summary-item {
  @apply flex flex-col gap-1;
}

.summary-label {
  @apply text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none;
}

.summary-value {
  @apply text-[13px] font-bold tracking-tight whitespace-nowrap;
}

.btn-icon-premium {
  @apply p-2 rounded-xl transition-all duration-300 flex items-center justify-center border border-transparent;
}

.btn-icon-premium:not(.text-white) {
  @apply text-slate-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-100 hover:shadow-sm;
}
</style>

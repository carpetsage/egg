<template>
  <div class="space-y-6">
    <!-- Form Card -->
    <div class="section-premium p-4 sm:p-8 max-w-4xl mx-auto mt-4 relative overflow-hidden">
      <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>

      <div class="relative z-10">
        <div class="flex items-center gap-4 mb-8">
          <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight">Auto-AP</h2>
        </div>

        <div class="space-y-8 relative">
          <!-- Generating overlay -->
          <div
            v-if="isGenerating"
            class="absolute -inset-4 bg-white/60 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-3xl transition-all duration-300"
          >
            <div class="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-500/10">
              <div class="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Form locked while calculating...</span>
            </div>
          </div>

          <div class="space-y-8">
            <SchedulingInputs />
            <VirtueProgressSection />

            <!-- Ascension Targets -->
            <div>
              <div class="flex items-center gap-3 mb-4 px-1">
                <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider">Ascension Targets</h3>
              </div>
              <div class="space-y-1.5">
                <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Target TE(s)</label>
                <div class="relative">
                  <input
                    ref="targetInput"
                    v-model="targetTE"
                    @input="handleTargetTEInput"
                    @keydown.enter="runGenerate()"
                    type="text"
                    class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-900 outline-none focus:border-indigo-500/50 transition-all pr-10"
                    placeholder="e.g. 300 400 490"
                  />
                  <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">TE</div>
                </div>
                <p class="text-[10px] font-bold text-slate-400 leading-relaxed px-1 mt-2">
                  Enter a sequence of target TEs separated by spaces to generate an entire multi-ascension chain at once.
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          class="btn-premium btn-primary w-full py-4 mt-8 text-sm shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
          :disabled="isGenerating || !isA1Dirty"
          @click="runGenerate()"
        >
          <span v-if="isGenerating">{{ generateProgress || 'Generating Plan...' }}</span>
          <span v-else>{{ ascensionChain.length > 0 ? 'Update Plan' : 'Generate Plan' }}</span>
        </button>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="ascensionChain.length > 0" class="max-w-4xl mx-auto space-y-6 pb-24 relative px-4 sm:px-0">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
        <h2 class="text-lg font-black text-slate-800 uppercase tracking-tight">Generated Roadmap</h2>
        <div class="flex flex-wrap justify-center items-center gap-3">
          <button
            @click="copySummary"
            :disabled="isGenerating"
            class="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {{ copySuccess ? 'Copied!' : 'Copy Summary' }}
          </button>
          <button
            @click="exportCurrentPlan"
            :disabled="isGenerating"
            class="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Plan
          </button>
        </div>
      </div>

      <div class="space-y-4">
        <AscensionOverview
          v-for="(result, idx) in bestResults"
          :key="idx"
          :summary="result.summary"
          :actions="result.actions"
          :index="idx"
          :total="ascensionChain.length"
          :target-t-e="result.targetTE"
          :result3-available="result.result3Available"
          @force-mode-change="handleToggleForceMode"
        />
      </div>

      <SimulationErrorAlert v-if="simulationError" :message="simulationError" />
    </div>

    <ChainSummaryBar :is-collapsed="isCollapsed" @toggle="isCollapsed = !isCollapsed" />

    <!-- Floating Progress Indicator -->
    <div
      v-if="isGenerating"
      class="fixed right-8 z-[200] bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/50 px-6 py-4 rounded-2xl shadow-2xl shadow-indigo-500/20 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-300 transition-[bottom] duration-500"
      :class="[ascensionChain.length >= 1 && !isCollapsed ? 'bottom-32' : 'bottom-8']"
    >
      <div class="w-6 h-6 border-3 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
      <div class="space-y-0.5 pr-2">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-400">Updating Roadmap</div>
        <div class="text-xs font-bold text-slate-200 font-mono-premium">{{ generateProgress || 'Calculating...' }}</div>
      </div>
    </div>

    <ValidationDialog
      :is-open="isValidationErrorOpen"
      :message="validationErrorMessage"
      @close="isValidationErrorOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useAutoPlannerStore } from '@/stores/autoPlanner';
import { useVirtueStore } from '@/stores/virtue';
import { useTruthEggsStore } from '@/stores/truthEggs';
import { useAscensionGenerator } from '@/auto/useAscensionGenerator';
import SchedulingInputs from './SchedulingInputs.vue';
import VirtueProgressSection from './VirtueProgressSection.vue';
import ChainSummaryBar from './ChainSummaryBar.vue';
import SimulationErrorAlert from './SimulationErrorAlert.vue';
import AscensionOverview from './AscensionOverview.vue';
import ValidationDialog from './ValidationDialog.vue';

const autoPlannerStore = useAutoPlannerStore();
const virtueStore = useVirtueStore();
const truthEggsStore = useTruthEggsStore();

const { ascensionChain, timezone, startDate, startTime, targetTE } = storeToRefs(autoPlannerStore);
const targetInput = ref<HTMLInputElement | null>(null);
const isCollapsed = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

// Initialize timezone default
if (!timezone.value) {
  timezone.value = virtueStore.ascensionTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Initialize start date/time defaults
const now = new Date();
if (!startDate.value) {
  startDate.value = new Intl.DateTimeFormat('en-CA', { timeZone: timezone.value }).format(now);
}
if (!startTime.value) {
  startTime.value = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone.value,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

// Initialize Target TE to current + 30 once store data loads
let targetTEInitialized = false;
watch(
  () => truthEggsStore.totalTE,
  newVal => {
    if (newVal > 0 && !targetTEInitialized) {
      if (!targetTE.value) targetTE.value = String(Math.min(490, newVal + 30));
      targetTEInitialized = true;
    }
  },
  { immediate: true }
);

const {
  isGenerating,
  generateProgress,
  simulationError,
  isValidationErrorOpen,
  validationErrorMessage,
  copySuccess,
  isA1Dirty,
  bestResults,
  generate,
  copySummary,
  exportCurrentPlan,
  handleToggleForceMode,
} = useAscensionGenerator();

const runGenerate = () => {
  generate(() => nextTick(() => targetInput.value?.focus()));
};

const handleTargetTEInput = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const formatted = input.value.replace(/\D+/g, ' ');
  targetTE.value = formatted.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
};
</script>

<style scoped>
.btn-premium {
  @apply rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3;
}
.btn-primary {
  @apply bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed;
}
.section-premium {
  @apply bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700;
}
.font-mono-premium {
  font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
}
</style>

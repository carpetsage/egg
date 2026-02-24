<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50"
        @click="$emit('close')"
      />

      <!-- Modal -->
      <div class="relative card-glass shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/40">
        <!-- Header -->
        <div class="sticky top-0 bg-white/70 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 class="text-lg font-bold text-slate-800 tracking-tight">
              Action Details
            </h2>
            <div class="flex items-center gap-3 mt-0.5">
              <p v-if="action" class="text-xs font-medium text-slate-500 italic">{{ displayName }}</p>
              <p v-else class="text-xs font-medium text-slate-500 italic">Full breakdown of current multipliers and rates</p>
              <button
                class="badge-premium bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors py-0.5 px-2"
                v-tippy="'Dump all calculation data to console for debugging'"
                @click="dumpCalculationData"
              >
                Dump Data
              </button>
            </div>
          </div>
          <button
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 rounded-xl transition-colors"
            @click="$emit('close')"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-6 scrollbar-premium">
          <!-- Deltas from previous (only show for non-start actions) -->
          <div v-if="action && action.type !== 'start_ascension'" class="section-premium p-5 mb-8 bg-slate-50/50">
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Deltas from previous state</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div class="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                <span class="text-xs font-bold text-slate-600 uppercase tracking-tight">ELR delta</span>
                <span :class="deltaClass(action.elrDelta)" class="font-mono-premium font-bold text-sm">
                  {{ formatDelta(action.elrDelta * 3600) }}/hr
                </span>
              </div>
              <div class="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                <span class="text-xs font-bold text-slate-600 uppercase tracking-tight">Earnings delta</span>
                <span :class="deltaClass(action.offlineEarningsDelta)" class="font-mono-premium font-bold text-sm">
                   {{ formatDelta(action.offlineEarningsDelta * 3600) }}/hr
                </span>
              </div>
              <div class="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                <span class="text-xs font-bold text-slate-600 uppercase tracking-tight">Population delta</span>
                <span :class="deltaClass(action.populationDelta)" class="font-mono-premium font-bold text-sm">
                   {{ formatDelta(action.populationDelta) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Full Calculation Details (reuse CalculationSummary) -->
          <CalculationSummary />
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-200/50 px-6 py-4 bg-slate-50/50 flex justify-end">
          <button
            class="btn-premium btn-secondary px-6"
            @click="$emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Action } from '@/types';
import { getExecutor } from '@/lib/actions';
import { formatNumber } from '@/lib/format';
import CalculationSummary from './CalculationSummary.vue';

// Composables and Stores for dumping data
import { useEggValue } from '@/composables/useEggValue';
import { useHabCapacity } from '@/composables/useHabCapacity';
import { useInternalHatcheryRate } from '@/composables/useInternalHatcheryRate';
import { useLayRate } from '@/composables/useLayRate';
import { useShippingCapacity } from '@/composables/useShippingCapacity';
import { useEffectiveLayRate } from '@/composables/useEffectiveLayRate';
import { useEarnings } from '@/composables/useEarnings';
import { useSiloTime } from '@/composables/useSiloTime';
import { useInitialStateStore } from '@/stores/initialState';
import { useCommonResearchStore } from '@/stores/commonResearch';

const props = defineProps<{
  action?: Action | null;
}>();

defineEmits<{
  'close': [];
}>();

const displayName = computed(() => {
  if (!props.action) return '';
  const executor = getExecutor(props.action.type);
  return executor.getDisplayName(props.action.payload);
});

function deltaClass(delta: number): string {
  if (delta > 0) return 'text-slate-900';
  return 'text-slate-400';
}

function formatDelta(delta: number): string {
  if (Math.abs(delta) < 0.001) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatNumber(delta, 2)}`;
}

// Data dump functionality for debugging
const { input: evInput, output: evOutput } = useEggValue();
const { input: hcInput, output: hcOutput } = useHabCapacity();
const { input: ihrInput, output: ihrOutput } = useInternalHatcheryRate();
const { input: lrInput, output: lrOutput } = useLayRate();
const { input: scInput, output: scOutput } = useShippingCapacity();
const { output: elrOutput } = useEffectiveLayRate();
const { input: ernInput, output: ernOutput } = useEarnings();
const { output: stOutput } = useSiloTime();
const initialStateStore = useInitialStateStore();
const commonResearchStore = useCommonResearchStore();

function dumpCalculationData() {
  const dump = {
    timestamp: new Date().toISOString(),
    context: props.action ? `State after Action #${props.action.index + 1}` : 'Current State',
    action: props.action,
    initialState: {
      colleggtibleModifiers: initialStateStore.colleggtibleModifiers,
      artifactModifiers: initialStateStore.artifactModifiers,
      epicResearchLevels: initialStateStore.epicResearchLevels,
      activeEgg: initialStateStore.currentFarmState?.eggType,
    },
    commonResearch: commonResearchStore.researchLevels,
    calculations: {
      eggValue: { input: evInput.value, output: evOutput.value },
      habCapacity: { input: hcInput.value, output: hcOutput.value },
      ihr: { input: ihrInput.value, output: ihrOutput.value },
      layRate: { input: lrInput.value, output: lrOutput.value },
      shipping: { input: scInput.value, output: scOutput.value },
      elr: { output: elrOutput.value },
      earnings: { input: ernInput.value, output: ernOutput.value },
      siloTime: { output: stOutput.value },
    }
  };

  console.log('CALCULATION_DUMP_START');
  console.log(JSON.stringify(dump, null, 2));
  console.log('CALCULATION_DUMP_END');
  alert('Calculation data dumped to console. Please share the output (between START and END markers) with the developer.');
}
</script>

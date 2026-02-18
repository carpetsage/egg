<template>
  <div class="space-y-6">
    <!-- Header Info -->
    <div class="bg-rose-50 border border-rose-100/50 rounded-2xl p-5 shadow-inner">
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-xl bg-white border border-rose-100 shadow-sm flex items-center justify-center p-1.5 flex-shrink-0">
          <svg class="w-full h-full text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p class="text-[11px] font-medium text-rose-700/80 leading-relaxed uppercase tracking-tight">
          <span class="font-black block mb-0.5">Persistence Protocol</span>
          Maintain presence through automated infrastructure. Silos extend your earnings window while offline.
        </p>
      </div>
    </div>

    <!-- Current State -->
    <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div class="flex justify-between items-center mb-5">
        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Infrastructure Status</h4>
        <div class="badge-premium bg-slate-50 text-slate-600 border-slate-100 px-3 py-1 flex items-center gap-1.5">
          <span class="text-[10px] font-black opacity-60 uppercase tracking-widest">Active:</span>
          <span class="text-sm font-mono-premium font-black text-slate-900">{{ siloOutput.siloCount }}/{{ siloOutput.maxSilos }}</span>
        </div>
      </div>

      <!-- Silo Visual Grid -->
      <div class="grid grid-cols-5 gap-3 mb-6">
        <div
          v-for="index in siloOutput.maxSilos"
          :key="index"
          class="relative rounded-xl h-14 flex items-center justify-center transition-all duration-300 border shadow-sm group overflow-hidden"
          :class="
            index <= siloOutput.siloCount
              ? 'border-indigo-100 bg-gradient-to-br from-indigo-50 to-white'
              : 'border-dashed border-slate-200 bg-slate-50/50 grayscale'
          "
        >
          <!-- Active Glow -->
          <div v-if="index <= siloOutput.siloCount" class="absolute inset-0 bg-indigo-500/5 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <img 
            v-if="index <= siloOutput.siloCount" 
            :src="`${baseUrl}static/img/silo.png`" 
            class="w-7 h-7 object-contain relative z-10 drop-shadow-sm group-hover:scale-110 transition-transform"
            alt="silo"
          />
          <div v-else class="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
          
          <span class="absolute bottom-1 right-1.5 text-[8px] font-black text-slate-300 uppercase">#{{ index }}</span>
        </div>
      </div>

      <!-- Total Away Time -->
      <div class="bg-slate-900 rounded-2xl p-5 text-center relative overflow-hidden shadow-lg shadow-indigo-900/10">
        <!-- Decoration -->
        <div class="absolute -left-4 -top-4 w-12 h-12 bg-indigo-500/10 rounded-full blur-xl"></div>
        <div class="absolute -right-4 -bottom-4 w-12 h-12 bg-purple-500/10 rounded-full blur-xl"></div>

        <p class="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 leading-none">Max Persistence Window</p>
        <p class="text-3xl font-mono-premium font-black text-white mb-2">{{ siloOutput.formatted }}</p>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {{ siloOutput.siloCount }} Unit{{ siloOutput.siloCount !== 1 ? 's' : '' }}
          </span>
          <div class="w-1 h-1 rounded-full bg-slate-700"></div>
          <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
            {{ siloOutput.minutesPerSilo }}m per unit
          </span>
        </div>
      </div>
    </div>

    <!-- Silo Capacity Epic Research -->
    <div class="bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-4 transition-all hover:bg-indigo-50/50 hover:shadow-md hover:shadow-indigo-500/5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center p-1.5 shadow-sm">
            <img :src="iconURL(getColleggtibleIconPath('silo_capacity'), 64)" class="w-full h-full object-contain" alt="Silo Capacity" />
          </div>
          <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Epic Efficiency</p>
            <p class="text-[11px] font-black text-indigo-900 uppercase">Silo Quality Research</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">Current Rank</span>
          <span class="text-xs font-mono-premium font-black text-indigo-700">
            Lvl {{ siloOutput.siloCapacityLevel }}/20
          </span>
        </div>
      </div>
      <div class="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight bg-white/50 p-2 rounded-lg border border-indigo-50/50 shadow-inner">
        <span class="opacity-60">Base: 60m</span>
        <div class="w-1 h-px bg-slate-300"></div>
        <span class="text-indigo-600">+ {{ siloOutput.siloCapacityLevel * 6 }}m research</span>
        <div class="w-1 h-px bg-slate-300"></div>
        <span class="text-slate-900">Total: {{ siloOutput.minutesPerSilo }}m</span>
      </div>
    </div>

    <!-- Buy Silo Button -->
    <div v-if="siloOutput.canBuyMore" class="space-y-3">
      <button
        class="btn-premium btn-primary w-full py-4 flex flex-col items-center gap-1 shadow-lg shadow-brand-primary/20"
        @click="handleBuySilo"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-black uppercase tracking-tight">Expand Capacity (Silo #{{ siloOutput.siloCount + 1 }})</span>
        </div>
        <div class="flex items-center gap-2 opacity-80">
          <span class="text-[10px] font-black uppercase tracking-widest">{{ formatGemPrice(siloOutput.nextSiloCost) }} Gems</span>
          <template v-if="timeToBuy">
            <div class="w-1 h-1 rounded-full bg-white/40"></div>
            <span class="text-[10px] font-mono-premium font-black uppercase tracking-widest">Ready in {{ timeToBuy }}</span>
          </template>
        </div>
      </button>
      <div class="flex items-center justify-center gap-2 px-2">
        <div class="flex-1 h-px bg-slate-100"></div>
        <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">+{{ siloOutput.minutesPerSilo }}m window expansion</span>
        <div class="flex-1 h-px bg-slate-100"></div>
      </div>
    </div>
    <div v-else class="flex flex-col items-center py-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 border-dashed">
      <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
        <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Maximum Strategic Capacity Reached</p>
      <span class="text-[9px] font-bold text-emerald-600/60 uppercase mt-0.5 tracking-tighter">10 units online and active</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSiloTime } from '@/composables/useSiloTime';
import { useSilosStore } from '@/stores/silos';
import { useActionsStore } from '@/stores/actions';
import { computeDependencies } from '@/lib/actions/executor';
import { formatNumber, formatGemPrice, formatDuration } from '@/lib/format';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';
import { generateActionId } from '@/types';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { computed } from 'vue';

const silosStore = useSilosStore();
const actionsStore = useActionsStore();
const { output: siloOutput } = useSiloTime();
const { prepareExecution, completeExecution } = useActionExecutor();

const baseUrl = import.meta.env.BASE_URL;

const timeToBuy = computed(() => {
  const price = siloOutput.value.nextSiloCost;
  if (price <= 0) return 'Free';

  const snapshot = actionsStore.effectiveSnapshot;
  const offlineEarnings = snapshot.offlineEarnings;

  if (offlineEarnings <= 0) return '∞';

  const seconds = price / offlineEarnings;
  if (seconds < 1) return 'Instant';
  return formatDuration(seconds);
});

function handleBuySilo() {
  if (!siloOutput.value.canBuyMore) return;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  const fromCount = beforeSnapshot.siloCount;
  const toCount = fromCount + 1;

  // Build payload
  const payload = {
    fromCount,
    toCount,
  };

  // Compute dependencies
  const dependencies = computeDependencies('buy_silo', payload, actionsStore.actionsBeforeInsertion);

  // Cost is calculated based on fromCount (silos owned before purchase)
  const cost = siloOutput.value.nextSiloCost;

  // Apply to store
  silosStore.buySilo();

  // Complete execution
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'buy_silo',
    payload,
    cost,
    dependsOn: dependencies,
  }, beforeSnapshot);
}
</script>

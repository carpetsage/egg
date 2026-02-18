<template>
  <div class="space-y-4">
    <p class="text-xs font-medium text-slate-500 mb-4 px-1 italic">
      Store eggs in your fuel tank for space missions.
    </p>

    <!-- Current Tank State -->
    <div class="section-premium p-5">
      <div class="flex justify-between items-end mb-4">
        <div>
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tank Capacity</div>
          <div class="text-xl font-bold text-slate-800 tracking-tight">
            {{ formatNumber(fuelTankStore.totalFuel, 1) }} <span class="text-slate-300 font-normal">/</span> {{ formatNumber(fuelTankStore.tankCapacity, 1) }}
          </div>
        </div>
        <div class="badge-premium badge-brand py-0.5">
          {{ fuelTankStore.fillPercent.toFixed(1) }}%
        </div>
      </div>

      <!-- Capacity Bar -->
      <div class="h-3.5 bg-slate-100 shadow-inner rounded-full overflow-hidden mb-6 border border-slate-200/50 relative">
        <div
          class="h-full transition-all duration-1000 ease-out relative"
          :class="fuelTankStore.fillPercent > 90 ? 'bg-danger' : fuelTankStore.fillPercent > 70 ? 'bg-warning' : 'bg-success'"
          :style="{ width: `${fuelTankStore.fillPercent}%` }"
        >
          <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
        </div>
      </div>

      <!-- Per-Egg Breakdown -->
      <div class="space-y-2">
        <div
          v-for="egg in VIRTUE_FUEL_ORDER"
          :key="egg"
          class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group"
        >
          <div class="w-8 h-8 flex-shrink-0 bg-white rounded-lg shadow-sm border border-slate-100 p-1 group-hover:scale-110 transition-transform">
            <img
              :src="iconURL(`egginc/egg_${egg}.png`, 64)"
              class="w-full h-full object-contain"
              :alt="egg"
            />
          </div>
          <span class="text-xs font-bold text-slate-600 uppercase tracking-tight">{{ VIRTUE_EGG_NAMES[egg] }}</span>
          <span class="text-sm font-mono-premium font-bold text-slate-700 flex-1 text-right tracking-tight">
            {{ formatNumber(fuelTankStore.fuelAmounts[egg], 1) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Store Fuel Section -->
    <div class="section-premium p-5">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 flex-shrink-0 bg-slate-50 rounded-xl p-1.5 border border-slate-100 shadow-inner">
          <img
            :src="iconURL(`egginc/egg_${virtueStore.currentEgg}.png`, 64)"
            class="w-full h-full object-contain drop-shadow-sm"
            :alt="virtueStore.currentEgg"
          />
        </div>
        <div>
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Production</div>
          <div class="text-sm font-bold text-slate-700">
            Store {{ VIRTUE_EGG_NAMES[virtueStore.currentEgg] }} Eggs
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 mb-4">
        <input
          v-model="amountInput"
          type="text"
          placeholder="e.g., 50B, 100T"
          class="input-premium flex-1 font-mono-premium font-bold py-2.5"
          @keyup.enter="handleStoreFuel"
        />
        <button
          class="btn-premium btn-primary px-6 py-2.5"
          :disabled="!canStore"
          @click="handleStoreFuel"
        >
          Store
        </button>
      </div>

      <!-- Time Estimate -->
      <div v-if="parsedAmount > 0" class="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</span>
          <span class="text-sm font-mono-premium font-bold text-slate-700">{{ formatNumber(parsedAmount, 1) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transit Time</span>
          <span class="text-sm font-mono-premium font-bold text-brand-primary">{{ formatDuration(timeToStoreSeconds) }}</span>
        </div>
        <div v-if="exceedsCapacity" class="flex items-center gap-2 text-red-500 text-[10px] font-bold mt-1 bg-red-50 p-2 rounded-lg border border-red-100">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
          <span>Exceeds capacity by {{ formatNumber(parsedAmount - fuelTankStore.availableCapacity, 1) }}</span>
        </div>
      </div>
    </div>

    <!-- Remove Fuel Section -->
    <div class="section-premium p-5">
      <div class="mb-5">
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tank Maintenance</div>
        <div class="text-sm font-bold text-slate-700">Remove Fuel Storage</div>
      </div>

      <div class="space-y-4">
        <div
          v-for="egg in VIRTUE_FUEL_ORDER"
          :key="egg"
          class="flex items-center gap-2"
        >
          <div class="w-8 h-8 flex-shrink-0 bg-slate-50 rounded-lg p-1 border border-slate-100 shadow-inner">
            <img
              :src="iconURL(`egginc/egg_${egg}.png`, 64)"
              class="w-full h-full object-contain drop-shadow-sm"
              :alt="egg"
            />
          </div>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">{{ VIRTUE_EGG_NAMES[egg] }}</span>
          
          <input
            v-model="removeInputs[egg]"
            type="text"
            placeholder="Amount"
            class="input-premium flex-1 font-mono-premium py-2 text-xs font-bold"
            @keyup.enter="handleRemoveFuel(egg)"
          />
          
          <button
            class="btn-premium btn-primary px-4 py-2 text-[10px] uppercase font-black tracking-widest"
            :disabled="!canRemove(egg)"
            @click="handleRemoveFuel(egg)"
          >
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- Tank Level Info -->
    <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
          <svg class="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <div>
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Tier</div>
          <div class="text-sm font-bold text-slate-700">Level {{ fuelTankStore.tankLevel }}/7</div>
        </div>
      </div>
      <div class="text-right">
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Capacity</div>
        <div class="text-sm font-mono-premium font-bold text-brand-primary">{{ formatNumber(fuelTankStore.tankCapacity, 1) }}</div>
      </div>
    </div>

    <p class="text-[10px] text-slate-400 text-center uppercase font-black tracking-widest opacity-60">
      Production rate calibrated to maximum habitat scale
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { iconURL } from 'lib';
import { useFuelTankStore, timeToStore } from '@/stores/fuelTank';
import { useVirtueStore } from '@/stores/virtue';
import { useActionsStore } from '@/stores/actions';
import { useEffectiveLayRate } from '@/composables/useEffectiveLayRate';
import { useTruthEggsStore } from '@/stores/truthEggs';
import { computeDependencies } from '@/lib/actions/executor';
import { formatNumber, formatDuration, parseNumber } from '@/lib/format';
import { generateActionId, VIRTUE_EGG_NAMES, type VirtueEgg } from '@/types';
import { VIRTUE_FUEL_ORDER } from '@/stores/fuelTank';
import { useActionExecutor } from '@/composables/useActionExecutor';

const fuelTankStore = useFuelTankStore();
const truthEggsStore = useTruthEggsStore();
const virtueStore = useVirtueStore();
const actionsStore = useActionsStore();
const { output: effectiveLayRateOutput } = useEffectiveLayRate();
const { prepareExecution, completeExecution } = useActionExecutor();

const amountInput = ref('');
const removeInputs = ref<Record<string, string>>({
  curiosity: '',
  integrity: '',
  humility: '',
  resilience: '',
  kindness: '',
});

// Parse input amount
const parsedAmount = computed(() => {
  if (!amountInput.value.trim()) return 0;
  const parsed = parseNumber(amountInput.value);
  return isNaN(parsed) ? 0 : parsed;
});

// Time calculation
const timeToStoreSeconds = computed(() => {
  if (parsedAmount.value <= 0) return 0;
  return timeToStore(parsedAmount.value, effectiveLayRateOutput.value.effectiveLayRate);
});

// Validation
const exceedsCapacity = computed(() => parsedAmount.value > fuelTankStore.availableCapacity);
const canStore = computed(() =>
  parsedAmount.value > 0 &&
  !exceedsCapacity.value &&
  isFinite(timeToStoreSeconds.value)
);

function canRemove(egg: VirtueEgg) {
  const input = removeInputs.value[egg];
  if (!input || !input.trim()) return false;
  const amount = parseNumber(input);
  return !isNaN(amount) && amount > 0 && fuelTankStore.fuelAmounts[egg] > 0;
}

function handleStoreFuel() {
  if (!canStore.value) return;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  const payload = {
    egg: beforeSnapshot.currentEgg,
    amount: parsedAmount.value,
    timeSeconds: timeToStoreSeconds.value,
  };

  const dependencies = computeDependencies('store_fuel', payload, actionsStore.actionsBeforeInsertion);

  // Apply to store
  fuelTankStore.addFuel(payload.egg, payload.amount);
  truthEggsStore.addEggsDelivered(payload.egg, payload.amount);

  // Complete execution
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'store_fuel',
    payload,
    cost: 0, // Free action
    dependsOn: dependencies,
  }, beforeSnapshot);

  // Clear input
  amountInput.value = '';
}

async function handleRemoveFuel(egg: VirtueEgg) {
  if (!canRemove(egg)) return;

  const input = removeInputs.value[egg];
  const amount = parseNumber(input);
  
  // Cap at current amount and update UI
  const currentAmount = fuelTankStore.fuelAmounts[egg];
  let actualToRemove = amount;
  if (amount > currentAmount) {
    actualToRemove = currentAmount;
    removeInputs.value[egg] = formatNumber(actualToRemove, 1);
  }
  
  if (actualToRemove <= 0) return;

  const beforeSnapshot = prepareExecution();

  const payload = {
    egg,
    amount: actualToRemove,
  };

  const dependencies = computeDependencies('remove_fuel', payload, actionsStore.actionsBeforeInsertion);

  // Apply to store
  fuelTankStore.removeFuel(egg, actualToRemove);

  // Complete execution
  await completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'remove_fuel',
    payload,
    cost: 0,
    dependsOn: dependencies,
  }, beforeSnapshot);

  removeInputs.value[egg] = '';
}
</script>

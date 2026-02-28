<template>
  <div class="space-y-4">
    <!-- Wait for Research Sale (Only on Curiosity) -->
    <div v-if="isCuriosity" class="flex flex-col gap-2">
      <button
        class="group relative overflow-hidden bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-2xl p-5 text-left transition-all hover:border-slate-200 hover:shadow-md active:scale-[0.98]"
        @click="handleWaitResearchSale"
      >
        <div class="flex justify-between items-start gap-4 mb-2">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center p-2 shadow-sm group-hover:scale-110 transition-transform"
            >
              <img :src="iconURL('egginc-extras/icon_research_sale.png', 64)" class="w-full h-full object-contain" />
            </div>
            <div>
              <h4 class="text-sm font-black text-slate-800 uppercase tracking-tight">Wait for Research Sale</h4>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Friday at +0</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-mono-premium font-black text-rose-500">
              {{ formatDuration(researchSaleWait) }}
            </span>
          </div>
        </div>
      </button>
    </div>

    <!-- Wait for 2x Earnings (All eggs) -->
    <div class="flex flex-col gap-2">
      <button
        class="group relative overflow-hidden bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-2xl p-5 text-left transition-all hover:border-slate-200 hover:shadow-md active:scale-[0.98]"
        @click="handleWaitEarningsBoost"
      >
        <div class="flex justify-between items-start gap-4 mb-2">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center p-2 shadow-sm group-hover:scale-110 transition-transform"
            >
              <img :src="iconURL('egginc-extras/icon_earnings_boost.png', 64)" class="w-full h-full object-contain" />
            </div>
            <div>
              <h4 class="text-sm font-black text-slate-800 uppercase tracking-tight">Wait for 2x Earnings</h4>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Monday at +0</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-mono-premium font-black text-orange-600">
              {{ formatDuration(earningsBoostWait) }}
            </span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { iconURL } from 'lib';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { useSalesStore } from '@/stores/sales';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { generateActionId } from '@/types';
import { computeDependencies } from '@/lib/actions/executor';
import { formatDuration } from '@/lib/format';
import { getNextPacificTime } from '@/lib/events';

const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();
const salesStore = useSalesStore();
const { prepareExecution, completeExecution, batch } = useActionExecutor();

const isCuriosity = computed(() => actionsStore.effectiveSnapshot.currentEgg === 'curiosity');

/**
 * Calculates the "Absolute Simulation Clock" in Unix seconds.
 * This is (Start Time) + (Current Simulation Seconds - Start Offset).
 * The offset ensures that T=0 in the plan maps to the date/time the user entered.
 */
const absoluteSimTime = computed(() => {
  const startSeconds = virtueStore.planStartTime.getTime() / 1000;
  const elapsedSeconds = actionsStore.effectiveSnapshot.lastStepTime;
  const offsetSeconds = actionsStore.planStartOffset;
  return startSeconds + (elapsedSeconds - offsetSeconds);
});

const researchSaleWait = computed(() => {
  const nextTime = getNextPacificTime(5, 9, absoluteSimTime.value);
  return Math.max(0, nextTime - absoluteSimTime.value);
});

const earningsBoostWait = computed(() => {
  const nextTime = getNextPacificTime(1, 9, absoluteSimTime.value);
  return Math.max(0, nextTime - absoluteSimTime.value);
});

async function handleWaitResearchSale() {
  await batch(async () => {
    // 1. Add Wait Action
    const waitBefore = prepareExecution();
    const waitId = generateActionId();
    const waitPayload = { totalTimeSeconds: researchSaleWait.value };

    await completeExecution(
      {
        id: waitId,
        timestamp: Date.now(),
        type: 'wait_for_research_sale',
        payload: waitPayload,
        cost: 0,
        dependsOn: computeDependencies(
          'wait_for_research_sale',
          waitPayload,
          actionsStore.actionsBeforeInsertion,
          actionsStore.initialSnapshot.researchLevels
        ),
      },
      waitBefore
    );

    // 2. Add Toggle Action
    const toggleBefore = prepareExecution();
    const togglePayload = {
      saleType: 'research' as const,
      active: true,
      multiplier: 0.3,
    };

    // Apply side effect to store
    salesStore.setSaleActive('research', true);

    await completeExecution(
      {
        id: generateActionId(),
        timestamp: Date.now() + 1,
        type: 'toggle_sale',
        payload: togglePayload,
        cost: 0,
        dependsOn: [waitId], // This ensures it stays after the wait
      },
      toggleBefore
    );
  });
}

async function handleWaitEarningsBoost() {
  await batch(async () => {
    // 1. Add Wait Action
    const waitBefore = prepareExecution();
    const waitId = generateActionId();
    const waitPayload = { totalTimeSeconds: earningsBoostWait.value };

    await completeExecution(
      {
        id: waitId,
        timestamp: Date.now(),
        type: 'wait_for_earnings_boost',
        payload: waitPayload,
        cost: 0,
        dependsOn: computeDependencies(
          'wait_for_earnings_boost',
          waitPayload,
          actionsStore.actionsBeforeInsertion,
          actionsStore.initialSnapshot.researchLevels
        ),
      },
      waitBefore
    );

    // 2. Add Toggle Action
    const toggleBefore = prepareExecution();
    const togglePayload = {
      active: true,
      multiplier: 2,
    };

    // Apply side effect to store
    salesStore.setEarningsBoost(true, 2);

    await completeExecution(
      {
        id: generateActionId(),
        timestamp: Date.now() + 1,
        type: 'toggle_earnings_boost',
        payload: togglePayload,
        cost: 0,
        dependsOn: [waitId], // This ensures it stays after the wait
      },
      toggleBefore
    );
  });
}
</script>

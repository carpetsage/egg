<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between bg-blue-50/50 p-3 rounded-xl border border-blue-100 mb-6">
      <div class="flex flex-col gap-0.5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
          <span class="text-[10px] font-bold text-blue-900 uppercase tracking-widest leading-none">Hab Sale</span>
        </div>
        <span class="text-[10px] text-blue-600/70 font-bold uppercase tracking-tighter">80% Discount Active</span>
      </div>
      <button
        class="relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none shadow-inner"
        :class="isHabSaleActive ? 'bg-blue-500' : 'bg-gray-200'"
        @click="handleToggleSale"
      >
        <span
          class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm"
          :class="isHabSaleActive ? 'translate-x-[22px]' : 'translate-x-1'"
        />
      </button>
    </div>

    <!-- Quick Upgrade Action -->
    <div v-if="canBuyMax" class="mb-6 -mt-2">
      <div class="flex flex-col gap-2">
        <button
          class="group flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white p-2.5 shadow-sm transition-all hover:border-blue-400 hover:bg-blue-50/50 active:scale-[0.98]"
          @click="handleBuyMax"
        >
          <div class="rounded-lg bg-blue-100/50 p-1 transition-colors group-hover:bg-blue-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-blue-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-[11px] font-bold uppercase tracking-widest text-blue-800">Max Habs</span>
            <span v-if="maxHabsTime" class="text-[9px] font-medium text-blue-500/80 -mt-0.5">{{ maxHabsTime }}</span>
          </div>
        </button>

        <button
          class="group flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-white p-2.5 shadow-sm transition-all hover:border-green-400 hover:bg-green-50/50 active:scale-[0.98]"
          @click="handleBuy5MinSpace"
        >
          <div class="rounded-lg bg-green-100/50 p-1 transition-colors group-hover:bg-green-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-green-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <span class="text-[11px] font-bold uppercase tracking-widest text-green-800">5 Min Max Habs</span>
        </button>
      </div>
    </div>

    <!-- Hab slots -->
    <div class="grid grid-cols-1 gap-3">
      <div
        v-for="(habId, index) in habIds"
        :key="index"
        class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 group hover:border-blue-200 transition-colors"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Slot {{ index + 1 }}</span>
          <div v-if="habId !== null" class="flex flex-col items-end">
            <span class="text-[11px] font-bold text-green-600">
              {{ formatNumber(getHabCapacity(habId), 0) }}
            </span>
            <span class="text-[9px] text-gray-400 uppercase font-semibold">Capacity</span>
          </div>
        </div>

        <HabSelect
          :model-value="habId !== null ? String(habId) : undefined"
          :items="getAvailableHabs(habId)"
          :get-item-id="item => String(item.id)"
          :get-item-display="item => getHabDisplay(item, index)"
          :get-item-icon-path="item => item.iconPath"
          :item-from-id="id => getHabById(parseInt(id) as HabId)"
          :search-items="query => searchHabs(getAvailableHabs(habId), query)"
          placeholder="Select habitat..."
          class="w-full"
          @update:model-value="handleHabChange(index, $event ? parseInt($event) : undefined)"
        />
      </div>
    </div>

    <!-- Note about slots -->
    <div class="flex items-center justify-between px-1">
      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{{ purchasedCount }}/4 habs active</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { GenericBaseSelectFilterable } from 'ui/components/BaseSelectFilterable.vue';
import {
  habTypes,
  getHabById,
  getDiscountedHabPrice,
  countHabsOfType,
  isHabId,
  type HabCostModifiers,
  type Hab,
  type HabId,
} from '@/lib/habs';
import { formatNumber, formatGemPrice, formatDuration } from '@/lib/format';
import { useHabCapacityStore } from '@/stores/habCapacity';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useSalesStore } from '@/stores/sales';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId } from '@/types';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { calculateHabCapacity, calculateTotalResearchMultipliers } from '@/calculations/habCapacity';
import { calculateArtifactModifiers } from '@/lib/artifacts';

const HabSelect = GenericBaseSelectFilterable<Hab>();

const habCapacityStore = useHabCapacityStore();
const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const salesStore = useSalesStore();
const { prepareExecution, completeExecution } = useActionExecutor();

// Cost modifiers
const costModifiers = computed<HabCostModifiers>(() => ({
  cheaperContractorsLevel: initialStateStore.epicResearchLevels['cheaper_contractors'] || 0,
  flameRetardantMultiplier: initialStateStore.colleggtibleModifiers.habCost,
}));

const isHabSaleActive = computed(() => actionsStore.effectiveSnapshot.activeSales.hab);

// Compute effective state for accurate capacity and cost calculations
const effectiveSnapshot = computed(() => actionsStore.effectiveSnapshot);

// Compute multipliers based on effective state
const effectiveMultipliers = computed(() => {
  const researchLevels = effectiveSnapshot.value.researchLevels;
  const artifactLoadout = effectiveSnapshot.value.artifactLoadout;

  // Calculate artifact modifiers
  const artifactMods = calculateArtifactModifiers(artifactLoadout).habCapacity;

  // Calculate research multipliers
  const { universal, portalOnly } = calculateTotalResearchMultipliers(researchLevels);

  return {
    universalMultiplier: universal,
    portalMultiplier: portalOnly,
    peggMultiplier: initialStateStore.colleggtibleModifiers.habCap,
    artifactMultiplier: artifactMods.totalMultiplier,
  };
});

// Use habIds from the effective snapshot
const habIds = computed(() => effectiveSnapshot.value.habIds);

const purchasedCount = computed(() => habIds.value.filter(id => id !== null).length);

function getHabPrice(habId: number, slotIndex: number): number {
  if (!isHabId(habId)) return 0;

  // If this hab is already in this slot, it costs nothing to "buy" again
  if (habIds.value[slotIndex] === habId) return 0;

  const hab = getHabById(habId);
  if (!hab) return 0;

  // Count how many of this hab type are in other slots
  const otherHabs = habIds.value.filter((_, i) => i !== slotIndex);
  const existingCount = countHabsOfType(otherHabs, habId);

  return getDiscountedHabPrice(hab, existingCount, costModifiers.value, isHabSaleActive.value);
}

function getHabDisplay(hab: Hab, slotIndex: number): string {
  const isCurrent = habIds.value[slotIndex] === hab.id;
  const capacity = formatNumber(getHabCapacity(hab.id), 0);

  if (isCurrent) {
    return `${hab.name} (${capacity} cap) — Current`;
  }

  const price = getHabPrice(hab.id, slotIndex);
  const time = getTimeToBuy(hab.id, slotIndex);

  return `${hab.name} (${capacity} cap, ${formatGemPrice(price)} gems) — ${time}`;
}

function getTimeToBuy(habId: number, slotIndex: number): string {
  const price = getHabPrice(habId, slotIndex);
  if (price <= 0) return 'Free';

  const snapshot = actionsStore.effectiveSnapshot;
  const offlineEarnings = snapshot.offlineEarnings;

  if (offlineEarnings <= 0) return '∞';

  const seconds = price / offlineEarnings;
  if (seconds < 1) return 'Instant';
  return formatDuration(seconds);
}

function getHabCapacity(habId: number): number {
  if (!isHabId(habId)) return 0;
  const hab = getHabById(habId);
  if (!hab) return 0;

  const { universalMultiplier, portalMultiplier, peggMultiplier, artifactMultiplier } = effectiveMultipliers.value;

  return calculateHabCapacity(hab, universalMultiplier, portalMultiplier, peggMultiplier, artifactMultiplier);
}

/**
 * Get available habs for a slot - only show upgrades (higher id than current).
 * If slot is empty (null), show all habs.
 */
function getAvailableHabs(currentHabId: number | null) {
  if (currentHabId === null) {
    return habTypes;
  }
  // Only show habs with higher id (upgrades only, no downgrades)
  return habTypes.filter(hab => hab.id >= currentHabId);
}

function searchHabs(items: Hab[], query: string): Hab[] {
  const q = query.toLowerCase();
  return items.filter(hab => hab.name.toLowerCase().includes(q));
}

function handleHabChange(slotIndex: number, habId: number | undefined) {
  if (habId === undefined) return;
  if (!isHabId(habId)) return;

  // Don't add if it's already the same
  if (habIds.value[slotIndex] === habId) return;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  // Calculate cost based on effective state
  const hab = getHabById(habId);
  if (!hab) return;

  const effectiveHabIds = beforeSnapshot.habIds;
  const otherHabs = effectiveHabIds.filter((_, i) => i !== slotIndex);
  const existingCount = countHabsOfType(otherHabs, habId);
  const isSaleActive = beforeSnapshot.activeSales.hab;
  const cost = getDiscountedHabPrice(hab, existingCount, costModifiers.value, isSaleActive);

  // Build payload
  const payload = {
    slotIndex,
    habId,
  };

  // Compute dependencies
  const dependencies = computeDependencies('buy_hab', payload, actionsStore.actionsBeforeInsertion);

  // Apply to store
  habCapacityStore.setHab(slotIndex, habId);

  // Complete execution
  completeExecution(
    {
      id: generateActionId(),
      timestamp: Date.now(),
      type: 'buy_hab',
      payload,
      cost,
      dependsOn: dependencies,
    },
    beforeSnapshot
  );
}

function handleToggleSale() {
  const beforeSnapshot = prepareExecution();
  const currentlyActive = beforeSnapshot.activeSales.hab;

  const payload = {
    saleType: 'hab' as const,
    active: !currentlyActive,
  };

  // Update store state
  salesStore.setSaleActive('hab', !currentlyActive);

  completeExecution(
    {
      id: generateActionId(),
      timestamp: Date.now(),
      type: 'toggle_sale',
      payload,
      cost: 0,
      dependsOn: computeDependencies('toggle_sale', payload, actionsStore.actionsBeforeInsertion),
    },
    beforeSnapshot
  );
}

const maxHabsTime = computed(() => {
  const CHICKEN_UNIVERSE_ID = 18;
  const snapshot = actionsStore.effectiveSnapshot;
  const offlineEarnings = snapshot.offlineEarnings;

  if (offlineEarnings <= 0) return '∞';

  const shippingCapacity = snapshot.shippingCapacity;
  const initialELR = snapshot.elr;
  const initialLayRate = snapshot.layRate;
  const initialCapacity = snapshot.habCapacity;

  let totalSeconds = 0;
  let virtualHabIds = [...snapshot.habIds];
  let virtualLayRate = initialLayRate;
  let virtualCapacity = initialCapacity;

  for (let i = 0; i < 4; i++) {
    const currentId = virtualHabIds[i];
    if (currentId === CHICKEN_UNIVERSE_ID) continue;

    const hab = getHabById(CHICKEN_UNIVERSE_ID);
    if (!hab) continue;

    // Calculate price given virtual state
    const otherHabs = virtualHabIds.filter((_, idx) => idx !== i);
    const existingCount = countHabsOfType(otherHabs, CHICKEN_UNIVERSE_ID);
    const price = getDiscountedHabPrice(hab, existingCount, costModifiers.value, isHabSaleActive.value);

    // Current virtual EPS
    const virtualELR = Math.min(virtualLayRate, shippingCapacity);
    const virtualEPS = initialELR > 0 ? (offlineEarnings / initialELR) * virtualELR : 0;

    if (virtualEPS > 0) {
      totalSeconds += price / virtualEPS;
    } else {
      if (price > 0) return '∞';
    }

    // Update virtual state for next hab
    // We need the capacity of the OLD hab in this slot
    const oldHabCap = currentId !== null ? getHabCapacity(currentId) : 0;
    const newHabCap = getHabCapacity(CHICKEN_UNIVERSE_ID);

    virtualHabIds[i] = CHICKEN_UNIVERSE_ID;

    const deltaCap = newHabCap - oldHabCap;
    if (deltaCap > 0) {
      const oldTotalCap = virtualCapacity;
      const newTotalCap = oldTotalCap + deltaCap;

      if (oldTotalCap > 0) {
        virtualLayRate = (virtualLayRate / oldTotalCap) * newTotalCap;
      }
      virtualCapacity = newTotalCap;
    }
  }

  if (totalSeconds < 1) return 'Instant';
  return formatDuration(totalSeconds);
});

const canBuyMax = computed(() => {
  const CHICKEN_UNIVERSE_ID = 18;
  return habIds.value.some(id => id !== CHICKEN_UNIVERSE_ID);
});

function handleBuyMax() {
  const CHICKEN_UNIVERSE_ID = 18;
  for (let i = 0; i < 4; i++) {
    const currentId = habIds.value[i];
    if (currentId !== CHICKEN_UNIVERSE_ID) {
      handleHabChange(i, CHICKEN_UNIVERSE_ID);
    }
  }
}

function handleBuy5MinSpace() {
  const snapshot = actionsStore.effectiveSnapshot;
  const offlineEarnings = snapshot.offlineEarnings;
  if (offlineEarnings <= 0) return;

  const maxBudget = 5 * 60 * offlineEarnings;
  let spent = 0;

  // Track virtual state
  const virtualHabIds = [...habIds.value];

  while (spent < maxBudget) {
    let bestAction: { slotIndex: number; habId: number; cost: number } | null = null;
    let bestRoi = -1;

    for (let i = 0; i < virtualHabIds.length; i++) {
      const currentId = virtualHabIds[i];
      const startId = currentId === null ? 0 : currentId + 1;

      // Find the highest "instant" hab (cost < 1s of earnings) to skip intermediate steps
      let maxInstantId = -1;
      for (let id = startId; id <= 18; id++) {
        const otherHabs = virtualHabIds.filter((_, idx) => idx !== i);
        const existingCount = countHabsOfType(otherHabs, id);
        const hab = getHabById(id as HabId);
        if (!hab) continue;
        const cost = getDiscountedHabPrice(hab, existingCount, costModifiers.value, isHabSaleActive.value);
        if (cost <= offlineEarnings) {
          maxInstantId = id;
        } else {
          break;
        }
      }

      for (let nextId = startId; nextId <= 18; nextId++) {
        if (nextId < maxInstantId) continue;

        const otherHabs = virtualHabIds.filter((_, idx) => idx !== i);
        const existingCount = countHabsOfType(otherHabs, nextId);
        const hab = getHabById(nextId as HabId);
        if (!hab) continue;

        const cost = getDiscountedHabPrice(hab, existingCount, costModifiers.value, isHabSaleActive.value);

        if (spent + cost <= maxBudget) {
          const currentCap = currentId !== null ? getHabCapacity(currentId) : 0;
          const nextCap = getHabCapacity(nextId);
          const deltaCap = nextCap - currentCap;

          if (deltaCap > 0) {
            const roi = deltaCap / Math.max(cost, 1e-10);
            if (roi > bestRoi) {
              bestRoi = roi;
              bestAction = { slotIndex: i, habId: nextId, cost };
            }
          }
        }
      }
    }

    if (!bestAction) break;

    // Apply action
    handleHabChange(bestAction.slotIndex, bestAction.habId);
    virtualHabIds[bestAction.slotIndex] = bestAction.habId;
    spent += bestAction.cost;
  }
}
</script>

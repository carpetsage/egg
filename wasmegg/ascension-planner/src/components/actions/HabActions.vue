<template>
  <div class="space-y-6">
    <!-- Sale Protocol -->
    <div
      class="bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 rounded-2xl p-5 border border-blue-100/50 shadow-sm relative overflow-hidden transition-all duration-300"
    >
      <div class="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>

      <div class="flex items-center justify-between relative z-10">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Hab Sale</span>
          </div>
          <span class="text-[10px] font-black text-blue-600 uppercase tracking-tighter">80% Discount Active</span>
        </div>
        <button
          class="relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner"
          :class="isHabSaleActive ? 'bg-blue-500' : 'bg-slate-200'"
          @click="handleToggleSale"
        >
          <span
            class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-all duration-300 shadow-sm"
            :class="isHabSaleActive ? 'translate-x-[22px]' : 'translate-x-1'"
          />
        </button>
      </div>
    </div>

    <!-- Quick Upgrade Action -->
    <div v-if="canBuyMax" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
      <button
        class="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden"
        @click="handleBuyMax"
      >
        <div class="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/[0.02] transition-colors"></div>
        <div
          class="rounded-xl bg-blue-50 border border-blue-100 p-2 transition-colors group-hover:bg-white group-hover:scale-110 shadow-sm relative z-10"
        >
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
        <div class="flex flex-col items-center relative z-10">
          <span class="text-[11px] font-black uppercase tracking-widest text-slate-900 group-hover:text-blue-700"
            >Max Habs</span
          >
          <span v-if="maxHabsTime" class="text-[9px] font-mono-premium font-black text-blue-500 mt-0.5">{{
            maxHabsTime
          }}</span>
        </div>
      </button>

      <button
        class="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-all duration-300 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden"
        @click="handleBuy5MinSpace"
      >
        <div class="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/[0.02] transition-colors"></div>
        <div
          class="rounded-xl bg-emerald-50 border border-emerald-100 p-2 transition-colors group-hover:bg-white group-hover:scale-110 shadow-sm relative z-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-emerald-600"
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
        <div class="flex flex-col items-center relative z-10">
          <span class="text-[11px] font-black uppercase tracking-widest text-slate-900 group-hover:text-emerald-700"
            >5 Min Max Habs</span
          >
        </div>
      </button>
    </div>

    <!-- Hab slots -->
    <div class="grid grid-cols-1 gap-4">
      <div
        v-for="(habId, index) in habIds"
        :key="index"
        class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 group hover:border-blue-200 transition-all duration-300 hover:shadow-md"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Slot {{ index + 1 }}</span>
          <div v-if="habId !== null" class="flex flex-col items-end">
            <span class="text-sm font-mono-premium font-black text-slate-900">
              {{ formatNumber(getHabCapacity(habId), 0) }}
            </span>
            <span class="text-[9px] text-slate-400 uppercase font-black tracking-widest opacity-60">Capacity</span>
          </div>
        </div>

        <UpgradeDropdown
          :model-value="habId !== null ? String(habId) : undefined"
          :options="getHabDropdownOptions(habId, index)"
          @update:model-value="handleHabChange(index, $event ? parseInt($event) : undefined)"
        />
      </div>
    </div>

    <!-- Note about slots -->
    <div class="flex items-center justify-between px-2">
      <p class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{{ purchasedCount }}/4 habs active</p>
    </div>

    <EventExpiryDialog
      v-if="showExpiryDialog"
      :event-name="expiryData.eventName"
      :end-time="expiryData.endTime"
      :completion-time="expiryData.completionTime"
      @cancel="handleExpiryCancel"
      @deactivate-and-cancel="handleExpiryDeactivateAndCancel"
      @deactivate-and-continue="handleExpiryDeactivateAndContinue"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UpgradeDropdown, { type UpgradeDropdownOption } from './UpgradeDropdown.vue';
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
import { useEventExpiry } from '@/composables/useEventExpiry';
import EventExpiryDialog from '../EventExpiryDialog.vue';
import { calculateHabCapacity, calculateTotalResearchMultipliers } from '@/calculations/habCapacity';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { getTimeToSave } from '@/engine/apply';

const habCapacityStore = useHabCapacityStore();
const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const salesStore = useSalesStore();
const { prepareExecution, completeExecution, batch } = useActionExecutor();
const {
  showExpiryDialog,
  expiryData,
  withExpiryCheck,
  cancel: handleExpiryCancel,
  deactivateAndCancel: handleExpiryDeactivateAndCancel,
  deactivateAndContinue: handleExpiryDeactivateAndContinue,
} = useEventExpiry();

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

function getHabDropdownOptions(currentHabId: number | null, slotIndex: number): UpgradeDropdownOption[] {
  const habs = getAvailableHabs(currentHabId);
  return habs.map(hab => {
    const isCurrent = habIds.value[slotIndex] === hab.id;
    const capacity = formatNumber(getHabCapacity(hab.id), 0);

    let option: UpgradeDropdownOption = {
      id: String(hab.id),
      name: hab.name,
      iconPath: hab.iconPath,
    };

    if (isCurrent) {
      option.subtext = `${capacity} cap — Current`;
    } else {
      option.capacity = `${capacity} cap`;
      option.price = getHabPrice(hab.id, slotIndex);
      option.time = getTimeToBuy(hab.id, slotIndex);
    }

    return option;
  });
}

function getTimeToBuy(habId: number, slotIndex: number): string {
  const price = getHabPrice(habId, slotIndex);
  const seconds = getTimeToSave(price, actionsStore.effectiveSnapshot);
  if (seconds <= 0) return '0s';
  if (seconds === Infinity) return '∞';
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

function handleHabChange(slotIndex: number, habId: number | undefined) {
  if (habId === undefined) return;
  if (!isHabId(habId)) return;

  // Don't add if it's already the same
  if (habIds.value[slotIndex] === habId) return;

  const duration = getTimeToBuySeconds(habId, slotIndex);

  withExpiryCheck(duration, false, () => {
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
    const dependencies = computeDependencies(
      'buy_hab',
      payload,
      actionsStore.actionsBeforeInsertion,
      actionsStore.initialSnapshot.researchLevels
    );

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
  });
}

function getTimeToBuySeconds(habId: number, slotIndex: number): number {
  const price = getHabPrice(habId, slotIndex);
  return getTimeToSave(price, actionsStore.effectiveSnapshot);
}

function handleToggleSale() {
  const beforeSnapshot = prepareExecution();
  const currentlyActive = beforeSnapshot.activeSales.hab;

  const payload = {
    saleType: 'hab' as const,
    active: !currentlyActive,
    multiplier: 0.2, // 80% off
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
      dependsOn: computeDependencies(
        'toggle_sale',
        payload,
        actionsStore.actionsBeforeInsertion,
        actionsStore.initialSnapshot.researchLevels
      ),
    },
    beforeSnapshot
  );
}

const CHICKEN_UNIVERSE_ID = 18;

interface HabPurchaseStep {
  slotIndex: number;
  habId: number;
  cost: number;
  waitSeconds: number;
}

interface HabSimResult {
  steps: HabPurchaseStep[];
  totalSeconds: number;
  allMaxed: boolean;
}

// How soon a hab has to become affordable to count as a "quick interim buy" -
// matches the threshold src/auto/shifts/i1.ts uses for the same decision.
const INTERIM_HAB_THRESHOLD_SECONDS = 10;

/**
 * Pick the next hab purchase (any slot, any hab level above that slot's current one)
 * from the given virtual snapshot. Prefers the highest-tier hab reachable within
 * INTERIM_HAB_THRESHOLD_SECONDS over a "better ROI" small upgrade - e.g. if a
 * Planet Portal is affordable in 0s, buy it outright instead of stepping through
 * every cheaper hab on the way there. Only falls back to whichever upgrade becomes
 * affordable soonest when nothing is reachable within the threshold, since then
 * there's no quick win available and we just need to keep progressing.
 */
function findBestNextHabPurchase(
  virtualSnapshot: typeof actionsStore.effectiveSnapshot,
  virtualHabIds: (number | null)[]
) {
  const candidates: { slotIndex: number; habId: number; cost: number; waitSeconds: number }[] = [];

  for (let slotIndex = 0; slotIndex < 4; slotIndex++) {
    const currentId = virtualHabIds[slotIndex];
    const startId = currentId === null ? 0 : currentId + 1;

    for (let habId = startId; habId <= CHICKEN_UNIVERSE_ID; habId++) {
      const hab = getHabById(habId as HabId);
      if (!hab) continue;

      const currentCap = currentId !== null ? getHabCapacity(currentId) : 0;
      const newCap = getHabCapacity(habId);
      if (newCap - currentCap <= 0) continue;

      const otherHabs = virtualHabIds.filter((_, i) => i !== slotIndex);
      const existingCount = countHabsOfType(otherHabs, habId);
      const cost = getDiscountedHabPrice(hab, existingCount, costModifiers.value, isHabSaleActive.value);

      const waitSeconds = getTimeToSave(cost, virtualSnapshot);
      if (waitSeconds === Infinity) continue;

      candidates.push({ slotIndex, habId, cost, waitSeconds });
    }
  }

  if (candidates.length === 0) return null;

  const quickCandidates = candidates.filter(c => c.waitSeconds <= INTERIM_HAB_THRESHOLD_SECONDS);

  if (quickCandidates.length > 0) {
    // A quick win is available - grab the highest-tier one, not the best-ROI one.
    return quickCandidates.reduce((best, c) => {
      if (c.habId > best.habId) return c;
      if (c.habId === best.habId && c.waitSeconds < best.waitSeconds) return c;
      return best;
    });
  }

  // Nothing is reachable quickly - just take whichever becomes affordable soonest.
  return candidates.reduce((best, c) => {
    if (c.waitSeconds < best.waitSeconds) return c;
    if (c.waitSeconds === best.waitSeconds && c.habId > best.habId) return c;
    return best;
  });
}

/**
 * Simulate buying hab upgrades forward in time, always taking whichever upgrade
 * becomes affordable soonest across all slots and levels. This lets a cheap interim
 * hab get bought ahead of a distant Chicken Universe purchase whenever doing so
 * raises earnings enough to shorten the overall wait - the same idea as the
 * interim-hab step in src/auto/shifts/i1.ts, generalized to any number of interim
 * purchases in any slot instead of a single hardcoded lookahead.
 *
 * `shouldStop` is checked against the elapsed time a prospective purchase would
 * bring us to, so callers can cut the simulation off at a time budget (5-min button)
 * or let it run until every slot holds a Chicken Universe (max habs button).
 */
function simulateHabPurchases(shouldStop: (elapsedSeconds: number) => boolean): HabSimResult {
  const snapshot = actionsStore.effectiveSnapshot;
  const steps: HabPurchaseStep[] = [];
  let elapsedSeconds = 0;

  let virtualHabIds = [...snapshot.habIds];
  let virtualBank = snapshot.bankValue || 0;
  let virtualPopulation = snapshot.population;
  let virtualHabCapacity = snapshot.habCapacity;

  // layRate/population and offlineEarnings/elr are fixed ratios of the game state
  // (hab purchases change capacity, not per-chicken rates), so we hold them fixed
  // and re-derive layRate/elr/offlineEarnings from the virtual population each step.
  const layRatePerChicken = snapshot.population > 0 ? snapshot.layRate / snapshot.population : 0;
  const earningsPerEgg = snapshot.elr > 0 ? snapshot.offlineEarnings / snapshot.elr : 0;

  const maxIterations = 4 * habTypes.length; // at most one purchase per hab tier per slot

  for (let i = 0; i < maxIterations; i++) {
    if (virtualHabIds.every(id => id === CHICKEN_UNIVERSE_ID)) break;
    if (shouldStop(elapsedSeconds)) break;

    const layRate = virtualPopulation * layRatePerChicken;
    const elr = Math.min(layRate, snapshot.shippingCapacity);
    const offlineEarnings = elr * earningsPerEgg;

    const virtualSnapshot = {
      ...snapshot,
      habIds: virtualHabIds,
      bankValue: virtualBank,
      population: virtualPopulation,
      habCapacity: virtualHabCapacity,
      layRate,
      elr,
      offlineEarnings,
    };

    const best = findBestNextHabPurchase(virtualSnapshot, virtualHabIds);
    if (!best) break;
    if (shouldStop(elapsedSeconds + best.waitSeconds)) break;

    // Advance virtual population/bank through the wait
    const I = snapshot.offlineIHR / 60;
    virtualPopulation = Math.min(virtualHabCapacity, virtualPopulation + I * best.waitSeconds);
    virtualBank = best.waitSeconds > 0 ? 0 : Math.max(0, virtualBank - best.cost);

    // Apply the purchase
    const currentId = virtualHabIds[best.slotIndex];
    const currentCap = currentId !== null ? getHabCapacity(currentId) : 0;
    virtualHabIds = virtualHabIds.map((id, idx) => (idx === best.slotIndex ? best.habId : id));
    virtualHabCapacity += getHabCapacity(best.habId) - currentCap;

    elapsedSeconds += best.waitSeconds;
    steps.push({ slotIndex: best.slotIndex, habId: best.habId, cost: best.cost, waitSeconds: best.waitSeconds });
  }

  return {
    steps,
    totalSeconds: elapsedSeconds,
    allMaxed: virtualHabIds.every(id => id === CHICKEN_UNIVERSE_ID),
  };
}

// Max Habs never gives up on a time budget - people may be fine waiting days or
// months, so it only stops once every slot holds a Chicken Universe.
const maxHabsSim = computed(() => simulateHabPurchases(() => false));

const maxHabsSeconds = computed(() => (maxHabsSim.value.allMaxed ? maxHabsSim.value.totalSeconds : Infinity));

const maxHabsTime = computed(() => {
  const seconds = maxHabsSeconds.value;
  if (seconds === Infinity) return '∞';
  if (seconds < 1) return 'Instant';
  return formatDuration(seconds);
});

const canBuyMax = computed(() => habIds.value.some(id => id !== CHICKEN_UNIVERSE_ID));

function handleBuyMax() {
  const sim = maxHabsSim.value;
  if (sim.steps.length === 0) return;

  withExpiryCheck(sim.totalSeconds, false, () => {
    batch(() => {
      for (const step of sim.steps) {
        handleHabChange(step.slotIndex, step.habId);
      }
    });
  });
}

function handleBuy5MinSpace() {
  const FIVE_MINUTES = 5 * 60;
  const sim = simulateHabPurchases(seconds => seconds > FIVE_MINUTES);
  if (sim.steps.length === 0) return;

  withExpiryCheck(sim.totalSeconds, false, () => {
    batch(() => {
      for (const step of sim.steps) {
        handleHabChange(step.slotIndex, step.habId);
      }
    });
  });
}
</script>

<template>
  <div class="space-y-4">
    <div class="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
      <p class="text-[11px] text-blue-600 font-medium leading-relaxed">
        <span class="font-bold">Habs:</span> Select a habitat to upgrade. Prices update automatically based on your current epic research and artifacts.
      </p>
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
          :get-item-display="item => `${item.name} (${formatNumber(item.baseCapacity, 0)} cap, ${formatNumber(getHabPrice(item.id, index), 0)} gems)`"
          :get-item-icon-path="item => item.iconPath"
          :item-from-id="id => getHabById(parseInt(id) as HabId)"
          :search-items="(query) => searchHabs(getAvailableHabs(habId), query)"
          placeholder="Select habitat..."
          class="w-full"
          @update:model-value="handleHabChange(index, $event ? parseInt($event) : undefined)"
        />
      </div>
    </div>

    <!-- Note about slots -->
    <div class="flex items-center justify-between px-1">
      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
        {{ purchasedCount }}/4 habs active
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { GenericBaseSelectFilterable } from 'ui/components/BaseSelectFilterable.vue';
import { habTypes, getHabById, getDiscountedHabPrice, countHabsOfType, isHabId, type HabCostModifiers, type Hab, type HabId } from '@/lib/habs';
import { formatNumber } from '@/lib/format';
import { useHabCapacityStore } from '@/stores/habCapacity';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId } from '@/types';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { calculateHabCapacity, calculateTotalResearchMultipliers } from '@/calculations/habCapacity';
import { calculateArtifactModifiers } from '@/lib/artifacts';

const HabSelect = GenericBaseSelectFilterable<Hab>();

const habCapacityStore = useHabCapacityStore();
const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const { prepareExecution, completeExecution } = useActionExecutor();

// Cost modifiers
const costModifiers = computed<HabCostModifiers>(() => ({
  cheaperContractorsLevel: initialStateStore.epicResearchLevels['cheaper_contractors'] || 0,
  flameRetardantMultiplier: initialStateStore.colleggtibleModifiers.habCost,
}));

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

const purchasedCount = computed(() =>
  habIds.value.filter(id => id !== null).length
);

function getHabPrice(habId: number, slotIndex: number): number {
  if (!isHabId(habId)) return 0;

  const hab = getHabById(habId);
  if (!hab) return 0;

  // Count how many of this hab type are in slots before this one
  const habsBeforeSlot = habIds.value.slice(0, slotIndex);
  const existingCount = countHabsOfType(habsBeforeSlot, habId);

  return getDiscountedHabPrice(hab, existingCount, costModifiers.value);
}

function getHabCapacity(habId: number): number {
  if (!isHabId(habId)) return 0;
  const hab = getHabById(habId);
  if (!hab) return 0;

  const { universalMultiplier, portalMultiplier, peggMultiplier, artifactMultiplier } = effectiveMultipliers.value;
  
  return calculateHabCapacity(
    hab,
    universalMultiplier,
    portalMultiplier,
    peggMultiplier,
    artifactMultiplier
  );
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
  const habsBeforeSlot = effectiveHabIds.slice(0, slotIndex);
  const existingCount = countHabsOfType(habsBeforeSlot, habId);
  const cost = getDiscountedHabPrice(hab, existingCount, costModifiers.value);

  // Build payload
  const payload = {
    slotIndex,
    habId,
  };

  // Compute dependencies
  const dependencies = computeDependencies('buy_hab', payload, actionsStore.actions);

  // Apply to store
  habCapacityStore.setHab(slotIndex, habId);

  // Complete execution
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'buy_hab',
    payload,
    cost,
    dependsOn: dependencies,
  }, beforeSnapshot);
}
</script>

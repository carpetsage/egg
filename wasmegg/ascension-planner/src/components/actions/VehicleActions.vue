<template>
  <div class="space-y-4">
    <div class="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
      <p class="text-[11px] text-blue-600 font-medium leading-relaxed">
        <span class="font-bold">Shipping:</span> Select a vehicle to upgrade your fleet. Hyperloop trains can be expanded with additional cars.
      </p>
    </div>

    <!-- Vehicle slots -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="(slot, index) in displaySlots"
        :key="index"
        class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 group hover:border-blue-200 transition-colors"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Slot {{ index + 1 }}</span>
          <div v-if="slot.vehicleId !== null" class="flex flex-col items-end">
            <span class="text-[11px] font-bold text-blue-600">
              {{ formatNumber(getVehicleCapacity(slot, index) * 3600, 0) }}
            </span>
            <span class="text-[9px] text-gray-400 uppercase font-semibold">Eggs/Hr</span>
          </div>
        </div>

        <VehicleSelect
          :model-value="slot.vehicleId !== null ? String(slot.vehicleId) : undefined"
          :items="getAvailableVehicles(slot.vehicleId)"
          :get-item-id="item => String(item.id)"
          :get-item-display="item => `${item.name} (${formatNumber(getVehiclePrice(item.id, index), 0)} gems)`"
          :get-item-icon-path="item => item.iconPath"
          :item-from-id="id => getVehicleType(parseInt(id))!"
          :search-items="(query) => searchVehicles(getAvailableVehicles(slot.vehicleId), query)"
          placeholder="Select vehicle..."
          class="w-full"
          @update:model-value="handleVehicleChange(index, $event ? parseInt($event) : undefined)"
        />

        <!-- Hyperloop train cars (only show for hyperloop trains) -->
        <div v-if="slot.vehicleId === 11" class="mt-1 pt-2 border-t border-gray-50">
          <div class="flex items-center justify-between gap-2">
            <div class="flex flex-col">
              <span class="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">Train Length</span>
              <span class="text-xs font-bold text-blue-600">{{ slot.trainLength }} / {{ getMaxTrainLength() }}</span>
            </div>

            <div class="flex gap-1.5">
              <!-- Add car button -->
              <button
                v-if="canAddTrainCar(slot, index)"
                class="text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-2 py-1 rounded-md border border-blue-100 transition-all shadow-sm"
                @click="handleAddTrainCar(index)"
              >
                +1 ({{ formatNumber(getNextCarCost(slot), 0) }})
              </button>

              <!-- Max cars button -->
              <button
                v-if="canAddMultipleTrainCars(slot, index)"
                class="text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded-md border border-indigo-100 transition-all shadow-sm"
                @click="handleMaxTrainCars(index)"
              >
                Max (+{{ getRemainingCars(slot, index) }})
              </button>
            </div>
          </div>

          <!-- Capacity per car hint -->
          <div v-if="slot.trainLength < getMaxTrainLength()" class="mt-1.5 text-[9px] text-gray-400 italic">
            Each car adds +{{ formatNumber((getVehicleType(11)?.baseCapacityPerSecond ?? 0) * 3600, 0) }} eggs/hr
          </div>
        </div>
      </div>
    </div>

    <!-- Note about fleet size -->
    <div class="flex items-center justify-between px-1">
      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
        Fleet Capacity: {{ activeVehicleCount }}/{{ maxVehicleSlots }} active
      </p>
      <p class="text-[10px] text-blue-400 italic">
        (upgrade fleet size research to unlock more slots)
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { GenericBaseSelectFilterable } from 'ui/components/BaseSelectFilterable.vue';
import {
  vehicleTypes,
  getVehicleType,
  getDiscountedVehiclePrice,
  getDiscountedTrainCarPrice,
  countVehiclesOfTypeBefore,
  BASE_TRAIN_LENGTH,
  MAX_TRAIN_LENGTH,
  type VehicleCostModifiers,
  type VehicleType,
} from '@/lib/vehicles';
import { formatNumber } from '@/lib/format';
import { useShippingCapacityStore } from '@/stores/shippingCapacity';
import { useShippingCapacity } from '@/composables/useShippingCapacity';
import { useInitialStateStore } from '@/stores/initialState';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useActionsStore } from '@/stores/actions';
import { computeCurrentSnapshot, computeDeltas } from '@/lib/actions/snapshot';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId } from '@/types';

const VehicleSelect = GenericBaseSelectFilterable<VehicleType>();

const shippingStore = useShippingCapacityStore();
const initialStateStore = useInitialStateStore();
const commonResearchStore = useCommonResearchStore();
const actionsStore = useActionsStore();
const { output } = useShippingCapacity();

// Cost modifiers
const costModifiers = computed<VehicleCostModifiers>(() => ({
  bustUnionsLevel: initialStateStore.epicResearchLevels['bust_unions'] || 0,
  lithiumMultiplier: initialStateStore.colleggtibleModifiers.vehicleCost,
}));

// Display only available slots
const displaySlots = computed(() =>
  shippingStore.vehicles.slice(0, output.value.maxVehicleSlots)
);

const maxVehicleSlots = computed(() => output.value.maxVehicleSlots);

const activeVehicleCount = computed(() =>
  displaySlots.value.filter(v => v.vehicleId !== null).length
);

function getVehiclePrice(vehicleId: number, slotIndex: number): number {
  const existingCount = countVehiclesOfTypeBefore(shippingStore.vehicles, vehicleId, slotIndex);
  return getDiscountedVehiclePrice(vehicleId, existingCount, costModifiers.value);
}

function getVehicleCapacity(slot: { vehicleId: number | null; trainLength: number }, _index: number): number {
  if (slot.vehicleId === null) return 0;
  const vt = getVehicleType(slot.vehicleId);
  if (!vt) return 0;
  const multiplier = vt.isHyperloop ? slot.trainLength : 1;
  return vt.baseCapacityPerSecond * multiplier;
}

/**
 * Get available vehicles for a slot - only show upgrades (higher id than current).
 * If slot is empty (null), show all vehicles.
 */
function getAvailableVehicles(currentVehicleId: number | null) {
  if (currentVehicleId === null) {
    return vehicleTypes;
  }
  // Only show vehicles with higher id (upgrades only, no downgrades)
  return vehicleTypes.filter(vt => vt.id >= currentVehicleId);
}

function searchVehicles(items: VehicleType[], query: string): VehicleType[] {
  const q = query.toLowerCase();
  return items.filter(vt => vt.name.toLowerCase().includes(q));
}

function handleVehicleChange(slotIndex: number, vehicleId: number | undefined) {
  if (vehicleId === undefined) return;

  // Don't add if it's already the same
  if (shippingStore.vehicles[slotIndex].vehicleId === vehicleId) return;

  // Get state before action
  const beforeSnapshot = actionsStore.currentSnapshot;

  // Calculate cost
  const existingCount = countVehiclesOfTypeBefore(shippingStore.vehicles, vehicleId, slotIndex);
  const cost = getDiscountedVehiclePrice(vehicleId, existingCount, costModifiers.value);

  // Build payload first to compute dependencies
  const payload = {
    slotIndex,
    vehicleId,
    trainLength: vehicleId === 11 ? 1 : undefined,
  };

  // Compute dependencies (hyperloop train cars depend on graviton coupling)
  const dependencies = computeDependencies('buy_vehicle', payload, actionsStore.actions);

  // Apply to store
  shippingStore.setVehicle(slotIndex, vehicleId);

  // Get state after action
  const afterSnapshot = computeCurrentSnapshot();
  const deltas = computeDeltas(beforeSnapshot, afterSnapshot);

  // Add action to history
  actionsStore.pushAction({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'buy_vehicle',
    payload,
    cost,
    elrDelta: deltas.elrDelta,
    offlineEarningsDelta: deltas.offlineEarningsDelta,
    endState: afterSnapshot,
    dependsOn: dependencies,
  });
}

// ============================================================================
// Train Car Functions
// ============================================================================

/**
 * Get the maximum train length based on graviton coupling research.
 */
function getMaxTrainLength(): number {
  const gravitonLevel = commonResearchStore.researchLevels['graviton_coupling'] ?? 0;
  return Math.min(BASE_TRAIN_LENGTH + gravitonLevel, MAX_TRAIN_LENGTH);
}

/**
 * Check if we can add more train cars to this slot.
 */
function canAddTrainCar(slot: { vehicleId: number | null; trainLength: number }, _index: number): boolean {
  if (slot.vehicleId !== 11) return false;
  return slot.trainLength < getMaxTrainLength();
}

/**
 * Check if we can add multiple train cars (for Max button).
 */
function canAddMultipleTrainCars(slot: { vehicleId: number | null; trainLength: number }, index: number): boolean {
  if (!canAddTrainCar(slot, index)) return false;
  return getMaxTrainLength() - slot.trainLength > 1;
}

/**
 * Get the number of remaining cars that can be added.
 */
function getRemainingCars(slot: { vehicleId: number | null; trainLength: number }, _index: number): number {
  return getMaxTrainLength() - slot.trainLength;
}

/**
 * Get the cost for the next train car.
 */
function getNextCarCost(slot: { vehicleId: number | null; trainLength: number }): number {
  // trainLength is current, so next car index is trainLength (0-indexed would be trainLength)
  return getDiscountedTrainCarPrice(slot.trainLength, costModifiers.value);
}

/**
 * Handle adding a single train car.
 */
function handleAddTrainCar(slotIndex: number) {
  const slot = shippingStore.vehicles[slotIndex];
  if (!slot || slot.vehicleId !== 11) return;

  const fromLength = slot.trainLength;
  const toLength = fromLength + 1;

  if (toLength > getMaxTrainLength()) return;

  addTrainCarAction(slotIndex, fromLength, toLength);
}

/**
 * Handle adding all remaining train cars.
 */
function handleMaxTrainCars(slotIndex: number) {
  const slot = shippingStore.vehicles[slotIndex];
  if (!slot || slot.vehicleId !== 11) return;

  const maxLength = getMaxTrainLength();
  let currentLength = slot.trainLength;

  // Add each car as a separate action
  while (currentLength < maxLength) {
    const fromLength = currentLength;
    const toLength = currentLength + 1;
    addTrainCarAction(slotIndex, fromLength, toLength);
    currentLength = toLength;
  }
}

/**
 * Add a train car action.
 */
function addTrainCarAction(slotIndex: number, fromLength: number, toLength: number) {
  // Get state before action
  const beforeSnapshot = actionsStore.currentSnapshot;

  // Calculate cost
  const cost = getDiscountedTrainCarPrice(toLength - 1, costModifiers.value);

  // Build payload
  const payload = {
    slotIndex,
    fromLength,
    toLength,
  };

  // Compute dependencies
  const dependencies = computeDependencies('buy_train_car', payload, actionsStore.actions);

  // Apply to store
  shippingStore.setTrainLength(slotIndex, toLength);

  // Get state after action
  const afterSnapshot = computeCurrentSnapshot();
  const deltas = computeDeltas(beforeSnapshot, afterSnapshot);

  // Add action to history
  actionsStore.pushAction({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'buy_train_car',
    payload,
    cost,
    elrDelta: deltas.elrDelta,
    offlineEarningsDelta: deltas.offlineEarningsDelta,
    endState: afterSnapshot,
    dependsOn: dependencies,
  });
}
</script>

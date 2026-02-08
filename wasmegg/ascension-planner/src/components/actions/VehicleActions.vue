<template>
  <div class="space-y-4">
    <div class="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
      <p class="text-[11px] text-blue-600 font-medium leading-relaxed">
        <span class="font-bold">Shipping:</span> Select a vehicle to upgrade your fleet. Hyperloop trains can be expanded with additional cars.
      </p>
    </div>

    <!-- Vehicle slots -->
    <div class="grid grid-cols-1 gap-3">
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
          :get-item-display="item => {
            const currentSlot = displaySlots[index];
            if (currentSlot && currentSlot.vehicleId === item.id) {
              return `${item.name} (Owned)`;
            }
            const price = getVehiclePrice(item.id, index);
            const capacity = getVehicleCapacity({ vehicleId: item.id, trainLength: 1 }, index);
            return `${item.name} (${formatNumber(capacity * 3600, 0)}/hr, ${formatNumber(price, 0)} gems) — ${getVehicleTimeToBuy(item.id, index)}`;
          }"
          :get-item-icon-path="item => item.iconPath"
          :item-from-id="id => getVehicleType(parseInt(id))!"
          :search-items="(query) => searchVehicles(getAvailableVehicles(slot.vehicleId), query)"
          placeholder="Select vehicle..."
          icon-class="h-[14px] w-12"
          input-padding-class="pl-[60px]"
          container-class="max-w-none"
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

            <div class="flex gap-1.5 items-end">
              <!-- Add car button -->
              <button
                v-if="canAddTrainCar(slot, index)"
                class="text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-2 py-1 rounded-md border border-blue-100 transition-all shadow-sm flex flex-col items-center min-w-[80px]"
                @click="handleAddTrainCar(index)"
              >
                <span>+1 Car ({{ formatNumber(getNextCarCost(slot), 0) }})</span>
                <span class="text-[9px] font-medium opacity-70">{{ getCarTimeToBuy(slot) }}</span>
              </button>

              <!-- Max cars button -->
              <button
                v-if="canAddMultipleTrainCars(slot, index)"
                class="text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded-md border border-indigo-100 transition-all shadow-sm flex flex-col items-center min-w-[80px]"
                @click="handleMaxTrainCars(index)"
              >
                <span>Max (+{{ getRemainingCars(slot, index) }}) ({{ formatNumber(getTotalCarsCost(slot), 0) }})</span>
                <span class="text-[9px] font-medium opacity-70">{{ getMaxCarsTimeToBuy(slot) }}</span>
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
  countVehiclesOfType,
  BASE_TRAIN_LENGTH,
  MAX_TRAIN_LENGTH,
  type VehicleCostModifiers,
  type VehicleType,
} from '@/lib/vehicles';
import { formatNumber, formatDuration } from '@/lib/format';
import { useShippingCapacityStore } from '@/stores/shippingCapacity';
import { useShippingCapacity } from '@/composables/useShippingCapacity';
import { useInitialStateStore } from '@/stores/initialState';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useActionsStore } from '@/stores/actions';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId } from '@/types';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { calculateShippingMultipliers, calculateMaxVehicleSlots, calculateMaxTrainLength } from '@/calculations/shippingCapacity';
import { calculateArtifactModifiers } from '@/lib/artifacts';

const VehicleSelect = GenericBaseSelectFilterable<VehicleType>();

const shippingStore = useShippingCapacityStore();
const initialStateStore = useInitialStateStore();
const commonResearchStore = useCommonResearchStore();
const actionsStore = useActionsStore();
const { output } = useShippingCapacity();
const { prepareExecution, completeExecution } = useActionExecutor();

// Cost modifiers
const costModifiers = computed<VehicleCostModifiers>(() => ({
  bustUnionsLevel: initialStateStore.epicResearchLevels['bust_unions'] || 0,
  lithiumMultiplier: initialStateStore.colleggtibleModifiers.vehicleCost,
}));

// Compute effective state for accurate capacity and cost calculations
const effectiveSnapshot = computed(() => actionsStore.effectiveSnapshot);

// Compute multipliers based on effective state
const effectiveMultipliers = computed(() => {
  const researchLevels = effectiveSnapshot.value.researchLevels;
  const artifactLoadout = effectiveSnapshot.value.artifactLoadout;
  const transportationLobbyistLevel = initialStateStore.epicResearchLevels['transportation_lobbyist'] || 0;
  
  // Calculate artifact modifiers
  const artifactMods = calculateArtifactModifiers(artifactLoadout).shippingRate;

  // Calculate research multipliers
  const { universalMultiplier, hoverMultiplier, hyperloopMultiplier, epicMultiplier } = calculateShippingMultipliers(
    researchLevels,
    transportationLobbyistLevel
  );

  return {
    universalMultiplier,
    hoverMultiplier,
    hyperloopMultiplier,
    epicMultiplier,
    colleggtibleMultiplier: initialStateStore.colleggtibleModifiers.shippingCap,
    artifactMultiplier: artifactMods.totalMultiplier,
  };
});

// Display only available slots, padding with empty slots if vehicles array is shorter than maxVehicleSlots
const displaySlots = computed(() => {
  const max = calculateMaxVehicleSlots(effectiveSnapshot.value.researchLevels);
  // Clone the effective vehicles to avoid mutation
  const slots = effectiveSnapshot.value.vehicles ? [...effectiveSnapshot.value.vehicles].slice(0, max) : [];
  
  // Pad with empty slots
  while (slots.length < max) {
    slots.push({ vehicleId: null, trainLength: 1 });
  }
  return slots;
});

const maxVehicleSlots = computed(() => calculateMaxVehicleSlots(effectiveSnapshot.value.researchLevels));

const activeVehicleCount = computed(() =>
  displaySlots.value.filter(v => v.vehicleId !== null).length
);

function getVehiclePrice(vehicleId: number, slotIndex: number): number {
  const currentSlot = displaySlots.value[slotIndex];
  if (currentSlot && currentSlot.vehicleId === vehicleId) {
    return 0;
  }
  
  const effectiveVehicles = effectiveSnapshot.value.vehicles || [];
  const existingCount = countVehiclesOfType(effectiveVehicles, vehicleId);
  return getDiscountedVehiclePrice(vehicleId, existingCount, costModifiers.value);
}

function getTimeToBuyFromPrice(price: number): string {
  if (price <= 0) return 'Free';

  const snapshot = actionsStore.effectiveSnapshot;
  const offlineEarnings = snapshot.offlineEarnings;

  if (offlineEarnings <= 0) return '∞';

  const seconds = price / offlineEarnings;
  if (seconds < 1) return 'Instant';
  return formatDuration(seconds);
}

function getVehicleTimeToBuy(vehicleId: number, slotIndex: number): string {
  const price = getVehiclePrice(vehicleId, slotIndex);
  return getTimeToBuyFromPrice(price);
}

function getCarTimeToBuy(slot: { vehicleId: number | null; trainLength: number }): string {
  const price = getNextCarCost(slot);
  return getTimeToBuyFromPrice(price);
}

function getMaxCarsTimeToBuy(slot: { vehicleId: number | null; trainLength: number }): string {
  const price = getTotalCarsCost(slot);
  return getTimeToBuyFromPrice(price);
}

function getVehicleCapacity(slot: { vehicleId: number | null; trainLength: number }, _index: number): number {
  if (slot.vehicleId === null) return 0;
  const vt = getVehicleType(slot.vehicleId);
  if (!vt) return 0;

  const {
    universalMultiplier,
    hoverMultiplier,
    hyperloopMultiplier,
    epicMultiplier,
    colleggtibleMultiplier,
    artifactMultiplier
  } = effectiveMultipliers.value;

  const trainLength = vt.isHyperloop ? slot.trainLength : 1;
  const baseCapacity = vt.baseCapacityPerSecond * trainLength;

  const vehicleHoverMult = vt.isHover ? hoverMultiplier : 1;
  const vehicleHyperloopMult = vt.isHyperloop ? hyperloopMultiplier : 1;

  return baseCapacity * universalMultiplier * epicMultiplier * vehicleHoverMult * vehicleHyperloopMult * colleggtibleMultiplier * artifactMultiplier;
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

  // Don't add if it's already the same (check array bounds for slots unlocked by fleet research)
  const currentSlot = displaySlots.value[slotIndex];
  if (currentSlot && currentSlot.vehicleId === vehicleId) return;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  // Calculate cost based on effective state
  const effectiveVehicles = beforeSnapshot.vehicles;
  const existingCount = countVehiclesOfType(effectiveVehicles, vehicleId);
  const cost = getDiscountedVehiclePrice(vehicleId, existingCount, costModifiers.value);

  // Build payload
  const payload = {
    slotIndex,
    vehicleId,
    trainLength: vehicleId === 11 ? 1 : undefined,
  };

  // Compute dependencies (hyperloop train cars depend on graviton coupling)
  const dependencies = computeDependencies('buy_vehicle', payload, actionsStore.actions);

  // Apply to store
  shippingStore.setVehicle(slotIndex, vehicleId);

  // Complete execution
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'buy_vehicle',
    payload,
    cost,
    dependsOn: dependencies,
  }, beforeSnapshot);
}

// ============================================================================
// Train Car Functions
// ============================================================================

/**
 * Get the maximum train length based on graviton coupling research.
 */
function getMaxTrainLength(): number {
  return calculateMaxTrainLength(effectiveSnapshot.value.researchLevels);
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
 * Get the total cost for all remaining train cars.
 */
function getTotalCarsCost(slot: { vehicleId: number | null; trainLength: number }): number {
  if (slot.vehicleId !== 11) return 0;
  let total = 0;
  const currentLength = slot.trainLength;
  const maxLength = getMaxTrainLength();
  for (let i = currentLength; i < maxLength; i++) {
    total += getDiscountedTrainCarPrice(i, costModifiers.value);
  }
  return total;
}

/**
 * Handle adding a single train car.
 */
function handleAddTrainCar(slotIndex: number) {
  const slot = displaySlots.value[slotIndex];
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
  const slot = displaySlots.value[slotIndex];
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
  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

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

  // Complete execution
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'buy_train_car',
    payload,
    cost,
    dependsOn: dependencies,
  }, beforeSnapshot);
}
</script>

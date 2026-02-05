<template>
  <div class="space-y-6">
    <!-- Final Result -->
    <div class="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
      <div class="flex justify-between items-center mb-2">
        <div class="text-sm text-blue-700 font-medium">Shipping Capacity</div>
        <!-- Time Unit Toggle -->
        <div class="flex gap-1">
          <button
            v-for="unit in timeUnits"
            :key="unit.value"
            class="px-2 py-1 text-xs rounded"
            :class="timeUnit === unit.value
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'"
            @click="$emit('set-time-unit', unit.value)"
          >
            {{ unit.label }}
          </button>
        </div>
      </div>
      <div class="text-3xl font-bold text-blue-900">
        {{ formatNumber(convertedCapacity, 2) }}/{{ timeUnitLabel }}
      </div>
      <div class="text-sm text-blue-600 mt-1">
        Fleet: {{ activeVehicleCount }}/{{ output.maxVehicleSlots }} vehicles
      </div>
    </div>

    <!-- Vehicle Cost Discounts Section -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Vehicle Cost Discounts</h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('bust_unions'), 64)" class="w-6 h-6 object-contain" alt="Bust Unions" />
            <span class="text-gray-600">Bust Unions</span>
            <span class="text-xs text-gray-400 ml-1">(Epic Research)</span>
          </div>
          <span class="font-mono" :class="bustUnionsLevel > 0 ? 'text-purple-600' : 'text-gray-400'">
            {{ bustUnionsLevel > 0 ? `-${bustUnionsLevel * 5}%` : '—' }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('lithium'), 64)" class="w-6 h-6 object-contain" alt="Lithium" />
            <span class="text-gray-600">Lithium</span>
            <span class="text-xs text-gray-400 ml-1">(Colleggtible)</span>
          </div>
          <span class="font-mono" :class="lithiumMultiplier < 1 ? 'text-cyan-600' : 'text-gray-400'">
            {{ lithiumMultiplier < 1 ? formatPercent(lithiumMultiplier - 1, 0) : '—' }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center bg-gray-50">
          <span class="font-medium text-gray-900">Total Discount</span>
          <span class="font-mono font-medium" :class="totalCostMultiplier < 1 ? 'text-green-600' : 'text-gray-400'">
            {{ totalCostMultiplier < 1 ? formatPercent(totalCostMultiplier - 1, 0) : '—' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Vehicle Slots -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Vehicles</h3>
      </div>
      <div class="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        <div
          v-for="(slot, index) in vehicles.slice(0, output.maxVehicleSlots)"
          :key="index"
          class="px-4 py-2"
        >
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-400 w-6">{{ index + 1 }}</span>
            <div v-if="slot.vehicleId !== null" class="flex items-center gap-2 flex-1">
              <img
                :src="iconURL(getVehicleType(slot.vehicleId)?.iconPath ?? '', 64)"
                class="w-6 h-6 object-contain"
                :alt="getVehicleType(slot.vehicleId)?.name"
              />
              <span class="text-sm text-gray-900">{{ getVehicleType(slot.vehicleId)?.name }}</span>
            </div>
            <span v-else class="text-sm text-gray-400 italic flex-1">Empty</span>
            <!-- Capacity and cost display -->
            <div class="text-right w-28">
              <div v-if="slot.vehicleId !== null" class="text-xs text-gray-500">
                {{ formatNumber(getVehicleCapacity(index), 0) }}/s
              </div>
              <div v-if="slot.vehicleId !== null" class="text-xs text-amber-600">
                {{ formatNumber(getVehiclePriceForSlot(index), 0) }}
              </div>
            </div>
          </div>
          <!-- Train length controls for Hyperloop (on separate line) -->
          <div v-if="slot.vehicleId === 11" class="flex items-center gap-1 mt-1 ml-9">
            <button
              class="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-xs disabled:opacity-30"
              :disabled="slot.trainLength <= 1"
              @click="$emit('remove-train-car', index)"
            >
              -
            </button>
            <span class="text-sm w-8 text-center">{{ slot.trainLength }}</span>
            <button
              class="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-xs disabled:opacity-30"
              :disabled="slot.trainLength >= maxTrainLength"
              @click="$emit('add-train-car', index)"
            >
              +
            </button>
            <span class="text-xs text-gray-400">cars</span>
            <span class="text-xs text-amber-600 ml-2">
              (next: {{ formatNumber(getNextTrainCarPrice(slot.trainLength), 0) }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Multiplier Breakdown -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Multiplier Breakdown</h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Universal Research</span>
          <span class="font-mono" :class="output.universalMultiplier !== 1 ? 'text-blue-600' : 'text-gray-400'">
            {{ formatMultiplier(output.universalMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Hover Upgrades</span>
          <span class="font-mono" :class="output.hoverMultiplier !== 1 ? 'text-purple-600' : 'text-gray-400'">
            {{ formatMultiplier(output.hoverMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Hyperloop Upgrades</span>
          <span class="font-mono" :class="output.hyperloopMultiplier !== 1 ? 'text-cyan-600' : 'text-gray-400'">
            {{ formatMultiplier(output.hyperloopMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('transportation_lobbyist'), 64)" class="w-4 h-4 object-contain" alt="Transportation Lobbyists" />
            <span class="text-gray-600">Epic (Transportation Lobbyists)</span>
          </div>
          <span class="font-mono" :class="output.epicMultiplier !== 1 ? 'text-purple-600' : 'text-gray-400'">
            {{ formatMultiplier(output.epicMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Colleggtibles</span>
          <span class="font-mono" :class="output.colleggtibleMultiplier !== 1 ? 'text-green-600' : 'text-gray-400'">
            {{ formatMultiplier(output.colleggtibleMultiplier) }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <span class="text-gray-600">Artifacts</span>
          <span class="font-mono" :class="output.artifactMultiplier !== 1 ? 'text-purple-600' : 'text-gray-400'">
            {{ formatMultiplier(output.artifactMultiplier) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Artifact Breakdown -->
    <div v-if="output.artifactBreakdown.length > 0" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Artifact Effects <span class="text-xs text-gray-500 font-normal">(from Initial State)</span></h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div
          v-for="(effect, index) in output.artifactBreakdown"
          :key="index"
          class="px-4 py-2 flex justify-between items-center"
        >
          <div>
            <span class="text-sm text-gray-900">{{ effect.label }}</span>
            <span class="ml-1 text-xs" :class="effect.source === 'artifact' ? 'text-purple-500' : 'text-blue-500'">
              ({{ effect.source }})
            </span>
          </div>
          <span class="font-mono text-purple-600">{{ effect.effect }}</span>
        </div>
      </div>
    </div>

    <!-- Shipping Research (Read-only from Common Research) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Shipping Research <span class="text-xs text-gray-500 font-normal">(from Common Research)</span></h3>
      </div>
      <div class="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        <!-- Capacity Research -->
        <div
          v-for="research in output.researchBreakdown"
          :key="research.researchId"
          class="px-4 py-2 flex justify-between items-center"
        >
          <div class="flex-1 flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath(research.researchId), 64)" class="w-5 h-5 object-contain" :alt="research.name" />
            <span class="text-sm text-gray-900">{{ research.name }}</span>
            <span
              v-if="research.hoverOnly"
              class="ml-1 text-xs text-purple-600"
            >(hover)</span>
            <span
              v-if="research.hyperloopOnly"
              class="ml-1 text-xs text-cyan-600"
            >(hyperloop)</span>
            <span
              class="ml-2 text-xs font-mono"
              :class="research.multiplier > 1 ? 'text-blue-600' : 'text-gray-400'"
            >
              {{ formatMultiplier(research.multiplier, true) }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono text-gray-700">{{ research.level }}</span>
            <span class="text-xs text-gray-400">/ {{ research.maxLevel }}</span>
          </div>
        </div>
        <!-- Fleet Size Research -->
        <div
          v-for="research in output.fleetSizeBreakdown"
          :key="research.researchId"
          class="px-4 py-2 flex justify-between items-center"
        >
          <div class="flex-1 flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath(research.researchId), 64)" class="w-5 h-5 object-contain" :alt="research.name" />
            <span class="text-sm text-gray-900">{{ research.name }}</span>
            <span
              class="ml-2 text-xs"
              :class="research.slotsAdded > 0 ? 'text-green-600' : 'text-gray-400'"
            >
              +{{ research.slotsAdded }} slots
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono text-gray-700">{{ research.level }}</span>
            <span class="text-xs text-gray-400">/ {{ research.maxLevel }}</span>
          </div>
        </div>
        <!-- Graviton Coupling -->
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex-1 flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('micro_coupling'), 64)" class="w-5 h-5 object-contain" alt="Graviton Coupling" />
            <span class="text-sm text-gray-900">Graviton Coupling</span>
            <span
              class="ml-2 text-xs"
              :class="gravitonCouplingLevel > 0 ? 'text-cyan-600' : 'text-gray-400'"
            >
              Max {{ maxTrainLength }} cars/train
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono text-gray-700">{{ gravitonCouplingLevel }}</span>
            <span class="text-xs text-gray-400">/ 5</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Epic Research (Read-only from Initial State) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Epic Research <span class="text-xs text-gray-500 font-normal">(from Initial State)</span></h3>
      </div>
      <div class="px-4 py-3">
        <div class="flex justify-between items-center mb-1">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('transportation_lobbyist'), 64)" class="w-6 h-6 object-contain" alt="Transportation Lobbyists" />
            <span class="font-medium text-gray-900">Transportation Lobbyists</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="transportationLobbyistLevel > 0 ? 'text-purple-600' : 'text-gray-400'"
            >
              {{ formatMultiplier(1 + transportationLobbyistLevel * 0.05, true) }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono text-gray-700">{{ transportationLobbyistLevel }}</span>
            <span class="text-xs text-gray-400">/ 30</span>
          </div>
        </div>
        <div class="text-xs text-gray-500 ml-8">+5% shipping capacity per level</div>
      </div>
    </div>

    <!-- Colleggtibles (Read-only from Initial State) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Colleggtibles <span class="text-xs text-gray-500 font-normal">(from Initial State)</span></h3>
      </div>
      <div class="px-4 py-3 space-y-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('carbon-fiber'), 64)" class="w-6 h-6 object-contain" alt="Carbon Fiber" />
            <span class="font-medium text-gray-900">Carbon Fiber</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="colleggtibleTiers.carbonFiber >= 0 ? 'text-green-600' : 'text-gray-400'"
            >
              {{ formatColleggtibleBonus(carbonFiberMultiplier) }}
            </span>
          </div>
          <span class="text-sm text-gray-600">{{ formatTier(colleggtibleTiers.carbonFiber) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('pumpkin'), 64)" class="w-6 h-6 object-contain" alt="Pumpkin" />
            <span class="font-medium text-gray-900">Pumpkin</span>
            <span
              class="ml-2 text-sm font-mono"
              :class="colleggtibleTiers.pumpkin >= 0 ? 'text-green-600' : 'text-gray-400'"
            >
              {{ formatColleggtibleBonus(pumpkinMultiplier) }}
            </span>
          </div>
          <span class="text-sm text-gray-600">{{ formatTier(colleggtibleTiers.pumpkin) }}</span>
        </div>
        <div class="text-xs text-gray-500">Shipping capacity bonus from colleggtibles</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShippingCapacityOutput, VehicleSlot, TimeUnit } from '@/types';
import {
  getVehicleType,
  getVehicleCostMultiplier,
  getDiscountedVehiclePrice,
  getDiscountedTrainCarPrice,
  countVehiclesOfTypeBefore,
  type VehicleCostModifiers,
} from '@/lib/vehicles';
import { formatNumber, formatMultiplier, formatPercent } from '@/lib/format';
import { formatTier, formatColleggtibleBonus, getColleggtibleMultiplier } from '@/lib/colleggtibles';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';
import { computed } from 'vue';

const props = defineProps<{
  output: ShippingCapacityOutput;
  vehicles: VehicleSlot[];
  transportationLobbyistLevel: number;
  colleggtibleTiers: {
    carbonFiber: number;
    pumpkin: number;
  };
  gravitonCouplingLevel: number;
  maxTrainLength: number;
  timeUnit: TimeUnit;
  bustUnionsLevel: number;
  lithiumMultiplier: number;
}>();

defineEmits<{
  'add-train-car': [slotIndex: number];
  'remove-train-car': [slotIndex: number];
  'set-time-unit': [unit: TimeUnit];
}>();

// Computed multipliers for display
const carbonFiberMultiplier = computed(() => getColleggtibleMultiplier('carbon-fiber', props.colleggtibleTiers.carbonFiber));
const pumpkinMultiplier = computed(() => getColleggtibleMultiplier('pumpkin', props.colleggtibleTiers.pumpkin));

// Cost modifiers object
const costModifiers = computed<VehicleCostModifiers>(() => ({
  bustUnionsLevel: props.bustUnionsLevel,
  lithiumMultiplier: props.lithiumMultiplier,
}));

// Total cost multiplier for display
const totalCostMultiplier = computed(() => getVehicleCostMultiplier(costModifiers.value));

const timeUnits = [
  { value: 'minute' as const, label: '/min' },
  { value: 'hour' as const, label: '/hr' },
  { value: 'day' as const, label: '/day' },
];

const timeUnitLabel = computed(() => {
  switch (props.timeUnit) {
    case 'minute': return 'min';
    case 'hour': return 'hr';
    case 'day': return 'day';
  }
});

const convertedCapacity = computed(() => {
  const perSecond = props.output.totalFinalCapacity;
  switch (props.timeUnit) {
    case 'minute': return perSecond * 60;
    case 'hour': return perSecond * 3600;
    case 'day': return perSecond * 86400;
  }
});

const activeVehicleCount = computed(() => {
  return props.vehicles.filter(v => v.vehicleId !== null).length;
});

function getVehicleCapacity(index: number): number {
  const breakdown = props.output.vehicleBreakdown[index];
  return breakdown ? breakdown.finalCapacity : 0;
}

/**
 * Get the price that was paid for the vehicle in a specific slot.
 */
function getVehiclePriceForSlot(slotIndex: number): number {
  const vehicleId = props.vehicles[slotIndex]?.vehicleId;
  if (vehicleId === null || vehicleId === undefined) return 0;

  const purchaseIndex = countVehiclesOfTypeBefore(props.vehicles, vehicleId, slotIndex);
  return getDiscountedVehiclePrice(vehicleId, purchaseIndex, costModifiers.value);
}

/**
 * Get the price for the next train car.
 */
function getNextTrainCarPrice(currentTrainLength: number): number {
  // currentTrainLength is 1-10, and carIndex is 0-9
  // So next car is at index = currentTrainLength
  return getDiscountedTrainCarPrice(currentTrainLength, costModifiers.value);
}
</script>

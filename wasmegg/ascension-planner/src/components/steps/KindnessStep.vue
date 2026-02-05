<template>
  <div class="space-y-6">
    <!-- Step Header with Metrics -->
    <step-header
      :step="step"
      :previous-steps="previousSteps"
      :initial-data="initialData"
      :arrival-time="arrivalTime"
      :departure-time="departureTime"
    />

    <!-- Header / Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-blue-50 rounded-xl p-4 border border-blue-100 relative overflow-hidden">
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-xs font-bold text-blue-500 uppercase tracking-widest">Total Shipping</h3>
          <span class="text-[10px] font-bold text-blue-400 bg-blue-100 px-1.5 py-0.5 rounded">
            {{ formatEIValue(shippableRatePerSecond * 60) }}/min
          </span>
        </div>
        <p class="text-3xl font-black text-blue-700 tabular-nums">
          {{ formatEIValue(shippableRatePerSecond) }}<span class="text-lg ml-0.5 opacity-60">/s</span>
        </p>
        <div v-if="(step.modifiers?.shippingCap ?? 1) > 1" class="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
          <span class="opacity-70">Colleggtibles:</span>
          +{{ (((step.modifiers?.shippingCap ?? 1) - 1) * 100).toFixed(0) }}%
        </div>
      </div>

      <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col justify-center text-center">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fleet Slots</h3>
        <p class="text-2xl font-bold text-gray-700">
          {{ occupiedSlotsCount }} / {{ maxSlots }}
        </p>
        <div class="flex gap-1 justify-center mt-2">
          <div 
            v-for="i in maxSlots" :key="i"
            class="h-1.5 w-4 rounded-full"
            :class="i <= occupiedSlotsCount ? 'bg-blue-500' : 'bg-gray-200'"
          ></div>
        </div>
      </div>
    </div>

    <!-- Vehicle Slots -->
    <div class="space-y-2">
      <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Active Fleet</h3>
      <div v-for="slotIndex in maxSlots" :key="slotIndex" class="group">
        <div 
          v-if="getVehicleAtSlot(slotIndex - 1)" 
          class="border border-gray-200 rounded-lg p-3 bg-white hover:border-blue-300 transition-all flex items-center gap-4 relative"
        >
          <img :src="iconURL(getVehicleAtSlot(slotIndex - 1)?.iconPath || '', 64)" class="h-12 w-12" />
          <div class="flex-grow min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-gray-900">{{ getVehicleAtSlot(slotIndex - 1)?.name }}</span>
              <span class="text-[10px] font-mono text-gray-400 bg-gray-50 px-1 rounded">Slot {{ slotIndex }}</span>
            </div>
            <p class="text-[10px] text-gray-500">
              Capacity: {{ formatEIValue(getModifiedCapacity(getVehicleAtSlot(slotIndex - 1)!)) }}/s 
              <span v-if="getVehicleAtSlot(slotIndex - 1)?.id === 11" class="text-blue-500 font-bold ml-1">
                ({{ getVehicleAtSlot(slotIndex - 1)?.trainLength }} cars)
              </span>
            </p>
          </div>

          <!-- Hyperloop Controls -->
          <div v-if="getVehicleAtSlot(slotIndex - 1)?.id === 11" class="flex items-center gap-1.5 pr-2">
            <button 
              class="p-1 rounded bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-20"
              :disabled="getVehicleAtSlot(slotIndex - 1)!.trainLength <= 1"
              @click="removeCar(slotIndex - 1)"
            >
              <MinusIcon class="h-4 w-4" />
            </button>
            <span class="text-xs font-bold w-4 text-center">{{ getVehicleAtSlot(slotIndex - 1)!.trainLength }}</span>
            <button 
              class="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-20"
              :disabled="getVehicleAtSlot(slotIndex - 1)!.trainLength >= maxHyperloopCars"
              :title="getVehicleAtSlot(slotIndex - 1)!.trainLength >= maxHyperloopCars ? 'Max cars reached' : 'Add car'"
              @click="addCar(slotIndex - 1)"
            >
              <PlusIcon class="h-4 w-4" />
            </button>
          </div>

          <!-- Remove vehicle -->
          <button 
            class="text-gray-300 hover:text-red-500 transition-colors"
            title="Release Vehicle"
            @click="removeVehicle(slotIndex - 1)"
          >
            <XIcon class="h-4 w-4" />
          </button>
        </div>

        <button 
          v-else
          class="w-full border-2 border-dashed border-gray-100 rounded-lg p-4 text-gray-300 hover:text-blue-400 hover:border-blue-100 transition-all flex items-center justify-center gap-2 group-hover:bg-gray-50"
          @click="openPicker(slotIndex - 1)"
        >
          <PlusCircleIcon class="h-5 w-5" />
          <span class="text-xs font-bold uppercase tracking-wider">Empty Slot {{ slotIndex }}</span>
        </button>
      </div>
    </div>

    <!-- Purchase History -->
    <div v-if="step.vehicleLog && step.vehicleLog.length > 0" class="border border-gray-200 rounded-lg bg-gray-50">
      <div class="px-3 py-1.5 border-b border-gray-200 font-bold text-[10px] uppercase tracking-wider text-gray-400">
        Vehicle Log
      </div>
      <div class="max-h-40 overflow-y-auto p-0">
        <div 
          v-for="(entry, index) in reversedLog" 
          :key="entry.timestamp"
          class="px-3 py-1.5 border-b border-gray-100 last:border-0 text-[10px] flex justify-between items-center bg-white"
        >
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-700">
                {{ entry.type === 'buy' ? 'Purchased' : entry.type === 'add_car' ? 'Added Car to' : 'Removed' }}
                {{ getVehicleName(entry.vehicleId) }}
              </span>
              <span class="text-gray-400">Slot {{ entry.slotIndex + 1 }}</span>
            </div>
            <div class="text-[9px] text-gray-400">
              {{ entry.trainLength }} cars total
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-gray-500 font-mono">{{ formatEIValue(entry.cost) }} gems</span>
            <span v-if="entry.timeToEarn" class="text-blue-500 font-mono">
              {{ formatStepDuration(entry.timeToEarn) }}
            </span>
            <button
              class="text-gray-300 hover:text-red-500 transition-colors"
              title="Revert this action"
              @click="revertLogEntry(entry)"
            >
              <XIcon class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vehicle Picker Modal -->
    <div
      v-if="activePickerSlot !== null"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closePicker"
    >
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="font-black text-gray-900">Choose Vehicle</h3>
            <p class="text-xs text-gray-400 font-medium uppercase tracking-tight">Slot {{ activePickerSlot + 1 }}</p>
          </div>
          <button class="text-gray-300 hover:text-gray-600 transition-colors" @click="closePicker">
            <XIcon class="h-6 w-6" />
          </button>
        </div>
        
        <div class="p-4 overflow-y-auto space-y-2">
          <button
            v-for="vehicle in vehicleTypes"
            :key="vehicle.id"
            class="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all text-left relative overflow-hidden group"
            @click="buyVehicle(activePickerSlot!, vehicle.id)"
          >
            <div class="h-14 w-14 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <img :src="iconURL(vehicle.iconPath, 64)" class="h-10 w-10" />
            </div>
            <div class="flex-grow min-w-0">
              <p class="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{{ vehicle.name }}</p>
              <p class="text-[11px] text-gray-500 leading-tight">
                Base: {{ formatEIValue(vehicle.baseCapacity) }}/s <br/>
                Modified: <span class="text-blue-600 font-bold">{{ formatEIValue(getModifiedCapacity({ ...vehicle, trainLength: 1 })) }}/s</span>
              </p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-gray-900">
                {{ formatEIValue(getVehicleVirtueCost(vehicle.id)) }}
              </p>
              <p class="text-[9px] font-bold text-gray-400 uppercase">gems</p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Bonuses Section -->
    <div class="bg-gray-50 rounded-lg p-3 space-y-2">
      <p class="text-sm font-medium text-gray-700 mb-2">Bonuses (from player data)</p>

      <!-- Epic Research: Bust Unions -->
      <div class="flex items-center justify-between text-sm">
        <div>
          <span class="text-gray-600">Bust Unions</span>
          <span class="text-xs text-gray-400 ml-1">(Epic Research)</span>
        </div>
        <div class="text-right">
          <span class="font-medium text-gray-900">Level {{ bustUnionsLevel }}/10</span>
          <span v-if="vehicleCostReduction > 0" class="text-green-600 ml-2">-{{ vehicleCostReduction }}% vehicle cost</span>
        </div>
      </div>

      <!-- Epic Research: Transportation Lobbyists -->
      <div class="flex items-center justify-between text-sm">
        <div>
          <span class="text-gray-600">Transportation Lobbyists</span>
          <span class="text-xs text-gray-400 ml-1">(Epic Research)</span>
        </div>
        <div class="text-right">
          <span class="font-medium text-gray-900">Level {{ transportationLobbyistLevel }}/30</span>
          <span v-if="shippingCapacityBonus > 0" class="text-green-600 ml-2">+{{ shippingCapacityBonus }}% shipping</span>
        </div>
      </div>

      <!-- Colleggtible: Vehicle Cost -->
      <div v-if="vehicleCostColleggtibleReduction > 0" class="flex items-center justify-between text-sm">
        <div>
          <span class="text-gray-600">Vehicle Cost</span>
          <span class="text-xs text-gray-400 ml-1">(Colleggtibles)</span>
        </div>
        <div class="text-right">
          <span class="text-green-600 font-medium">-{{ vehicleCostColleggtibleReduction }}%</span>
        </div>
      </div>

      <!-- Colleggtible: Shipping Capacity -->
      <div v-if="shippingCapColleggtibleBonus > 0" class="flex items-center justify-between text-sm">
        <div>
          <span class="text-gray-600">Shipping Capacity</span>
          <span class="text-xs text-gray-400 ml-1">(Colleggtibles)</span>
        </div>
        <div class="text-right">
          <span class="text-green-600 font-medium">+{{ shippingCapColleggtibleBonus }}%</span>
        </div>
      </div>
    </div>

    <!-- Relevant Research -->
    <collapsible-section
      section-title="Relevant Research"
      :visible="isResearchVisible"
      @toggle="isResearchVisible = !isResearchVisible"
    >
      <div class="mt-2">
        <research-section
          :step="step"
          :previous-steps="previousSteps"
          :allowed-categories="['shipping_capacity', 'fleet_size']"
          :read-only="true"
        />
      </div>
    </collapsible-section>

    <!-- Fuel Tank (available on all eggs) -->
    <!-- Hidden for now --><fuel-tank v-if="false" :step="step" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from 'vue';
import {
  XIcon,
  PlusCircleIcon,
  MinusIcon,
  PlusIcon
} from '@heroicons/vue/solid';
import {
  iconURL,
  formatEIValue,
  vehicleTypes,
  type Vehicle,
  commonResearches,
  getResearchLevelFromLog
} from '@/lib';
import { computeIncrementalPurchaseTimes } from '@/lib/duration_calculations';
import { formatStepDuration } from '@/lib/step_metrics';
import type { AscensionStep, VehicleLogEntry, InitialData } from '@/types';
import FuelTank from '@/components/FuelTank.vue';
import ResearchSection from '@/components/ResearchSection.vue';
import CollapsibleSection from '@/components/CollapsibleSection.vue';
import StepHeader from '@/components/StepHeader.vue';

// Derived from documented Virtue patterns
const VEHICLE_VIRTUE_COSTS = [0, 100, 1000, 10000, 100000, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12];
const CAR_SCALAR = 0.5; // Car cost as fraction of engine cost

export default defineComponent({
  name: 'KindnessStep',
  components: {
    XIcon,
    PlusCircleIcon,
    MinusIcon,
    PlusIcon,
    FuelTank,
    ResearchSection,
    CollapsibleSection,
    StepHeader,
  },
  props: {
    step: {
      type: Object as PropType<AscensionStep>,
      required: true,
    },
    previousSteps: {
      type: Array as PropType<AscensionStep[]>,
      default: () => [],
    },
    initialData: {
      type: Object as PropType<InitialData>,
      default: undefined,
    },
    arrivalTime: {
      type: Number,
      default: undefined,
    },
    departureTime: {
      type: Number,
      default: undefined,
    },
  },
  setup(props) {
    const activePickerSlot = ref<number | null>(null);
    const isResearchVisible = ref(false);

    // Epic research: Bust Unions (-5% vehicle cost per level, max 10)
    const bustUnionsLevel = computed(() => props.initialData?.epicResearch?.bustUnions || 0);
    const vehicleCostReduction = computed(() => bustUnionsLevel.value * 5);

    // Epic research: Transportation Lobbyists (+5% shipping capacity per level, max 30)
    const transportationLobbyistLevel = computed(() => props.initialData?.epicResearch?.transportationLobbyist || 0);
    const shippingCapacityBonus = computed(() => transportationLobbyistLevel.value * 5);

    // Colleggtible modifiers
    const vehicleCostColleggtible = computed(() => props.step.modifiers?.vehicleCost ?? 1);
    const vehicleCostColleggtibleReduction = computed(() => Math.round((1 - vehicleCostColleggtible.value) * 100));

    const shippingCapColleggtible = computed(() => props.step.modifiers?.shippingCap ?? 1);
    const shippingCapColleggtibleBonus = computed(() => Math.round((shippingCapColleggtible.value - 1) * 100));

    // Persistence: Recompute current state from log
    const currentFleet = computed(() => {
      const slots: (Vehicle | null)[] = Array(17).fill(null);
      
      // Slot 1 (index 0) starts with a Trike by default
      const trikeProto = vehicleTypes.find(v => v.id === 0);
      if (trikeProto) {
        slots[0] = { ...trikeProto, trainLength: 1 };
      }

      if (!props.step.vehicleLog) return slots;

      for (const entry of props.step.vehicleLog) {
        if (entry.type === 'buy') {
          const proto = vehicleTypes.find(v => v.id === entry.vehicleId);
          if (proto) {
            slots[entry.slotIndex] = { ...proto, trainLength: entry.trainLength };
          }
        } else if (entry.type === 'add_car') {
          const existing = slots[entry.slotIndex];
          if (existing) {
             existing.trainLength = entry.trainLength;
          }
        } else if (entry.type === 'remove') {
          slots[entry.slotIndex] = null;
        }
      }
      return slots;
    });

    const fullResearchLog = computed(() => {
      return [...(props.previousSteps || []).flatMap(s => s.researchLog || []), ...(props.step.researchLog || [])];
    });

    const getResLevel = (id: string) => getResearchLevelFromLog(fullResearchLog.value, id);

    const maxSlots = computed(() => {
      let slots = 4;
      slots += getResLevel('vehicle_reliablity');
      slots += getResLevel('excoskeletons');
      slots += getResLevel('traffic_management');
      slots += getResLevel('egg_loading_bots');
      slots += getResLevel('autonomous_vehicles');
      return slots;
    });

    const maxHyperloopCars = computed(() => {
      return 5 + getResLevel('micro_coupling');
    });

    const occupiedSlotsCount = computed(() => currentFleet.value.filter(v => v !== null).length);

    const shippingMultiplier = computed(() => {
      const researches = commonResearches.filter(r => r.categories && r.categories.includes('shipping_capacity'));
      let universal = 1;
      let hover = 1;
      let hyperloop = 1;

      for (const r of researches) {
        const level = getResLevel(r.id);
        if (level > 0) {
          const bonus = 1 + (level * r.per_level);
          if (r.id === 'hover_upgrades') {
            hover *= bonus;
          } else if (r.id === 'hyper_portalling') {
            hyperloop *= bonus;
          } else {
            universal *= bonus;
          }
        }
      }

      // Add Colleggtible Modifier
      const collectorBonus = props.step.modifiers?.shippingCap ?? 1;

      return { universal, hover, hyperloop, collectorBonus };
    });

    const getModifiedCapacity = (v: Vehicle | { id: number, baseCapacity: number, trainLength: number }) => {
      const { universal, hover, hyperloop, collectorBonus } = shippingMultiplier.value;
      let multiplier = universal * collectorBonus;
      if (v.id >= 9) multiplier *= hover;
      if (v.id === 11) multiplier *= hyperloop;
      
      return v.baseCapacity * v.trainLength * multiplier;
    };

    const shippableRatePerSecond = computed(() => {
      return currentFleet.value.reduce((total, v) => {
        if (!v) return total;
        return total + getModifiedCapacity(v);
      }, 0);
    });

    // Helper functions
    const getVehicleVirtueCost = (id: number) => VEHICLE_VIRTUE_COSTS[id] || 0;
    const getCarCost = (id: number, carIndex: number) => Math.floor(getVehicleVirtueCost(id) * CAR_SCALAR * Math.pow(1.2, carIndex - 1));

    const openPicker = (index: number) => activePickerSlot.value = index;
    const closePicker = () => activePickerSlot.value = null;

    const logAction = (entry: Omit<VehicleLogEntry, 'id' | 'timestamp'>) => {
      if (!props.step.vehicleLog) props.step.vehicleLog = [];
      const newEntry: VehicleLogEntry = {
        ...entry,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      };
      props.step.vehicleLog.push(newEntry);

      // Compute and store timeToEarn for this purchase (only for purchases with cost)
      if (props.initialData && entry.cost > 0) {
        const purchaseTimes = computeIncrementalPurchaseTimes(
          props.step,
          props.previousSteps,
          props.initialData
        );
        // Find the purchase time for this entry (last one added)
        const lastPurchaseTime = purchaseTimes[purchaseTimes.length - 1];
        if (lastPurchaseTime) {
          newEntry.timeToEarn = lastPurchaseTime.timeToEarn;
        }
      }
    };

    const buyVehicle = (slotIndex: number, vehicleId: number) => {
      logAction({
        type: 'buy',
        slotIndex,
        vehicleId,
        trainLength: 1,
        cost: getVehicleVirtueCost(vehicleId)
      });
      closePicker();
    };

    const addCar = (slotIndex: number) => {
      const v = currentFleet.value[slotIndex];
      if (!v || v.id !== 11 || v.trainLength >= maxHyperloopCars.value) return;
      
      logAction({
        type: 'add_car',
        slotIndex,
        vehicleId: v.id,
        trainLength: v.trainLength + 1,
        cost: getCarCost(v.id, v.trainLength + 1)
      });
    };

    const removeCar = (slotIndex: number) => {
      const v = currentFleet.value[slotIndex];
      if (!v || v.id !== 11 || v.trainLength <= 1) return;

      // Find the last add_car log for this vehicle in this slot to "refund" or just subtract
      logAction({
        type: 'add_car', // Using add_car with lower length as a "state update"
        slotIndex,
        vehicleId: v.id,
        trainLength: v.trainLength - 1,
        cost: 0 // Simplification: remove doesn't refund or cost
      });
    };

    const removeVehicle = (slotIndex: number) => {
      const v = currentFleet.value[slotIndex];
      if (!v) return;
      logAction({
        type: 'remove',
        slotIndex,
        vehicleId: v.id,
        trainLength: 0,
        cost: 0
      });
    };

    const revertLogEntry = (entry: VehicleLogEntry) => {
      const log = props.step.vehicleLog;
      if (!log) return;
      const idx = log.findIndex(e => e.id === entry.id);
      if (idx !== -1) {
        log.splice(idx, 1);
      }
    };

    return {
      vehicleTypes,
      currentFleet,
      maxSlots,
      maxHyperloopCars,
      occupiedSlotsCount,
      shippableRatePerSecond,
      activePickerSlot,
      isResearchVisible,
      reversedLog: computed(() => props.step.vehicleLog ? [...props.step.vehicleLog].reverse() : []),
      iconURL,
      formatEIValue,
      formatStepDuration,
      getVehicleAtSlot: (idx: number) => currentFleet.value[idx],
      getModifiedCapacity,
      getVehicleName: (id: number) => vehicleTypes.find(v => v.id === id)?.name || 'Unknown',
      getVehicleVirtueCost,
      openPicker,
      closePicker,
      buyVehicle,
      addCar,
      removeCar,
      removeVehicle,
      revertLogEntry,
      // Epic research & colleggtibles
      bustUnionsLevel,
      vehicleCostReduction,
      transportationLobbyistLevel,
      shippingCapacityBonus,
      vehicleCostColleggtibleReduction,
      shippingCapColleggtibleBonus,
    };
  },
});
</script>

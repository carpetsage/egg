<template>
  <div class="space-y-4">
    <!-- Final Result -->
    <div class="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-inner flex justify-between items-center">
      <div>
        <div class="flex items-center gap-3 mb-1">
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shipping Capacity</div>
          <div class="badge-premium badge-brand py-0 text-[8px]">
            {{ activeVehicleCount }}/{{ output.maxVehicleSlots }} Vehicles
          </div>
        </div>
        <div class="text-3xl font-bold text-slate-800 tracking-tight">
          {{ formatNumber(convertedCapacity, 1) }}
          <span class="text-sm font-medium text-slate-400">/{{ timeUnitLabel }}</span>
        </div>
      </div>
      <!-- Time Unit Toggle -->
      <div class="inline-flex p-1 bg-white rounded-xl border border-slate-200/50 shadow-sm">
        <button
          v-for="unit in timeUnits"
          :key="unit.value"
          class="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-200"
          :class="
            timeUnit === unit.value ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
          "
          @click="$emit('set-time-unit', unit.value)"
        >
          {{ unit.label }}
        </button>
      </div>
    </div>

    <!-- Vehicle Cost Discounts -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Vehicle Cost Discounts</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform"
            >
              <img
                :src="iconURL(getColleggtibleIconPath('bust_unions'), 64)"
                class="w-5 h-5 object-contain"
                alt="Bust Unions"
              />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Bust Unions</div>
            </div>
          </div>
          <span
            class="font-mono-premium text-sm font-bold"
            :class="bustUnionsLevel > 0 ? 'text-slate-900' : 'text-slate-300'"
          >
            {{ bustUnionsLevel > 0 ? `-${bustUnionsLevel * 5}%` : '—' }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform"
            >
              <img
                :src="iconURL(getColleggtibleIconPath('lithium'), 64)"
                class="w-5 h-5 object-contain"
                alt="Lithium"
              />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Lithium</div>
            </div>
          </div>
          <span
            class="font-mono-premium text-sm font-bold"
            :class="lithiumMultiplier < 1 ? 'text-slate-900' : 'text-slate-300'"
          >
            {{ lithiumMultiplier < 1 ? formatPercent(lithiumMultiplier - 1, 0) : '—' }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center bg-slate-50/80">
          <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest"
            >Total Vehicle Cost Multiplier</span
          >
          <span
            class="font-mono-premium text-sm font-bold"
            :class="totalCostMultiplier < 1 ? 'text-slate-900' : 'text-slate-400'"
          >
            {{ totalCostMultiplier < 1 ? formatPercent(totalCostMultiplier - 1, 0) : '—' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Vehicle Slots -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Vehicle Slots</h3>
      </div>
      <div class="divide-y divide-slate-50 max-h-96 overflow-y-auto scrollbar-premium">
        <div
          v-for="(slot, index) in vehicles.slice(0, output.maxVehicleSlots)"
          :key="index"
          class="px-5 py-4 group hover:bg-slate-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <span class="text-[10px] font-black text-slate-300 w-4">{{ index + 1 }}</span>
            <div v-if="slot.vehicleId !== null" class="flex items-center gap-3 flex-1">
              <div
                class="w-14 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-105 transition-transform overflow-hidden"
              >
                <img
                  :src="iconURL(getVehicleType(slot.vehicleId)?.iconPath ?? '', 128)"
                  class="w-[85%] h-[85%] object-contain"
                  :alt="getVehicleType(slot.vehicleId)?.name"
                />
              </div>
              <div>
                <div class="text-[11px] font-bold text-slate-700 leading-tight">
                  {{ getVehicleType(slot.vehicleId)?.name }}
                </div>
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {{ slot.vehicleId === 11 ? `${slot.trainLength} cars` : '' }}
                </div>
              </div>
            </div>
            <span v-else class="text-[11px] font-bold text-slate-300 italic uppercase tracking-wider flex-1"
              >Slots</span
            >

            <!-- Pricing / Capacity -->
            <div class="text-right">
              <div v-if="slot.vehicleId !== null" class="font-mono-premium text-xs font-bold text-slate-700">
                {{ formatNumber(getVehicleCapacity(index), 1)
                }}<span class="text-[10px] text-slate-400 ml-0.5">/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Multiplier Breakdown -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Multiplier Breakdown</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Universal Calibration</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{
            formatMultiplier(output.universalMultiplier)
          }}</span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hover Efficiency</span>
          <span
            class="font-mono-premium text-sm font-bold text-slate-700"
            :class="output.hoverMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'"
          >
            {{ formatMultiplier(output.hoverMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hyperloop Bandwidth</span>
          <span
            class="font-mono-premium text-sm font-bold text-slate-700"
            :class="output.hyperloopMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'"
          >
            {{ formatMultiplier(output.hyperloopMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-2">
            <img
              :src="iconURL(getColleggtibleIconPath('transportation_lobbyist'), 64)"
              class="w-4 h-4 object-contain opacity-60"
              alt="Transportation Lobbyists"
            />
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Epic Advocacy</span>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatMultiplier(output.epicMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collection Potency</span>
          <span
            class="font-mono-premium text-sm font-bold"
            :class="output.colleggtibleMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'"
          >
            {{ formatMultiplier(output.colleggtibleMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artifact Potency</span>
          <span
            class="font-mono-premium text-sm font-bold"
            :class="output.artifactMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'"
          >
            {{ formatMultiplier(output.artifactMultiplier) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Artifact Breakdown -->
    <div
      v-if="output.artifactBreakdown.length > 0"
      class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm"
    >
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Artifact Breakdown</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div
          v-for="(effect, index) in output.artifactBreakdown"
          :key="index"
          class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold text-slate-700">{{ effect.label }}</span>
            <span
              class="badge-premium py-0 text-[8px]"
              :class="effect.source === 'artifact' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'badge-slate'"
            >
              ({{ effect.source }})
            </span>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ effect.effect }}</span>
        </div>
      </div>
    </div>

    <!-- Research -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Shipping Research</h3>
      </div>
      <div class="divide-y divide-slate-50 max-h-80 overflow-y-auto scrollbar-premium">
        <!-- Capacity Research -->
        <div
          v-for="research in output.researchBreakdown"
          :key="research.researchId"
          class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform"
            >
              <img
                :src="iconURL(getColleggtibleIconPath(research.researchId), 64)"
                class="w-5 h-5 object-contain"
                :alt="research.name"
              />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700 leading-tight">{{ research.name }}</div>
              <div class="flex items-center gap-2">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {{ formatMultiplier(research.multiplier, true) }}
                </div>
                <span v-if="research.hoverOnly" class="badge-premium py-0 text-[7px] bg-slate-100 text-slate-400"
                  >Hover Only</span
                >
                <span
                  v-if="research.hyperloopOnly"
                  class="badge-premium py-0 text-[7px] bg-slate-100 text-slate-400 border-brand-primary/20 text-slate-900"
                  >Hyperloop Only</span
                >
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-mono-premium text-xs font-bold text-slate-700">
              {{ research.level }} <span class="text-slate-300 font-normal">/</span> {{ research.maxLevel }}
            </div>
          </div>
        </div>

        <!-- Hyperloop Coupling -->
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform"
            >
              <img
                :src="iconURL(getColleggtibleIconPath('micro_coupling'), 64)"
                class="w-5 h-5 object-contain"
                alt="Graviton Coupling"
              />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700 leading-tight">Graviton Coupling</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Max {{ maxTrainLength }} cars/train
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-mono-premium text-xs font-bold text-slate-700">
              {{ gravitonCouplingLevel }} <span class="text-slate-300 font-normal">/</span> 5
            </div>
          </div>
        </div>

        <!-- Epic Advocacy -->
        <div
          class="px-5 py-1 bg-slate-50/30 text-[9px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-100"
        >
          Epic Research
        </div>
        <div class="px-5 py-4">
          <div
            class="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md transition-shadow"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner overflow-hidden"
              >
                <img
                  :src="iconURL(getColleggtibleIconPath('transportation_lobbyist'), 64)"
                  class="w-5 h-5 object-contain"
                  alt="Transportation Lobbyists"
                />
              </div>
              <div>
                <div class="text-[11px] font-bold text-slate-700 leading-tight">Transportation Lobbyists</div>
              </div>
            </div>
            <span class="font-mono-premium text-xs font-bold text-slate-700"
              >{{ transportationLobbyistLevel }} <span class="text-slate-300">/</span> 30</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Colleggtibles -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Colleggtibles</h3>
      </div>
      <div class="px-5 py-4 space-y-4">
        <!-- Carbon Fiber -->
        <div class="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm">
              <img
                :src="iconURL(getColleggtibleIconPath('carbon-fiber'), 64)"
                class="w-5 h-5 object-contain"
                alt="Carbon Fiber"
              />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Carbon Fiber</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {{ formatTier(colleggtibleTiers.carbonFiber) }}
              </div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatColleggtibleBonus(carbonFiberMultiplier) }}
          </span>
        </div>
        <!-- Pumpkin -->
        <div class="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm">
              <img
                :src="iconURL(getColleggtibleIconPath('pumpkin'), 64)"
                class="w-5 h-5 object-contain"
                alt="Pumpkin"
              />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Pumpkin</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {{ formatTier(colleggtibleTiers.pumpkin) }}
              </div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatColleggtibleBonus(pumpkinMultiplier) }}
          </span>
        </div>
        <p class="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1">
          Global logistics efficiency from collection achievements
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShippingCapacityOutput, VehicleSlot, TimeUnit } from '@/types';
import { getVehicleType, getVehicleCostMultiplier, type VehicleCostModifiers } from '@/lib/vehicles';
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
  'set-time-unit': [unit: TimeUnit];
}>();

// Computed multipliers for display
const carbonFiberMultiplier = computed(() =>
  getColleggtibleMultiplier('carbon-fiber', props.colleggtibleTiers.carbonFiber)
);
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
    case 'minute':
      return 'min';
    case 'hour':
      return 'hr';
    case 'day':
      return 'day';
  }
});

const convertedCapacity = computed(() => {
  const perSecond = props.output.totalFinalCapacity;
  switch (props.timeUnit) {
    case 'minute':
      return perSecond * 60;
    case 'hour':
      return perSecond * 3600;
    case 'day':
      return perSecond * 86400;
  }
});

const activeVehicleCount = computed(() => {
  return props.vehicles.filter(v => v.vehicleId !== null).length;
});

function getVehicleCapacity(index: number): number {
  const breakdown = props.output.vehicleBreakdown[index];
  return breakdown ? breakdown.finalCapacity : 0;
}
</script>

<template>
  <div class="space-y-4">
    <!-- Time Unit Toggle -->
    <div class="flex justify-end mb-4">
      <div class="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/50 shadow-inner">
        <button
          v-for="unit in timeUnits"
          :key="unit.value"
          class="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-200"
          :class="timeUnit === unit.value
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-400 hover:text-slate-600'"
          @click="timeUnit = unit.value"
        >
          {{ unit.label }}
        </button>
      </div>
    </div>

    <!-- Egg Value -->
    <div class="section-premium overflow-hidden transition-all duration-300" :class="{ 'shadow-lg ring-1 ring-brand-primary/10': expandedSections.eggValue }">
      <div
        class="px-5 py-4 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer transition-colors"
        @click="toggleSection('eggValue')"
      >
        <span class="text-xs font-bold text-slate-700 uppercase tracking-tight">Egg Value</span>
        <div class="flex items-center gap-4">
          <span class="font-mono-premium text-base font-bold text-slate-800">
            {{ formatNumber(eggValueOutput.finalValue, 3) }} <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">gems/egg</span>
          </span>
          <ChevronIcon :expanded="expandedSections.eggValue" />
        </div>
      </div>
      <div v-if="expandedSections.eggValue" class="border-t border-slate-100 p-5 bg-slate-50/30">
        <EggValueContainer />
      </div>
    </div>

    <!-- Hab Capacity -->
    <div class="section-premium overflow-hidden transition-all duration-300" :class="{ 'shadow-lg ring-1 ring-brand-primary/10': expandedSections.habCapacity }">
      <div
        class="px-5 py-4 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer transition-colors"
        @click="toggleSection('habCapacity')"
      >
        <span class="text-xs font-bold text-slate-700 uppercase tracking-tight">Population / Capacity</span>
        <div class="flex items-center gap-4">
          <span class="font-mono-premium text-base font-bold text-slate-800">
            {{ formatNumber(layRateOutput.population, 0) }}
            <span class="text-slate-300 font-normal mx-0.5">/</span>
            {{ formatNumber(habCapacityOutput.totalFinalCapacity, 0) }}
            <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">chickens</span>
          </span>
          <ChevronIcon :expanded="expandedSections.habCapacity" />
        </div>
      </div>
      <div v-if="expandedSections.habCapacity" class="border-t border-slate-100 p-5 bg-slate-50/30">
        <HabCapacityContainer />
      </div>
    </div>

    <!-- IHR -->
    <div class="section-premium overflow-hidden transition-all duration-300" :class="{ 'shadow-lg ring-1 ring-brand-primary/10': expandedSections.ihr }">
      <div
        class="px-5 py-4 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer transition-colors"
        @click="toggleSection('ihr')"
      >
        <span class="text-xs font-bold text-slate-700 uppercase tracking-tight">IHR</span>
        <div class="flex items-center gap-4 text-right">
          <div class="flex flex-col">
            <span class="font-mono-premium text-sm font-bold text-slate-800">
              {{ formatNumber(ihrOutput.onlineRate, 1) }}<span class="text-[10px] text-slate-400 font-black ml-1 uppercase">/min online</span>
            </span>
            <span class="font-mono-premium text-sm font-bold text-slate-800">
              {{ formatNumber(ihrOutput.offlineRate, 1) }}<span class="text-[10px] text-slate-400 font-black ml-1 uppercase">/min offline</span>
            </span>
          </div>
          <ChevronIcon :expanded="expandedSections.ihr" />
        </div>
      </div>
      <div v-if="expandedSections.ihr" class="border-t border-slate-100 p-5 bg-slate-50/30">
        <IHRContainer />
      </div>
    </div>

    <!-- Lay Rate -->
    <div class="section-premium overflow-hidden transition-all duration-300" :class="{ 'shadow-lg ring-1 ring-brand-primary/10': expandedSections.layRate }">
      <div
        class="px-5 py-4 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer transition-colors"
        @click="toggleSection('layRate')"
      >
        <div class="flex flex-col">
          <span class="text-xs font-bold text-slate-700 uppercase tracking-tight">Lay Rate</span>
          <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">At Max Habitat Scale</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="font-mono-premium text-base font-bold text-slate-800">
            {{ formatNumber(convertedLayRate, 3) }}<span class="text-[10px] text-slate-400 font-black uppercase ml-1">/{{ timeUnitLabel }}</span>
          </span>
          <ChevronIcon :expanded="expandedSections.layRate" />
        </div>
      </div>
      <div v-if="expandedSections.layRate" class="border-t border-slate-100 p-5 bg-slate-50/30">
        <LayRateContainer />
      </div>
    </div>

    <!-- Shipping Capacity -->
    <div class="section-premium overflow-hidden transition-all duration-300" :class="{ 'shadow-lg ring-1 ring-brand-primary/10': expandedSections.shippingCapacity }">
      <div
        class="px-5 py-4 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer transition-colors"
        @click="toggleSection('shippingCapacity')"
      >
        <span class="text-xs font-bold text-slate-700 uppercase tracking-tight">Shipping Capacity</span>
        <div class="flex items-center gap-4">
          <span class="font-mono-premium text-base font-bold text-slate-800">
            {{ formatNumber(convertedShipping, 3) }}<span class="text-[10px] text-slate-400 font-black uppercase ml-1">/{{ timeUnitLabel }}</span>
          </span>
          <ChevronIcon :expanded="expandedSections.shippingCapacity" />
        </div>
      </div>
      <div v-if="expandedSections.shippingCapacity" class="border-t border-slate-100 p-5 bg-slate-50/30">
        <ShippingCapacityContainer />
      </div>
    </div>

    <!-- ELR -->
    <div class="section-premium overflow-hidden transition-all duration-300" :class="{ 'shadow-lg ring-1 ring-brand-primary/10': expandedSections.elr }">
      <div
        class="px-5 py-4 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer transition-colors"
        @click="toggleSection('elr')"
      >
        <div class="flex flex-col">
          <span class="text-xs font-bold text-slate-700 uppercase tracking-tight">Effective Lay Rate</span>
          <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">Actual Deliveries</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="font-mono-premium text-base font-bold text-slate-900">
            {{ formatNumber(convertedELR, 3) }}<span class="text-[10px] text-slate-400 font-black uppercase ml-1">/{{ timeUnitLabel }}</span>
          </span>
          <ChevronIcon :expanded="expandedSections.elr" />
        </div>
      </div>
      <div v-if="expandedSections.elr" class="border-t border-slate-100 p-5 bg-slate-50/30">
        <ELRContainer />
      </div>
    </div>

    <!-- Earnings -->
    <div class="section-premium overflow-hidden transition-all duration-300" :class="{ 'shadow-lg ring-1 ring-brand-primary/10': expandedSections.earnings }">
      <div
        class="px-5 py-4 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer transition-colors"
        @click="toggleSection('earnings')"
      >
        <span class="text-xs font-bold text-slate-700 uppercase tracking-tight">Projected Earnings</span>
        <div class="flex items-center gap-4 text-right">
          <div class="flex flex-col">
            <span class="font-mono-premium text-sm font-bold text-slate-800">
              {{ formatNumber(convertedOnlineEarnings, 3) }}<span class="text-[10px] text-slate-400 font-black ml-1 uppercase">/{{ timeUnitLabel }} online</span>
            </span>
            <span class="font-mono-premium text-sm font-bold text-slate-800">
              {{ formatNumber(convertedOfflineEarnings, 3) }}<span class="text-[10px] text-slate-400 font-black ml-1 uppercase">/{{ timeUnitLabel }} offline</span>
            </span>
          </div>
          <ChevronIcon :expanded="expandedSections.earnings" />
        </div>
      </div>
      <div v-if="expandedSections.earnings" class="border-t border-slate-100 p-5 bg-slate-50/30">
        <EarningsContainer />
      </div>
    </div>

    <!-- Silo Time -->
    <div class="section-premium overflow-hidden transition-all duration-300" :class="{ 'shadow-lg ring-1 ring-brand-primary/10': expandedSections.siloTime }">
      <div
        class="px-5 py-4 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer transition-colors"
        @click="toggleSection('siloTime')"
      >
        <span class="text-xs font-bold text-slate-700 uppercase tracking-tight">Silo Capacity</span>
        <div class="flex items-center gap-4">
          <span class="font-mono-premium text-base font-bold text-slate-800">
            {{ siloTimeOutput.formatted }} <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">away time</span>
          </span>
          <ChevronIcon :expanded="expandedSections.siloTime" />
        </div>
      </div>
      <div v-if="expandedSections.siloTime" class="border-t border-slate-100 p-5 bg-slate-50/30">
        <div class="space-y-4 max-w-lg mx-auto">
          <div class="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Silos</span>
            <span class="font-mono-premium font-bold text-slate-700">{{ siloTimeOutput.siloCount }} <span class="text-slate-300 font-normal">/</span> {{ siloTimeOutput.maxSilos }}</span>
          </div>
          
          <div class="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                <img :src="iconURL(getColleggtibleIconPath('silo_capacity'), 64)" class="w-5 h-5 object-contain" alt="Silo Capacity" />
              </div>
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tier Efficiency</span>
            </div>
            <span class="font-mono-premium font-bold text-slate-700">LVL {{ siloTimeOutput.siloCapacityLevel }} <span class="text-slate-300 font-normal">/</span> 20</span>
          </div>

          <div class="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100 font-bold">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Runtime</span>
            <span class="font-mono-premium text-slate-900">{{ siloTimeOutput.formatted }}</span>
          </div>
          
          <p class="text-[10px] text-slate-400 text-center uppercase font-black tracking-widest opacity-60 pt-2">
            Storage limits based on orbital permits
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { formatNumber } from '@/lib/format';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';
import type { TimeUnit } from '@/types';

// Container components for expanded views
import EggValueContainer from '@/components/containers/EggValueContainer.vue';
import HabCapacityContainer from '@/components/containers/HabCapacityContainer.vue';
import IHRContainer from '@/components/containers/IHRContainer.vue';
import LayRateContainer from '@/components/containers/LayRateContainer.vue';
import ShippingCapacityContainer from '@/components/containers/ShippingCapacityContainer.vue';
import ELRContainer from '@/components/containers/ELRContainer.vue';
import EarningsContainer from '@/components/containers/EarningsContainer.vue';

// Composables
import { useEggValue } from '@/composables/useEggValue';
import { useHabCapacity } from '@/composables/useHabCapacity';
import { useInternalHatcheryRate } from '@/composables/useInternalHatcheryRate';
import { useLayRate } from '@/composables/useLayRate';
import { useShippingCapacity } from '@/composables/useShippingCapacity';
import { useEffectiveLayRate } from '@/composables/useEffectiveLayRate';
import { useEarnings } from '@/composables/useEarnings';
import { useSiloTime } from '@/composables/useSiloTime';

// Chevron icon component
const ChevronIcon = {
  props: { expanded: Boolean },
  template: `
    <svg
      class="w-5 h-5 text-gray-400 transition-transform"
      :class="{ 'rotate-180': expanded }"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  `,
};

// Time unit state
const timeUnit = ref<TimeUnit>('hour');

const timeUnits = [
  { value: 'minute' as const, label: '/min' },
  { value: 'hour' as const, label: '/hr' },
  { value: 'day' as const, label: '/day' },
];

const timeUnitLabel = computed(() => {
  switch (timeUnit.value) {
    case 'minute': return 'min';
    case 'hour': return 'hr';
    case 'day': return 'day';
  }
});

const timeMultiplier = computed(() => {
  switch (timeUnit.value) {
    case 'minute': return 60;
    case 'hour': return 3600;
    case 'day': return 86400;
  }
});

// Expanded sections state
const expandedSections = ref({
  eggValue: false,
  habCapacity: false,
  ihr: false,
  layRate: false,
  shippingCapacity: false,
  elr: false,
  earnings: false,
  siloTime: false,
});

function toggleSection(section: keyof typeof expandedSections.value) {
  expandedSections.value[section] = !expandedSections.value[section];
}

// Get computed outputs from composables
const { output: eggValueOutput } = useEggValue();
const { output: habCapacityOutput } = useHabCapacity();
const { output: ihrOutput } = useInternalHatcheryRate();
const { output: layRateOutput } = useLayRate();
const { output: shippingOutput } = useShippingCapacity();
const { output: elrOutput } = useEffectiveLayRate();
const { output: earningsOutput } = useEarnings();
const { output: siloTimeOutput } = useSiloTime();

// Converted rates based on time unit selection
const convertedLayRate = computed(() => layRateOutput.value.totalRatePerSecond * timeMultiplier.value);
const convertedShipping = computed(() => shippingOutput.value.totalFinalCapacity * timeMultiplier.value);
const convertedELR = computed(() => elrOutput.value.effectiveLayRate * timeMultiplier.value);
const convertedOnlineEarnings = computed(() => earningsOutput.value.onlineEarnings * timeMultiplier.value);
const convertedOfflineEarnings = computed(() => earningsOutput.value.offlineEarnings * timeMultiplier.value);
</script>

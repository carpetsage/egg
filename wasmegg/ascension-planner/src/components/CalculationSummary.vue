<template>
  <div class="space-y-2">
    <!-- Time Unit Toggle -->
    <div class="flex justify-end mb-2">
      <div class="flex gap-1 bg-gray-100 rounded p-1">
        <button
          v-for="unit in timeUnits"
          :key="unit.value"
          class="px-2 py-1 text-xs rounded transition-colors"
          :class="timeUnit === unit.value
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'"
          @click="timeUnit = unit.value"
        >
          {{ unit.label }}
        </button>
      </div>
    </div>

    <!-- Egg Value -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
        @click="toggleSection('eggValue')"
      >
        <span class="font-medium text-gray-700">Egg Value</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-lg text-yellow-700">
            {{ formatNumber(eggValueOutput.finalValue, 2) }} gems/egg
          </span>
          <ChevronIcon :expanded="expandedSections.eggValue" />
        </div>
      </div>
      <div v-if="expandedSections.eggValue" class="border-t border-gray-200 p-4 bg-gray-50">
        <EggValueContainer />
      </div>
    </div>

    <!-- Hab Capacity -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
        @click="toggleSection('habCapacity')"
      >
        <span class="font-medium text-gray-700">Hab Capacity</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-lg text-blue-700">
            {{ formatNumber(habCapacityOutput.totalFinalCapacity, 0) }} chickens
          </span>
          <ChevronIcon :expanded="expandedSections.habCapacity" />
        </div>
      </div>
      <div v-if="expandedSections.habCapacity" class="border-t border-gray-200 p-4 bg-gray-50">
        <HabCapacityContainer />
      </div>
    </div>

    <!-- IHR -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
        @click="toggleSection('ihr')"
      >
        <span class="font-medium text-gray-700">IHR</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-lg text-green-700">
            {{ formatNumber(ihrOutput.onlineRate, 0) }}/min online,
            {{ formatNumber(ihrOutput.offlineRate, 0) }}/min offline
          </span>
          <ChevronIcon :expanded="expandedSections.ihr" />
        </div>
      </div>
      <div v-if="expandedSections.ihr" class="border-t border-gray-200 p-4 bg-gray-50">
        <IHRContainer />
      </div>
    </div>

    <!-- Lay Rate -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
        @click="toggleSection('layRate')"
      >
        <span class="font-medium text-gray-700">Lay Rate</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-lg text-yellow-700">
            {{ formatNumber(convertedLayRate, 2) }}/{{ timeUnitLabel }}
            <span class="text-xs text-gray-500">(at max habs)</span>
          </span>
          <ChevronIcon :expanded="expandedSections.layRate" />
        </div>
      </div>
      <div v-if="expandedSections.layRate" class="border-t border-gray-200 p-4 bg-gray-50">
        <LayRateContainer />
      </div>
    </div>

    <!-- Shipping Capacity -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
        @click="toggleSection('shippingCapacity')"
      >
        <span class="font-medium text-gray-700">Shipping Capacity</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-lg text-blue-700">
            {{ formatNumber(convertedShipping, 2) }}/{{ timeUnitLabel }}
          </span>
          <ChevronIcon :expanded="expandedSections.shippingCapacity" />
        </div>
      </div>
      <div v-if="expandedSections.shippingCapacity" class="border-t border-gray-200 p-4 bg-gray-50">
        <ShippingCapacityContainer />
      </div>
    </div>

    <!-- ELR -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
        @click="toggleSection('elr')"
      >
        <span class="font-medium text-gray-700">Effective Lay Rate</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-lg text-emerald-700">
            {{ formatNumber(convertedELR, 2) }}/{{ timeUnitLabel }}
            <span class="text-xs text-gray-500">(at max habs)</span>
          </span>
          <ChevronIcon :expanded="expandedSections.elr" />
        </div>
      </div>
      <div v-if="expandedSections.elr" class="border-t border-gray-200 p-4 bg-gray-50">
        <ELRContainer />
      </div>
    </div>

    <!-- Earnings -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
        @click="toggleSection('earnings')"
      >
        <span class="font-medium text-gray-700">Earnings</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-lg text-amber-700">
            {{ formatNumber(convertedOnlineEarnings, 2) }}/{{ timeUnitLabel }} online,
            {{ formatNumber(convertedOfflineEarnings, 2) }}/{{ timeUnitLabel }} offline
          </span>
          <ChevronIcon :expanded="expandedSections.earnings" />
        </div>
      </div>
      <div v-if="expandedSections.earnings" class="border-t border-gray-200 p-4 bg-gray-50">
        <EarningsContainer />
      </div>
    </div>

    <!-- Silo Time -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
        @click="toggleSection('siloTime')"
      >
        <span class="font-medium text-gray-700">Silo Time</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-lg text-purple-700">
            {{ siloTimeOutput.formatted }} ({{ siloTimeOutput.siloCount }} silos)
          </span>
          <ChevronIcon :expanded="expandedSections.siloTime" />
        </div>
      </div>
      <div v-if="expandedSections.siloTime" class="border-t border-gray-200 p-4 bg-gray-50">
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Silos Owned:</span>
            <span class="font-mono">{{ siloTimeOutput.siloCount }}/{{ siloTimeOutput.maxSilos }}</span>
          </div>
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <img :src="iconURL(getColleggtibleIconPath('silo_capacity'), 64)" class="w-5 h-5 object-contain" alt="Silo Capacity" />
              <span class="text-gray-600">Silo Capacity:</span>
            </div>
            <span class="font-mono">Level {{ siloTimeOutput.siloCapacityLevel }}/20</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Time per Silo:</span>
            <span class="font-mono">{{ siloTimeOutput.minutesPerSilo }} min (60 + {{ siloTimeOutput.siloCapacityLevel * 6 }})</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2">
            <span class="text-gray-600 font-medium">Total Away Time:</span>
            <span class="font-mono font-medium text-purple-700">{{ siloTimeOutput.formatted }}</span>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            Silos store your offline earnings. More silos = longer time before egg production stops while away.
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

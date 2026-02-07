<template>
  <div class="px-4 py-3 bg-pink-50 border-t border-pink-200 flex flex-wrap gap-x-6 gap-y-2 items-center">
    <!-- Title -->
    <div class="text-sm text-pink-800 font-medium">Kindness Summary</div>

    <!-- Vehicle Summary -->
    <div class="flex items-center gap-4 text-xs">
      <div class="flex items-center gap-1.5 text-pink-700">
        <span v-if="isMaxed" class="font-bold">Max Vehicles</span>
        <span v-else class="font-medium">{{ vehicleSummaryText }}</span>
      </div>
      
      <div class="w-px h-3 bg-pink-300"></div>

      <div class="flex items-center gap-1.5 text-pink-700">
        <span class="opacity-80">Shipping Cap:</span>
        <span class="font-bold">{{ formattedShippingCap }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Action, CalculationsSnapshot } from '@/types';
import { calculateMaxVehicleSlots, calculateMaxTrainLength } from '@/calculations/shippingCapacity';
import { getVehicleType } from '@/lib/vehicles';
import { formatNumber } from '@/lib/format';

const props = defineProps<{
  headerAction: Action;
  actions: Action[];
}>();

const finalState = computed<CalculationsSnapshot>(() => {
  if (props.actions.length > 0) {
    return props.actions[props.actions.length - 1].endState;
  }
  return props.headerAction.endState;
});

const isMaxed = computed(() => {
  const { vehicles, researchLevels } = finalState.value;
  const maxSlots = calculateMaxVehicleSlots(researchLevels);
  const maxTrainLength = calculateMaxTrainLength(researchLevels);

  // Check if we have max slots filled
  const activeVehicles = (vehicles || []).slice(0, maxSlots);
  const filledCount = activeVehicles.filter(v => v.vehicleId !== null).length;
  
  if (filledCount < maxSlots) return false;

  // Check if all are hyperloops with max cars
  return activeVehicles.every(v => 
    v.vehicleId === 11 && v.trainLength >= maxTrainLength
  );
});

const vehicleSummaryText = computed(() => {
  const { vehicles, researchLevels } = finalState.value;
  const maxSlots = calculateMaxVehicleSlots(researchLevels);
  // Only consider slots that are available with current research
  const activeVehicles = (vehicles || []).slice(0, maxSlots).filter(v => v.vehicleId !== null);

  if (activeVehicles.length === 0) return 'No vehicles';

  const counts = new Map<string, number>();
  
  for (const v of activeVehicles) {
    const type = getVehicleType(v.vehicleId!);
    if (type) {
      const count = counts.get(type.name) || 0;
      counts.set(type.name, count + 1);
    }
  }

  // Sort by count descending
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  
  return sorted.map(([name, count]) => `${count}x ${name}`).join(', ');
});

const formattedShippingCap = computed(() => {
  return formatNumber(finalState.value.shippingCapacity);
});
</script>

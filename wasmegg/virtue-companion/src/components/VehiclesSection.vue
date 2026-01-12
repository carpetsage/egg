<template>
  <div>
    <h2 class="font-bold text-gray-900 mb-2 text-sm">
      Vehicles <span class="text-gray-500 font-normal">({{ vehicleCount }}/{{ availableSlots }})</span>
    </h2>

    <!-- Inventory -->
    <table class="text-sm w-auto">
      <tbody class="divide-y divide-gray-100">
        <tr v-for="group in groupedVehicles" :key="group.key">
          <td class="py-1 pr-4 text-gray-700">
            {{ group.name }}
            <span v-if="group.trainLength">(Length: {{ group.trainLength }})</span>
          </td>
          <td class="py-1 text-right font-semibold text-gray-900 tabular-nums">
            {{ group.count }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Unfinished Research -->
    <div v-if="unfinishedResearches.length > 0" class="mt-2 pt-2 border-t border-gray-300">
      <p class="text-xs text-gray-600 mb-1">Unfinished vehicle research:</p>
      <table class="tabular-nums text-xs w-auto">
        <tbody>
          <tr v-for="research in unfinishedResearches" :key="research.id">
            <td class="text-blue-500 pr-2">{{ research.level }}/{{ research.maxLevel }}</td>
            <td class="text-gray-700">{{ research.name }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="allResearches.length > 0" class="mt-2 pt-2 border-t border-gray-300">
      <p class="text-xs text-green-600">All vehicle research complete</p>
    </div>

    <!-- Stats -->
    <div class="mt-2 pt-2 border-t border-gray-200">
      <table class="text-sm w-auto">
        <thead>
          <tr class="border-b border-gray-200">
            <th class="text-left py-2 pr-4 font-medium text-gray-500">Metric</th>
            <th class="text-right py-2 px-2 font-medium text-gray-500">Per Minute</th>
            <th class="text-right py-2 px-2 font-medium text-gray-500">Per Hour</th>
            <th class="text-right py-2 px-2 font-medium text-gray-500">Per Day</th>
            <th class="text-right py-2 pl-2 font-medium text-gray-500">Per Week</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr>
            <td class="py-2 pr-4 text-gray-700">Shipping Capacity</td>
            <td class="text-right py-2 px-2 tabular-nums">
              <span class="text-green-600 font-medium">{{ fmtApprox(totalVehicleSpace * 60) }}</span>
            </td>
            <td class="text-right py-2 px-2 tabular-nums">
              <span class="text-green-600 font-medium">{{ fmtApprox(totalVehicleSpace * 60 * 60) }}</span>
            </td>
            <td class="text-right py-2 px-2 tabular-nums">
              <span class="text-green-600 font-medium">{{ fmtApprox(totalVehicleSpace * 60 * 60 * 24) }}</span>
            </td>
            <td class="text-right py-2 pl-2 tabular-nums">
              <span class="text-green-600 font-medium">{{ fmtApprox(totalVehicleSpace * 60 * 60 * 24 * 7) }}</span>
            </td>
          </tr>
          <tr>
            <td class="py-2 pr-4 text-gray-700">Egg Laying Rate</td>
            <td class="text-right py-2 px-2 tabular-nums">
              <span class="text-green-600 font-medium">{{ fmtApprox(eggLayingRate * 60) }}</span>
            </td>
            <td class="text-right py-2 px-2 tabular-nums">
              <span class="text-green-600 font-medium">{{ fmtApprox(eggLayingRate * 60 * 60) }}</span>
            </td>
            <td class="text-right py-2 px-2 tabular-nums">
              <span class="text-green-600 font-medium">{{ fmtApprox(eggLayingRate * 60 * 60 * 24) }}</span>
            </td>
            <td class="text-right py-2 pl-2 tabular-nums">
              <span class="text-green-600 font-medium">{{ fmtApprox(eggLayingRate * 60 * 60 * 24 * 7) }}</span>
            </td>
          </tr>
          <tr class="bg-gray-50">
            <td class="py-2 pr-4 font-semibold text-gray-900">Egg Delivery Rate</td>
            <td class="text-right py-2 px-2 tabular-nums">
              <span class="text-green-600 font-bold">{{ fmtApprox(effectiveELR * 60) }}</span>
            </td>
            <td class="text-right py-2 px-2 tabular-nums">
              <span class="text-green-600 font-bold">{{ fmtApprox(effectiveELR * 60 * 60) }}</span>
            </td>
            <td class="text-right py-2 px-2 tabular-nums">
              <span class="text-green-600 font-bold">{{ fmtApprox(effectiveELR * 60 * 60 * 24) }}</span>
            </td>
            <td class="text-right py-2 pl-2 tabular-nums">
              <span class="text-green-600 font-bold">{{ fmtApprox(effectiveELR * 60 * 60 * 24 * 7) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, toRefs, PropType, computed } from 'vue';
import {
  ei,
  allModifiersFromColleggtibles,
  homeFarmArtifacts,
  farmVehicles,
  farmShippingCapacityResearches,
  farmResearch,
  farmVehicleShippingCapacities,
  farmShippingCapacity,
  farmAvailableVehicleSlots,
  farmEggLayingRate,
  fmtApprox,
  eggIconPath,
  iconURL,
} from '@/lib';

export default defineComponent({
  name: 'VehiclesSection',
  props: {
    backup: { type: Object as PropType<ei.IBackup>, required: true },
  },
  setup(props) {
    const { backup } = toRefs(props);
    const farm = backup.value.farms![0];
    const progress = backup.value.game!;
    const artifacts = homeFarmArtifacts(backup.value, true);
    const modifiers = allModifiersFromColleggtibles(backup.value);

    const egg = farm.eggType!;
    const eggIconURL = iconURL(eggIconPath(egg), 128);

    const vehicles = farmVehicles(farm);
    const researches = farmShippingCapacityResearches(farm, progress);
    const gravitonCoupling = farmResearch(farm, progress, {
      id: 'micro_coupling',
      name: 'Graviton Coupling',
      perLevel: 1,
      maxLevel: 5,
    });
    const vehicleSpaces = farmVehicleShippingCapacities(vehicles, researches, artifacts, modifiers.shippingCap);
    const totalVehicleSpace = farmShippingCapacity(farm, progress, artifacts, modifiers.shippingCap);
    const vehicleCount = vehicles.length;
    const availableSlots = farmAvailableVehicleSlots(farm, progress);
    const eggLayingRate = farmEggLayingRate(farm, progress, artifacts) * modifiers.elr;
    const effectiveELR = Math.min(eggLayingRate, totalVehicleSpace);

    const groupedVehicles = computed(() => {
      const groups = new Map<
        string,
        { key: string; name: string; iconPath: string; count: number; trainLength?: number }
      >();
      for (const vehicle of vehicles) {
        const isHyperloop = vehicle.id === 11;
        const key = isHyperloop ? `${vehicle.name}-${vehicle.trainLength}` : vehicle.name;

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            name: vehicle.name,
            iconPath: vehicle.iconPath,
            count: 0,
            trainLength: isHyperloop ? vehicle.trainLength : undefined,
          });
        }
        groups.get(key)!.count++;
      }
      return Array.from(groups.values());
    });

    const allResearches = computed(() => {
      const combined = [...researches];

      // Insert Graviton Coupling after Dark Containment
      if (gravitonCoupling) {
        const darkContainmentIndex = combined.findIndex(r => r.id === 'dark_containment');
        if (darkContainmentIndex !== -1) {
          combined.splice(darkContainmentIndex + 1, 0, gravitonCoupling);
        } else {
          // If Dark Containment not found, append to end
          combined.push(gravitonCoupling);
        }
      }

      return combined;
    });

    const unfinishedResearches = computed(() => allResearches.value.filter(r => r.level < r.maxLevel));

    return {
      groupedVehicles,
      allResearches,
      unfinishedResearches,
      vehicleSpaces,
      totalVehicleSpace,
      vehicleCount,
      availableSlots,
      eggLayingRate,
      effectiveELR,
      eggIconURL,
      fmtApprox,
    };
  },
});
</script>

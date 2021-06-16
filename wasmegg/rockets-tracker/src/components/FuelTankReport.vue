<template>
  <div v-if="fuelTankEnabled" class="w-max mx-auto px-4 py-2 bg-gray-50 rounded-lg shadow">
    <div class="text-sm text-center">
      Fuel tank usage:
      <span class="text-gray-700 whitespace-nowrap">
        {{ formatEIValue(fuelTankUsage, { trim: true }) }} /
        {{ formatEIValue(fuelTankCapacity, { trim: true }) }}
      </span>
    </div>
    <div v-if="fuels.length > 0" class="flex flex-wrap justify-center mt-1">
      <div
        v-for="fuel in fuels"
        :key="fuel.egg"
        class="flex flex-shrink-0 items-center px-1 my-0.5"
      >
        <img
          v-tippy="{ content: fuel.eggName }"
          class="inline h-4 w-4 align-text-top"
          :src="iconURL(fuel.eggIconPath, 64)"
        />
        <span class="text-xs text-gray-700 tabular-nums">{{ fuel.amountDisplay }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import { ei, formatEIValue, iconURL, MissionFuel } from 'lib';

export default defineComponent({
  props: {
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
  },
  setup(props) {
    const { backup } = toRefs(props);
    const fuelTankEnabled = computed(() => backup.value.artifacts?.tankLevel !== undefined);
    const fuelTankLevel = computed(() => backup.value.artifacts?.tankLevel || 0);
    const fuelTankCapacity = computed(() => {
      switch (fuelTankLevel.value) {
        case 0:
          return 2e9;
        case 1:
          return 200e9;
        case 2:
          return 10e12;
        case 3:
          return 100e12;
        default:
          console.warn(`unknown fuel tank level ${fuelTankLevel.value}`);
          return 100e12;
      }
    });
    const fuels = computed(() => {
      const tankFuels = backup.value.artifacts?.tankFuels || [];
      if (tankFuels.length !== 0 && tankFuels.length !== 19) {
        throw new Error(
          `the impossible happened: ${tankFuels.length} eggs found in tankFuels, expected 19`
        );
      }
      return tankFuels
        .map((amount, index) => new MissionFuel(ei.Egg.EDIBLE + index, amount))
        .filter(fuel => fuel.amount > 0);
    });
    const fuelTankUsage = computed(() =>
      fuels.value.reduce((total, fuel) => total + fuel.amount, 0)
    );
    return {
      fuelTankEnabled,
      fuelTankCapacity,
      fuels,
      fuelTankUsage,
      iconURL,
      formatEIValue,
    };
  },
});
</script>

<template>
  <div class="mx-4 xl:mx-0">
    <div class="flex justify-center my-1">
      <div class="relative flex items-start">
        <div class="flex items-center h-4">
          <input
            id="show-exact-fuel-amounts"
            v-model="showExactFuelAmounts"
            name="show-exact-fuel-amounts"
            type="checkbox"
            class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
          />
        </div>
        <div class="ml-1.5 text-xs">
          <label for="show-exact-fuel-amounts" class="text-gray-600">Show &ldquo;exact&rdquo; amounts</label>
        </div>
      </div>
    </div>

    <div class="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 justify-center">
      <!-- Standard Fuel Tank Card -->
      <div v-if="fuelTankEnabled" class="px-4 py-2 bg-gray-50 rounded-lg shadow">
        <div class="text-sm text-center">
          Fuel tank usage:
          <span class="text-gray-700 whitespace-nowrap">
            {{ formatEIValue(fuelTankUsage, { trim: true }) }} /
            {{ formatEIValue(fuelTankCapacity, { trim: true }) }}
          </span>
        </div>

        <div>
          <template v-if="fuels.length > 0">
            <div v-if="!showExactFuelAmounts" class="flex flex-wrap justify-center mt-1">
              <div v-for="fuel in fuels" :key="fuel.egg" class="flex flex-shrink-0 items-center px-1 my-0.5">
                <img
                  v-tippy="{ content: fuel.eggName }"
                  class="inline h-4 w-4 align-text-top"
                  :src="iconURL(fuel.eggIconPath, 64)"
                />
                <span class="text-xs text-gray-700 tabular-nums">{{ fuel.amountDisplay }}</span>
              </div>
            </div>

            <div v-else class="grid grid-cols-max-3 items-center text-xs text-gray-700 tabular-nums">
              <template v-for="fuel in fuels" :key="fuel.egg">
                <img
                  v-tippy="{ content: fuel.eggName }"
                  class="inline h-4 w-4 align-text-top"
                  :src="iconURL(fuel.eggIconPath, 64)"
                />
                <span class="text-right ml-1">{{ formatEIValue(fuel.amount) }}</span>
                <span class="text-right ml-2"
                  >({{
                    fuel.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })
                  }})</span
                >
              </template>
            </div>
          </template>

          <template v-else>
            <div class="text-center text-xs text-gray-700">No fuel stored in standard tank.</div>
          </template>
        </div>
      </div>

      <!-- Virtue Fuel Tank Card -->
      <div v-if="virtueFuels.length > 0 || fuelTankEnabled" class="px-4 py-2 bg-gray-50 rounded-lg shadow">
        <div class="text-sm text-center">
          Virtue tank usage:
          <span class="text-gray-700 whitespace-nowrap">
            {{ formatEIValue(virtueFuelTankUsage, { trim: true }) }}
          </span>
        </div>

        <div>
          <template v-if="virtueFuels.length > 0">
            <div v-if="!showExactFuelAmounts" class="flex flex-wrap justify-center mt-1">
              <div v-for="fuel in virtueFuels" :key="fuel.egg" class="flex flex-shrink-0 items-center px-1 my-0.5">
                <img
                  v-tippy="{ content: fuel.eggName }"
                  class="inline h-4 w-4 align-text-top"
                  :src="iconURL(fuel.eggIconPath, 64)"
                />
                <span class="text-xs text-gray-700 tabular-nums">{{ fuel.amountDisplay }}</span>
              </div>
            </div>

            <div v-else class="grid grid-cols-max-3 items-center text-xs text-gray-700 tabular-nums">
              <template v-for="fuel in virtueFuels" :key="fuel.egg">
                <img
                  v-tippy="{ content: fuel.eggName }"
                  class="inline h-4 w-4 align-text-top"
                  :src="iconURL(fuel.eggIconPath, 64)"
                />
                <span class="text-right ml-1">{{ formatEIValue(fuel.amount) }}</span>
                <span class="text-right ml-2"
                  >({{
                    fuel.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })
                  }})</span
                >
              </template>
            </div>
          </template>
          <template v-else>
            <div class="text-center text-xs text-gray-700">No fuel stored in virtue tank.</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';

import { ei, formatEIValue, getLocalStorage, iconURL, MissionFuel, setLocalStorage } from 'lib';

const SHOW_EXACT_FUEL_AMOUNTS_LOCALSTORAGE_KEY = 'showExactFuelAmounts';

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
        case 4:
          return 200e12;
        case 5:
          return 300e12;
        case 6:
          return 400e12;
        case 7:
          return 500e12;
        default:
          console.warn(`unknown fuel tank level ${fuelTankLevel.value}`);
          return 500e12;
      }
    });
    const fuels = computed(() => {
      const tankFuels = backup.value.artifacts?.tankFuels || [];
      if (![0, 19, 25].includes(tankFuels.length)) {
        throw new Error(`the impossible happened: ${tankFuels.length} eggs found in tankFuels, expected 19 or 25`);
      }
      return tankFuels
        .map((amount, index) => new MissionFuel(ei.Egg.EDIBLE + index, amount))
        .filter(fuel => fuel.amount > 0);
    });
    const virtueFuels = computed(() => {
      const tankFuels = backup.value.virtue?.afx?.tankFuels || [];
      return tankFuels
        .slice(19)
        .map((amount, index) => new MissionFuel(ei.Egg.EDIBLE + index + 48, amount))
        .filter(fuel => fuel.amount > 0);
    });
    console.log(virtueFuels.value);
    const fuelTankUsage = computed(() => fuels.value.reduce((total, fuel) => total + fuel.amount, 0));
    const virtueFuelTankUsage = computed(() => virtueFuels.value.reduce((total, fuel) => total + fuel.amount, 0));
    const showExactFuelAmounts = ref(getLocalStorage(SHOW_EXACT_FUEL_AMOUNTS_LOCALSTORAGE_KEY) === 'true');
    watch(showExactFuelAmounts, () => {
      setLocalStorage(SHOW_EXACT_FUEL_AMOUNTS_LOCALSTORAGE_KEY, showExactFuelAmounts.value);
    });
    return {
      fuelTankEnabled,
      fuelTankCapacity,
      fuels,
      virtueFuels,
      fuelTankUsage,
      virtueFuelTankUsage,
      showExactFuelAmounts,
      iconURL,
      formatEIValue,
    };
  },
});
</script>

<template>
  <main class="mx-auto px-2 xl:px-8 pb-4" :style="{ maxWidth: '120rem' }">
    <div class="mb-2">
      <div class="grid gap-x-2 gap-y-1" :style="{ gridTemplateColumns: 'repeat(2, max-content)' }">
        <label for="epic_research_ftl" class="flex items-center text-sm whitespace-nowrap">
          <img
            src="https://eggincassets.tcl.sh/64/egginc/r_icon_afx_mission_duration.png"
            class="h-6 w-6 relative -top-px mr-0.5"
          />
          FTL Drive Upgrades
        </label>
        <div class="relative flex items-center w-max">
          <input
            id="epic_research_ftl"
            v-model="config.epicResearchFTLLevel"
            name="epic_research_ftl"
            type="number"
            min="0"
            max="25"
            class="block w-full sm:text-sm rounded-md border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pl-2.5 py-0.5"
            style="width: 4.5rem"
          />
          <div class="absolute inset-y-0 right-0 pr-2.5 sm:text-sm flex items-center">/ 25</div>
        </div>

        <div class="col-span-2 text-xs mb-2">
          Reduces mission time of FTL ships by {{ config.epicResearchFTLLevel }}%.<br />
          Only affects Quintillion Chicken and above.
        </div>

        <label for="epic_research_zerog" class="flex items-center text-sm whitespace-nowrap">
          <img
            src="https://eggincassets.tcl.sh/64/egginc/r_icon_afx_mission_capacity.png"
            class="h-6 w-6 relative -top-px mr-0.5"
          />
          Zero-g Quantum Containment
        </label>
        <div class="relative flex items-center w-max">
          <input
            id="epic_research_zerog"
            v-model="config.epicResearchZerogLevel"
            name="epic_research_zerog"
            type="number"
            min="0"
            max="10"
            class="block w-full sm:text-sm rounded-md border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pl-2.5 py-0.5"
            style="width: 4.5rem"
          />
          <div class="absolute inset-y-0 right-0 pr-2.5 sm:text-sm flex items-center">/ 10</div>
        </div>

        <div class="col-span-2 text-xs">
          Increases mission capacity by {{ 5 * config.epicResearchZerogLevel }}%.
        </div>
      </div>
    </div>

    <div class="text-xs mb-4 space-y-1">
      <p class="text-red-500">
        You can configure the level of each individual ship by clicking on the stars, or the clear
        icon for zero stars.
      </p>
      <p>
        The "Duration", "Capacity", and "Time to Advance" columns are live-updated as you configure
        the epic researches above and individual ship levels.
      </p>
      <p>
        The "Internal Parameters" columns present certain hidden parameters that are intentionally
        left unexplained.
      </p>
    </div>

    <div class="flex flex-col">
      <div class="-my-2 overflow-x-auto xl:-mx-4">
        <div class="py-2 align-middle inline-block min-w-full lg:px-4">
          <div class="shadow overflow-hidden border-b border-gray-200">
            <table class="min-w-full divide-y-3 divide-gray-200 tabular-nums">
              <thead class="bg-gray-50 divide-y">
                <tr class="divide-x">
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    Ship
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    Sensors
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    Level
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    Type
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    Base Duration
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-blue-500">
                    Duration
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    Base Capacity
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    Capacity Bump<br />Per Level
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-blue-500">
                    Capacity
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    Fuels
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    Launches to Advance
                  </th>
                  <th :rowspan="2" class="px-4 py-2 text-center text-xs font-medium text-blue-500">
                    Time to Advance
                  </th>
                  <th :colspan="3" class="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    Internal Parameters
                  </th>
                </tr>
                <tr class="divide-x">
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l">
                    Base Quality
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500">
                    Base Quality Range
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500">
                    Quality Bump<br />Per Level
                  </th>
                </tr>
              </thead>
              <ship-info
                v-for="ship in spaceshipList"
                :key="ship"
                v-model:ship-level="config.shipLevels[ship]"
                :ship-type="ship"
                :config="config"
              />
            </table>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent, Ref, ref, watch } from 'vue';

import {
  spaceshipList,
  perfectShipsConfig,
  ShipsConfig,
  getLocalStorage,
  isShipsConfig,
  setLocalStorage,
} from 'lib';
import ShipInfo from '@/components/ShipInfo.vue';

const CONFIG_LOCALSTORAGE_KEY = 'config';

export default defineComponent({
  components: {
    ShipInfo,
  },
  setup() {
    const config: Ref<ShipsConfig> = ref(
      (() => {
        const persisted = getLocalStorage(CONFIG_LOCALSTORAGE_KEY);
        if (persisted === undefined) {
          return perfectShipsConfig;
        }
        try {
          const obj = JSON.parse(persisted);
          if (isShipsConfig(obj)) {
            return obj;
          }
        } catch (err) {
          // pass
        }
        console.warn(`invalid persisted config: ${persisted}`);
        return perfectShipsConfig;
      })()
    );
    watch(
      config,
      () => {
        setLocalStorage(CONFIG_LOCALSTORAGE_KEY, JSON.stringify(config.value));
      },
      { deep: true }
    );
    return {
      spaceshipList,
      config,
    };
  },
});
</script>

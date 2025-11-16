<template>
  <the-nav-bar active-entry-id="mission-list" width-classes="max-w-main px-4 xl:px-8" />

  <h1 class="mx-4 mt-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">Mission list</h1>

  <main class="max-w-max mx-auto px-4 xl:px-8 pb-4">
    <div class="rounded-md bg-green-100 px-4 py-2 mb-4 shadow">
      <p class="text-sm text-green-800">
        You can track your own missions and artifacts progress (and a lot more) effortlessly with
        <a href="/rockets-tracker/" target="_blank" class="underline">Rockets tracker</a>.
      </p>
    </div>

    <div class="mb-2">
      <div class="grid gap-x-2 gap-y-1" :style="{ gridTemplateColumns: 'repeat(2, max-content)' }">
        <label for="epic_research_ftl" class="flex items-center text-sm whitespace-nowrap">
          <img :src="iconURL('egginc/r_icon_afx_mission_duration.png', 64)" class="h-6 w-6 relative -top-px mr-0.5" />
          FTL Drive Upgrades
        </label>
        <div class="relative flex items-center w-max">
          <input
            id="epic_research_ftl"
            v-model.number="epicResearchFTLLevelInput"
            name="epic_research_ftl"
            type="number"
            min="0"
            max="60"
            class="block w-full sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 pl-2.5 py-0.5"
            :class="epicResearchFTLLevelInputValid ? 'border-gray-300' : 'border-red-500'"
            style="width: 4.5rem"
          />
          <div class="absolute inset-y-0 right-0 pr-2.5 sm:text-sm flex items-center">/ 60</div>
        </div>

        <div class="col-span-2 text-xs mb-2">
          Reduces mission time of FTL ships by {{ config.epicResearchFTLLevel }}%.<br />
          Only affects Quintillion Chicken and above.
        </div>

        <label for="epic_research_zerog" class="flex items-center text-sm whitespace-nowrap">
          <img :src="iconURL('egginc/r_icon_afx_mission_capacity.png', 64)" class="h-6 w-6 relative -top-px mr-0.5" />
          Zero-g Quantum Containment
        </label>
        <div class="relative flex items-center w-max">
          <input
            id="epic_research_zerog"
            v-model.number="epicResearchZerogLevelInput"
            name="epic_research_zerog"
            type="number"
            min="0"
            max="10"
            class="block w-full sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 pl-2.5 py-0.5"
            :class="epicResearchZerogLevelInputValid ? 'border-gray-300' : 'border-red-500'"
            style="width: 4.5rem"
          />
          <div class="absolute inset-y-0 right-0 pr-2.5 sm:text-sm flex items-center">/ 10</div>
        </div>

        <div class="col-span-2 text-xs">Increases mission capacity by {{ 5 * config.epicResearchZerogLevel }}%.</div>
      </div>
    </div>

    <div class="text-xs mb-4 space-y-1">
      <p class="text-red-500">
        Launching missions generate "launch points" (each short mission generates 1, standard 1.4, extended 1.8). Launch
        points accumulate for each ship to unlock levels (stars). The cumulative launch points required for each ship is
        shown in the "Level" column.
      </p>
      <p class="text-red-500">
        You can configure the level of each individual ship by clicking on the stars, or the clear icon for zero stars.
      </p>
      <p>
        The "Duration", "Capacity", and "Time to Advance" columns are live-updated as you configure the epic researches
        above and individual ship levels.
      </p>
      <p>
        The "Internal Parameters" columns present certain hidden parameters that are intentionally left unexplained.
      </p>
    </div>

    <div class="flex flex-col">
      <div class="-my-2 overflow-x-auto lg:-mx-4">
        <div class="py-2 align-middle inline-block min-w-full lg:px-4">
          <div class="shadow overflow-hidden border-b border-gray-200">
            <table class="min-w-full divide-y-3 divide-gray-200 tabular-nums">
              <thead class="bg-gray-50 divide-y">
                <tr class="divide-x">
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Ship</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Sensors</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Level</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Type</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Base Duration</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-blue-500">Duration</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Base Capacity</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Capacity Bump<br />Per Level</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-blue-500">Capacity</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Fuels</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Virtue Fuels</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Launches to Advance</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-blue-500">Time to Advance</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Launches to Next Star</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-blue-500">Time to Next Star</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500">Launches to Max Stars</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-blue-500">Time to Max Stars</th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l">Base Quality</th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500">Base Quality Range</th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500">Quality Bump<br />Per Level</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-blue-500">Quality</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-blue-500">Quality Range</th>
                </tr>
              </thead>
              <ship-info
                v-for="ship in spaceshipList.toReversed()"
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
import { computed, defineComponent, Ref, ref, watch } from 'vue';

import {
  iconURL,
  spaceshipList,
  perfectShipsConfig,
  ShipsConfig,
  getLocalStorage,
  isShipsConfig,
  setLocalStorage,
} from 'lib';
import TheNavBar from 'ui/components/NavBar.vue';
import ShipInfo from '@/components/ShipInfo.vue';

const CONFIG_LOCALSTORAGE_KEY = 'config';

export default defineComponent({
  components: {
    TheNavBar,
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

    const epicResearchFTLLevelInput = ref(config.value.epicResearchFTLLevel);
    const epicResearchZerogLevelInput = ref(config.value.epicResearchZerogLevel);
    const epicResearchFTLLevelInputValid = computed(
      () =>
        Number.isInteger(epicResearchFTLLevelInput.value) &&
        epicResearchFTLLevelInput.value >= 0 &&
        epicResearchFTLLevelInput.value <= 60
    );
    const epicResearchZerogLevelInputValid = computed(
      () =>
        Number.isInteger(epicResearchZerogLevelInput.value) &&
        epicResearchZerogLevelInput.value >= 0 &&
        epicResearchZerogLevelInput.value <= 10
    );
    watch(epicResearchFTLLevelInput, () => {
      if (epicResearchFTLLevelInputValid.value) {
        config.value.epicResearchFTLLevel = epicResearchFTLLevelInput.value;
      }
    });
    watch(epicResearchZerogLevelInput, () => {
      if (epicResearchZerogLevelInputValid.value) {
        config.value.epicResearchZerogLevel = epicResearchZerogLevelInput.value;
      }
    });

    watch(
      config,
      () => {
        setLocalStorage(CONFIG_LOCALSTORAGE_KEY, JSON.stringify(config.value));
      },
      { deep: true }
    );

    return {
      iconURL,
      spaceshipList,
      config,
      epicResearchFTLLevelInput,
      epicResearchZerogLevelInput,
      epicResearchFTLLevelInputValid,
      epicResearchZerogLevelInputValid,
    };
  },
});
</script>

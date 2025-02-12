<template>
  <div>
    <div class="w-max max-w-xs mx-auto px-4 py-2 bg-gray-50 rounded-lg shadow -mt-1 mb-3">
      <div class="grid gap-x-2 gap-y-1 justify-center" :style="{ gridTemplateColumns: 'repeat(2, max-content)' }">
        <div
          v-tippy="{
            content: `Reduces mission time of FTL ships by ${missionStats.config.epicResearchFTLLevel}%. Only affects Quintillion Chicken and above.`,
          }"
          class="flex items-center text-xs whitespace-nowrap"
        >
          <img :src="iconURL('egginc/r_icon_afx_mission_duration.png', 64)" class="h-6 w-6 relative -top-px mr-0.5" />
          FTL Drive Upgrades
        </div>
        <div class="flex items-center text-xs text-green-500 tabular-nums">
          {{ missionStats.config.epicResearchFTLLevel }} / 60
        </div>

        <div
          v-tippy="{
            content: `Increases mission capacity by ${5 * missionStats.config.epicResearchZerogLevel}%.`,
          }"
          class="flex items-center text-xs whitespace-nowrap"
        >
          <img :src="iconURL('egginc/r_icon_afx_mission_capacity.png', 64)" class="h-6 w-6 relative -top-px mr-0.5" />
          Zero-g Quantum Containment
        </div>
        <div class="flex items-center text-xs text-green-500 tabular-nums">
          {{ missionStats.config.epicResearchZerogLevel }} / 10
        </div>
      </div>
      <div
        v-if="missionStats.config.epicResearchFTLLevel < 60 || missionStats.config.epicResearchZerogLevel < 10"
        class="text-xs mt-2"
      >
        You can check costs and plan your epic research upgrades with Stickly Man!#6756's
        <a href="https://royalphysique.net/eggs/" _target="_blank" class="text-blue-500 hover:text-blue-600"
          >calculator</a
        >.
      </div>
    </div>

    <div class="mx-4 mb-1 xl:mx-0 text-xs">
      Check the
      <a href="/mission-list/" target="_blank" class="text-blue-500 hover:text-blue-600"
        >full list of spaceships and mission parameters</a
      >
      for <template v-if="!allShipsUnlocked">ships you haven't seen and</template> bonuses from unlocking more ship
      levels.
    </div>

    <div class="mx-4 mb-2 xl:mx-0 text-xs">Note: A mission is counted in statistics once launched.</div>

    <div
      v-if="lastShipMaxedOut && !congratulationsDismissed"
      class="mx-4 xl:mx-0 rounded-md bg-green-50 shadow px-3 py-3 mt-2 mb-3"
    >
      <div class="flex">
        <p class="text-xs font-medium text-green-800">
          &#x1f389; Woah, congratulations on maxing out {{ finalShip }}! Would you rise up to the
          <a href="https://ei.tcl.sh/tips" target="_blank" class="underline" @click="onrick">next big challenge</a>?
        </p>
        <div class="ml-auto pl-3">
          <div class="-mx-1.5 -my-1.5">
            <button
              type="button"
              class="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
              @click="onCongratulationsDismiss"
            >
              <span class="sr-only">Dismiss</span>
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="missionStats.ships.length > 0" class="flex flex-col">
      <div class="-my-2 overflow-x-auto xl:-mx-4">
        <div class="py-2 align-middle inline-block min-w-full max-w-6xl lg:px-4">
          <div class="shadow overflow-hidden border-b border-gray-200 lg:rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">Ship</th>
                  <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">Level</th>
                  <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">Type</th>
                  <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">Duration</th>
                  <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">Capacity</th>
                  <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">Fuels</th>
                  <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">Launched</th>
                  <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">Launch Points</th>
                  <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">Air Time</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <template v-for="ship in [...missionStats.ships].reverse()" :key="ship.shipType">
                  <tr class="text-gray-500">
                    <td
                      class="relative px-4 py-1.5 border-r whitespace-nowrap text-sm"
                      :rowspan="ship.durations.length + 1"
                    >
                      <div class="absolute top-1/2 left-4 transform -translate-y-1/2 w-12 h-12">
                        <div v-if="ship.fractionalProgressToNextLevel !== null" class="p-1">
                          <progress-ring
                            :radius="20"
                            :stroke-width="2"
                            :filled-fraction="ship.fractionalProgressToNextLevel"
                            class="text-yellow-400"
                          />
                        </div>
                        <img class="absolute inset-0 w-12 h-12" :src="iconURL(ship.shipIconPath, 128)" />
                      </div>
                      <span v-if="allShipsUnlocked || ship.shipType !== lastShip?.shipType" class="pl-14">{{
                        ship.shipName
                      }}</span>
                      <div v-else class="pl-14">
                        <span>{{ ship.shipName }}</span>
                        <br />
                        <template v-if="requiredRemainingLaunchesToUnlockNextShip > 0">
                          <span class="text-xs text-red-500">
                            {{ requiredRemainingLaunchesToUnlockNextShip }} more required to unlock the next ship
                          </span>
                        </template>
                        <template v-else>
                          <span class="text-xs text-green-500">Next ship unlocked</span>
                        </template>
                      </div>
                    </td>
                    <td class="px-4 py-1.5 border-r whitespace-nowrap text-sm" :rowspan="ship.durations.length + 1">
                      <ship-star-levels :ship="ship" />
                    </td>
                    <td class="px-4 py-1.5 bg-green-50 whitespace-nowrap text-center text-sm" :colspan="4"></td>
                    <td class="px-4 py-1.5 bg-green-50 whitespace-nowrap text-center text-sm text-green-500">
                      {{ ship.count }}
                    </td>
                    <td class="px-4 py-1.5 bg-green-50 whitespace-nowrap text-center text-sm text-green-500">
                      {{ formatLaunchPoints(ship.launchPoints) }}
                    </td>
                    <td class="px-4 py-1.5 bg-green-50 whitespace-nowrap text-center text-sm text-green-500">
                      {{ formatDuration(getMissionAirTime(artifactsDB.missionArchive, ship.shipType), true) }}
                    </td>
                  </tr>
                  <template v-for="duration in ship.durations" :key="duration.mission.durationType">
                    <tr class="text-gray-500">
                      <td
                        class="px-4 py-1.5 whitespace-nowrap text-center text-sm"
                        :class="missionDurationTypeFgClass(duration.mission)"
                      >
                        {{ duration.mission.durationTypeName }}
                      </td>
                      <td
                        v-tippy="{
                          content: `base duration: ${duration.mission.defaultDurationDisplay}`,
                        }"
                        class="px-4 py-1.5 whitespace-nowrap text-center text-sm"
                      >
                        {{ duration.mission.boostedDurationDisplay(ship.config) }}
                      </td>
                      <td
                        v-tippy="{
                          content: `base capacity: ${duration.mission.defaultCapacity}`,
                        }"
                        class="px-4 py-1.5 whitespace-nowrap text-center text-sm"
                      >
                        {{ duration.mission.boostedCapacity(ship.config) }}
                      </td>
                      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
                        <div class="flex items-center justify-center w-16 mx-auto">
                          <img
                            v-for="fuel in duration.mission.defaultFuels"
                            :key="fuel.egg"
                            v-tippy="{ content: fuel.amountDisplay }"
                            class="flex-shrink-0 h-4 w-4"
                            :src="iconURL(fuel.eggIconPath, 64)"
                          />
                        </div>
                      </td>
                      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
                        {{ duration.count }}
                      </td>
                      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
                        {{ formatLaunchPoints(duration.launchPoints) }}
                      </td>
                      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
                        {{
                          formatDuration(
                            getMissionAirTime(artifactsDB.missionArchive, ship.shipType, duration.mission.durationType),
                            true
                          )
                        }}
                      </td>
                    </tr>
                  </template>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-sm text-center">No missions found.</div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs } from 'vue';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

import { ei, formatDuration, getLocalStorage, goatcounter, iconURL, setLocalStorage } from 'lib';
import { getMissionAirTime, getMissionStatistics } from '@/lib';
import { formatLaunchPoints, missionDurationTypeFgClass } from '@/utils';
import ProgressRing from '@/components/ProgressRing.vue';
import ShipStarLevels from '@/components/ShipStarLevels.vue';
import { shipMaxLevel, allMissionTypes } from '../../../../lib/missions';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

const CONGRATULATIONS_DISMISSED_LOCALSTORAGE_KEY = 'congratulationsDismissed';

export default defineComponent({
  components: {
    ProgressRing,
    ShipStarLevels,
  },
  props: {
    artifactsDB: {
      type: Object as PropType<ei.IArtifactsDB>,
      required: true,
    },
    progress: {
      type: Object as PropType<ei.Backup.IGame>,
      required: true,
    },
  },
  setup(props) {
    const { artifactsDB, progress } = toRefs(props);
    const missionStats = computed(() => getMissionStatistics(artifactsDB.value, progress.value));
    // last ship in game
    const finalShip = allMissionTypes[allMissionTypes.length - 1].shipName;
    // last ship unlocked by user
    const lastShip = computed(() => {
      const ships = missionStats.value.ships;
      return ships.length > 0 ? ships[ships.length - 1] : null;
    });
    const allShipsUnlocked = computed(
      () => lastShip.value !== null && lastShip.value.shipType === ei.MissionInfo.Spaceship.ATREGGIES
    );
    const requiredRemainingLaunchesToUnlockNextShip = computed(
      () => lastShip.value?.requiredRemainingLaunchesToUnlockNextShip || 0
    );

    const lastShipMaxedOut = computed(
      () =>
        lastShip.value !== null &&
        lastShip.value.shipType >= ei.MissionInfo.Spaceship.ATREGGIES &&
        lastShip.value.currentLevel >= shipMaxLevel(lastShip.value.shipType)
    );
    const congratulationsDismissed = ref(getLocalStorage(CONGRATULATIONS_DISMISSED_LOCALSTORAGE_KEY) !== undefined);
    const onrick = () => {
      congratulationsDismissed.value = true;
      setLocalStorage(CONGRATULATIONS_DISMISSED_LOCALSTORAGE_KEY, Date.now());
      goatcounter?.count({
        path: 'ei.tcl.sh/tips',
        title: 'Rickrolled',
        event: true,
      });
    };
    const onCongratulationsDismiss = () => {
      congratulationsDismissed.value = true;
      setLocalStorage(CONGRATULATIONS_DISMISSED_LOCALSTORAGE_KEY, Date.now());
    };

    return {
      missionStats,
      allShipsUnlocked,
      finalShip,
      lastShip,
      requiredRemainingLaunchesToUnlockNextShip,
      lastShipMaxedOut,
      congratulationsDismissed,
      onrick,
      getMissionAirTime,
      onCongratulationsDismiss,
      missionDurationTypeFgClass,
      iconURL,
      formatDuration,
      formatLaunchPoints,
    };
  },
});
</script>

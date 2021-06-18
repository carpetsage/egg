<template>
  <div>
    <div class="w-max max-w-full mx-auto px-4 py-2 bg-gray-50 rounded-lg shadow -mt-1 mb-3">
      <div class="grid gap-x-2 gap-y-1" :style="{ gridTemplateColumns: 'repeat(2, max-content)' }">
        <div
          v-tippy="{
            content: `Reduces mission time of FTL ships by ${missionStats.config.epicResearchFTLLevel}%. Only affects Quintillion Chicken and above.`,
          }"
          class="flex items-center text-xs whitespace-nowrap"
        >
          <img
            src="https://eggincassets.tcl.sh/64/egginc/r_icon_afx_mission_duration.png"
            class="h-6 w-6 relative -top-px mr-0.5"
          />
          FTL Drive Upgrades
        </div>
        <div class="flex items-center text-xs text-green-500 tabular-nums">
          {{ missionStats.config.epicResearchFTLLevel }} / 25
        </div>

        <div
          v-tippy="{
            content: `Increases mission capacity by ${
              5 * missionStats.config.epicResearchZerogLevel
            }%.`,
          }"
          class="flex items-center text-xs whitespace-nowrap"
        >
          <img
            src="https://eggincassets.tcl.sh/64/egginc/r_icon_afx_mission_capacity.png"
            class="h-6 w-6 relative -top-px mr-0.5"
          />
          Zero-g Quantum Containment
        </div>
        <div class="flex items-center text-xs text-green-500 tabular-nums">
          {{ missionStats.config.epicResearchZerogLevel }} / 10
        </div>
      </div>
    </div>

    <div class="mx-4 mb-1 xl:mx-0 text-xs">
      Check the
      <a href="/mission-list/" target="_blank" class="text-blue-500 hover:text-blue-600"
        >full list of spaceships and mission parameters</a
      >
      for <template v-if="!allShipsUnlocked">ships you haven't seen and</template> bonuses from
      unlocking more ship levels.
    </div>

    <div class="mx-4 mb-2 xl:mx-0 text-xs">
      Note: A mission is counted in statistics once launched.
    </div>

    <div v-if="missionStats.ships.length > 0" class="flex flex-col">
      <div class="-my-2 overflow-x-auto xl:-mx-4">
        <div class="py-2 align-middle inline-block min-w-full lg:px-4">
          <div class="shadow overflow-hidden border-b border-gray-200 lg:rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  Ship
                </th>
                <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  Level
                </th>
                <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  Type
                </th>
                <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  Duration
                </th>
                <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  Capacity
                </th>
                <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  Fuels
                </th>
                <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  Launched
                </th>
                <th scope="col" class="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  Launch Points
                </th>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <template v-for="ship in [...missionStats.ships].reverse()" :key="ship.shipType">
                  <tr class="text-gray-500">
                    <td
                      class="relative px-4 py-1.5 border-r whitespace-nowrap text-sm"
                      :rowspan="ship.durations.length + 1"
                    >
                      <img
                        class="absolute top-1/2 left-4 transform -translate-y-1/2 w-12 h-12"
                        :src="iconURL(ship.shipIconPath, 128)"
                      />
                      <span
                        v-if="allShipsUnlocked || ship.shipType !== lastShip?.shipType"
                        class="pl-14"
                        >{{ ship.shipName }}</span
                      >
                      <div v-else class="pl-14">
                        <span>{{ ship.shipName }}</span>
                        <br />
                        <template v-if="requiredRemainingLaunchesToUnlockNextShip > 0">
                          <span class="text-xs text-red-500">
                            {{ requiredRemainingLaunchesToUnlockNextShip }} more required to unlock
                            the next ship
                          </span>
                        </template>
                        <template v-else>
                          <span class="text-xs text-green-500">Next ship unlocked</span>
                        </template>
                      </div>
                    </td>
                    <td
                      class="px-4 py-1.5 border-r whitespace-nowrap text-sm"
                      :rowspan="ship.durations.length + 1"
                    >
                      <ship-star-levels :ship="ship" />
                    </td>
                    <td
                      class="px-4 py-1.5 bg-green-50 whitespace-nowrap text-center text-sm"
                      :colspan="4"
                    ></td>
                    <td
                      class="px-4 py-1.5 bg-green-50 whitespace-nowrap text-center text-sm text-green-500"
                    >
                      {{ ship.count }}
                    </td>
                    <td
                      class="px-4 py-1.5 bg-green-50 whitespace-nowrap text-center text-sm text-green-500"
                    >
                      {{ formatLaunchPoints(ship.launchPoints) }}
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
import { computed, defineComponent, PropType, toRefs } from 'vue';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

import { ei, formatDuration, iconURL } from 'lib';
import { getMissionStatistics } from '@/lib';
import { formatLaunchPoints, missionDurationTypeFgClass } from '@/utils';
import ShipStarLevels from '@/components/ShipStarLevels.vue';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

export default defineComponent({
  components: {
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
    const lastShip = computed(() => {
      const ships = missionStats.value.ships;
      return ships.length > 0 ? ships[ships.length - 1] : null;
    });
    const allShipsUnlocked = computed(
      () =>
        lastShip.value !== null && lastShip.value.shipType === ei.MissionInfo.Spaceship.HENERPRISE
    );
    const requiredRemainingLaunchesToUnlockNextShip = computed(
      () => lastShip.value?.requiredRemainingLaunchesToUnlockNextShip || 0
    );
    return {
      missionStats,
      allShipsUnlocked,
      lastShip,
      requiredRemainingLaunchesToUnlockNextShip,
      missionDurationTypeFgClass,
      iconURL,
      formatDuration,
      formatLaunchPoints,
    };
  },
});
</script>

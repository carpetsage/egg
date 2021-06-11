<template>
  <div>
    <div v-if="missionStats.ships.length > 0" class="flex flex-col">
      <div class="-my-2 overflow-x-auto xl:-mx-4">
        <div class="py-2 align-middle inline-block min-w-full lg:px-4">
          <div class="shadow overflow-hidden border-b border-gray-200">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <th
                  scope="col"
                  class="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  Ship
                </th>
                <th
                  scope="col"
                  class="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  Type
                </th>
                <th
                  scope="col"
                  class="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  Duration
                </th>
                <th
                  scope="col"
                  class="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  Capacity
                </th>
                <th
                  scope="col"
                  class="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  Fuels
                </th>
                <th
                  scope="col"
                  class="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  Launched
                </th>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <template v-for="ship in [...missionStats.ships].reverse()" :key="ship.shipType">
                  <tr class="text-gray-500">
                    <td
                      class="relative px-6 py-1.5 border-r whitespace-nowrap text-sm"
                      :rowspan="ship.durations.length + 1"
                    >
                      <img
                        class="absolute top-1/2 left-6 transform -translate-y-1/2 w-12 h-12"
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
                          <br />
                          <span class="flex items-center text-xs space-x-0.5">
                            <img
                              :src="
                                iconURL(
                                  permit === 1 ? 'egginc/pro_permit.png' : 'egginc/free_permit.png',
                                  128
                                )
                              "
                              class="h-3 flex-shrink-0"
                            />
                            <span>Least time to next ship:</span>
                            <span class="text-red-500">
                              {{
                                formatDuration(
                                  leastTimeInSecondsUntilTheNextShipCanBeLaunched,
                                  true
                                )
                              }}
                            </span>
                            <base-info
                              v-tippy="{
                                content: `
                                <p>
                                  Earliest time the next ship can be launched:<br>
                                  <span class='text-blue-300'>${earliestTimeTheNextShipCanBeLaunched.format(
                                    'LLL'
                                  )}</span>
                                </p>
                                <p>
                                  This assumes you keep filling your mission ${
                                    permit === 1 ? 'slots' : 'slot'
                                  } with the Short ${ship.shipName} mission without gap.
                                </p>`,
                                allowHTML: true,
                              }"
                            />
                          </span>
                        </template>
                        <template v-else>
                          <span class="text-xs text-green-500">Next ship unlocked</span>
                        </template>
                      </div>
                    </td>
                    <td class="px-6 py-1.5 bg-gray-50 whitespace-nowrap text-center text-sm">
                      Aggregate
                    </td>
                    <td class="px-6 py-1.5 bg-gray-50 whitespace-nowrap text-center text-sm"></td>
                    <td class="px-6 py-1.5 bg-gray-50 whitespace-nowrap text-center text-sm"></td>
                    <td class="px-6 py-1.5 bg-gray-50 whitespace-nowrap text-center text-sm"></td>
                    <td class="px-6 py-1.5 bg-gray-50 whitespace-nowrap text-center text-sm">
                      {{ ship.count }}
                    </td>
                  </tr>
                  <template v-for="duration in ship.durations" :key="duration.mission.durationType">
                    <tr class="text-gray-500">
                      <td class="px-6 py-1.5 whitespace-nowrap text-center text-sm">
                        {{ duration.mission.durationTypeName }}
                      </td>
                      <td class="px-6 py-1.5 whitespace-nowrap text-center text-sm">
                        {{ duration.mission.defaultDurationDisplay }}
                      </td>
                      <td class="px-6 py-1.5 whitespace-nowrap text-center text-sm">
                        {{ duration.mission.defaultCapacity }}
                      </td>
                      <td class="px-6 py-1.5 whitespace-nowrap text-center text-sm">
                        <img
                          v-for="fuel in duration.mission.defaultFuels"
                          :key="fuel.egg"
                          v-tippy="{ content: fuel.amountDisplay }"
                          class="inline h-4 w-4"
                          :src="iconURL(fuel.eggIconPath, 64)"
                        />
                      </td>
                      <td class="px-6 py-1.5 whitespace-nowrap text-center text-sm">
                        {{ duration.count }}
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

    <div v-if="!allShipsUnlocked" class="mx-4 mt-2 xl:mx-0 text-xs">
      A full list of spaceship and mission types can be found
      <a
        href="/mission-list/"
        target="_blank"
        class="text-blue-500 hover:text-blue-600"
        >here</a
      >.
    </div>

    <div class="mx-4 mt-2 xl:mx-0 text-xs">
      Note: A mission is counted in statistics once launched.
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

import BaseInfo from 'ui/components/BaseInfo.vue';
import { ei, formatDuration, iconURL, Mission } from 'lib';
import { getMissionStatistics, PermitLevel } from '@/lib';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

export default defineComponent({
  components: {
    BaseInfo,
  },
  props: {
    artifactsDB: {
      type: Object as PropType<ei.IArtifactsDB>,
      required: true,
    },
    permit: {
      type: Number as PropType<PermitLevel>,
      required: true,
    },
  },
  setup(props) {
    const { artifactsDB, permit } = toRefs(props);
    const activeMissions = computed(() =>
      (artifactsDB.value.missionInfos || []).map(m => new Mission(m))
    );
    const missionStats = computed(() => getMissionStatistics(artifactsDB.value));
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
    const now = dayjs();
    const earliestTimeTheNextShipCanBeLaunched = computed(
      () =>
        lastShip.value?.earliestTimeTheNextShipCanBeLaunched(activeMissions.value, permit.value) ||
        now
    );
    const leastTimeInSecondsUntilTheNextShipCanBeLaunched = computed(() =>
      Math.max(earliestTimeTheNextShipCanBeLaunched.value.diff(now, 'seconds'), 0)
    );
    return {
      activeMissions,
      missionStats,
      allShipsUnlocked,
      lastShip,
      requiredRemainingLaunchesToUnlockNextShip,
      earliestTimeTheNextShipCanBeLaunched,
      leastTimeInSecondsUntilTheNextShipCanBeLaunched,
      iconURL,
      formatDuration,
    };
  },
});
</script>

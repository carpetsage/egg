<template>
  <template v-if="missions.length > 0">
    <div v-if="missions.some(mission => mission.hasReturnedBy(now))" class="lg:text-center text-xs mx-4 xl:mx-0 -mt-2">
      You should press <span class="text-blue-500">"Load Player Data"</span> again to refresh your mission list once you
      have collected your finished missions and sent out new ones.
    </div>
    <ul
      class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 mx-4 xl:mx-0 my-4"
      :class="[missions.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3']"
    >
      <li
        v-for="(mission, index) in missions"
        :key="index"
        class="col-span-1 flex flex-col text-center bg-gray-50 rounded-2xl shadow-lg divide-y divide-gray-200"
      >
        <div class="flex-1 flex flex-col p-6 relative">
          <div class="w-36 h-36 flex-shrink-0 mx-auto relative" :class="missionDurationTypeFgClass(mission)">
            <img
              v-if="mission.type === ei.MissionInfo.MissionType.VIRTUE"
              :src="iconURL('egginc/icon_virtue_gem.png', 64)"
              class="absolute top-4 right-5 w-7 h-7 z-10"
            />
            <img
              class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
              :src="iconURL(mission.shipIconPath, 256)"
            />
            <countdown-timer-progress-ring
              v-if="mission.durationSeconds && mission.returnTimestamp"
              :radius="72"
              :stroke-width="2"
              :duration-seconds="mission.durationSeconds"
              :deadline="mission.returnTimestamp"
            />
            <progress-ring v-else :radius="72" :stroke-width="2" :filled-fraction="0" />
          </div>
          <h3 class="mt-4 text-gray-900 text-sm font-medium">{{ mission.shipName }}</h3>
          <mission-star-levels :mission="mission" class="justify-center my-1" />
          <div class="mt-1 flex-grow flex flex-col">
            <div>
              <span
                class="px-2 py-1 text-white text-xs font-medium rounded-full"
                :class="missionDurationTypeBgClass(mission)"
              >
                {{ mission.durationTypeName }}
              </span>
            </div>
            <div class="mt-1 text-gray-500 text-xs">Capacity: {{ mission.capacity }}</div>
            <div class="mt-1 text-gray-500 text-xs">
              Duration:
              <template v-if="mission.durationSeconds !== null">
                {{ mission.durationDisplay }}
              </template>
              <template v-else> &ndash; </template>
            </div>
            <div class="mt-1 mb-1 text-gray-500 text-xs">Sensor target:</div>
            <div
              class="text-center text-xs text-white rounded-full w-max px-1.5 py-0.5 mx-auto bg-gray-400 font-semibold"
            >
              {{ mission.sensorTarget || 'None' }}
            </div>
            <div class="mt-2 text-gray-700 text-sm font-medium">{{ mission.statusName }}</div>
            <div
              v-if="mission.returnTimestamp !== null"
              v-tippy="{
                content: mission.hasReturnedBy(now)
                  ? 'Mission has returned.'
                  : `Mission is scheduled to return at ${mission.returnTime?.format('LLL')}.`,
              }"
              class="mt-1 text-gray-700 text-sm font-medium tabular-nums"
            >
              <countdown-timer :deadline="mission.returnTimestamp" />
            </div>
            <div v-else-if="mission.statusIsFueling && mission.fuels.length > 0" class="mt-1">
              <img
                v-for="fuel in mission.fuels"
                :key="fuel.egg"
                v-tippy="{
                  content: getFuelDisplay(fuel, mission),
                }"
                class="inline h-4 w-4 align-text-top"
                :src="iconURL(fuel.eggIconPath, 64)"
              />
            </div>
          </div>
        </div>
      </li>
    </ul>

    <mission-notifications :missions="missions" />
  </template>

  <div v-else class="text-center text-sm">No active mission. You should start one!</div>

  <fuel-tank-report :backup="backup" class="mt-3" />
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, PropType, ref, toRefs } from 'vue';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { formatEIValue, MissionFuel } from 'lib';

import { ei, iconURL, Mission } from 'lib';
import { missionDurationTypeFgClass, missionDurationTypeBgClass } from '@/utils';
import CountdownTimer from '@/components/CountdownTimer.vue';
import FuelTankReport from '@/components/FuelTankReport.vue';
import MissionNotifications from '@/components/MissionNotifications.vue';
import MissionStarLevels from '@/components/MissionStarLevels.vue';
import CountdownTimerProgressRing from '@/components/CountdownTimerProgressRing.vue';
import ProgressRing from '@/components/ProgressRing.vue';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);

export default defineComponent({
  components: {
    CountdownTimer,
    FuelTankReport,
    MissionNotifications,
    MissionStarLevels,
    CountdownTimerProgressRing,
    ProgressRing,
  },
  props: {
    activeMissions: {
      type: Array as PropType<ei.IMissionInfo[]>,
      required: true,
    },
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
  },
  setup(props) {
    const { activeMissions } = toRefs(props);
    const missions = computed(() => activeMissions.value.map(m => new Mission(m)));
    const now = ref(dayjs());
    const refreshIntervalId = setInterval(() => {
      now.value = dayjs();
    }, 10000);
    onBeforeUnmount(() => {
      clearInterval(refreshIntervalId);
    });

    const getFuelDisplay = (fuel: MissionFuel, mission: Mission) => {
      const requiredFuel = mission.fuelMap(mission.isVirtue).get(fuel.egg);
      if (requiredFuel !== undefined) {
        return `${fuel.amountDisplay} / ${formatEIValue(requiredFuel, { trim: true })}`;
      }
      return `${fuel.amountDisplay}`;
    };

    return {
      ei,
      missions,
      now,
      missionDurationTypeFgClass,
      missionDurationTypeBgClass,
      iconURL,
      formatEIValue,
      getFuelDisplay,
    };
  },
});
</script>

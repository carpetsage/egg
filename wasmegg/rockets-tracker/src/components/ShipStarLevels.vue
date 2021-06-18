<template>
  <div class="flex items-center space-x-0.5">
    <tippy v-for="i in ship.maxLevel" :key="i" tag="div" class="h-3.5 w-3.5">
      <!-- fa: solid/star and regular/star -->
      <svg viewBox="0 0 576 512" class="h-3.5 w-3.5 text-yellow-400 select-none">
        <path
          v-if="i <= ship.currentLevel"
          fill="currentColor"
          d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"
        />
        <path
          v-else
          fill="currentColor"
          d="M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM388.6 312.3l23.7 138.4L288 385.4l-124.3 65.3 23.7-138.4-100.6-98 139-20.2 62.2-126 62.2 126 139 20.2-100.6 98z"
        />
      </svg>

      <template #content>
        Level {{ i }}, {{ ship.levelLaunchPointThresholds[i] }} points required<template
          v-if="ship.launchPoints < ship.levelLaunchPointThresholds[i]"
          >, {{ formatLaunchPoints(ship.levelLaunchPointThresholds[i] - ship.launchPoints) }} points
          remaining</template
        >
      </template>
    </tippy>
  </div>

  <tippy
    v-if="ship.launchPointsToNextLevel !== null && ship.currentLevel !== ship.maxLevel - 1"
    tag="div"
    class="text-xs mt-1"
  >
    <span class="text-green-500">{{ formatLaunchPoints(ship.launchPointsToNextLevel) }} pts</span>
    till next level

    <template #content>
      <span class="text-green-300">{{ ship.shortMissionsToNextLevel }}</span> short missions,<br />
      <span class="text-green-300">{{ ship.standardMissionsToNextLevel }}</span> standard
      missions,<br />
      or <span class="text-green-300">{{ ship.extendedMissionsToNextLevel }}</span> extended
      missions
    </template>
  </tippy>

  <tippy v-if="ship.launchPointsToMaxLevel !== null" tag="div" class="text-xs">
    <span class="text-green-500">{{ formatLaunchPoints(ship.launchPointsToMaxLevel) }} pts</span>
    till max

    <template #content>
      <span class="text-green-300">{{ ship.shortMissionsToMaxLevel }}</span> short missions,<br />
      <span class="text-green-300">{{ ship.standardMissionsToMaxLevel }}</span> standard
      missions,<br />
      or <span class="text-green-300">{{ ship.extendedMissionsToMaxLevel }}</span> extended missions
    </template>
  </tippy>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Tippy } from 'vue-tippy';

import { ShipStatistics } from '@/lib';
import { formatLaunchPoints } from '@/utils';

export default defineComponent({
  components: {
    Tippy,
  },
  props: {
    ship: {
      type: Object as PropType<ShipStatistics>,
      required: true,
    },
  },
  setup() {
    return {
      formatLaunchPoints,
    };
  },
});
</script>

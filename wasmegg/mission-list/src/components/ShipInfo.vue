<template>
  <tbody class="divide-y divide-gray-200">
    <tr v-for="(mission, index) in missionTypes" :key="mission.durationType" class="text-gray-500 divide-x">
      <td v-if="index === 0" :rowspan="missionTypes.length" class="relative px-4 py-1.5 whitespace-nowrap text-sm">
        <img
          class="absolute top-1/2 left-6 transform -translate-y-1/2 w-16 h-16"
          :src="iconURL(mission.shipIconPath, 128)"
        />
        <span class="pl-20">{{ mission.shipName }}</span>
      </td>
      <td v-if="index === 0" :rowspan="missionTypes.length" class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        {{ sensor }}
      </td>
      <td
        v-if="index === 0"
        :rowspan="missionTypes.length"
        class="px-4 py-1.5 whitespace-nowrap text-center text-sm border-l"
      >
        <star-levels
          :level-thresholds="mission.levelLaunchPointThresholds"
          :level="shipLevel"
          @update:level="$emit('update:shipLevel', $event)"
        />
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm border-l">
        {{ mission.durationTypeName }}
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        {{ mission.defaultDurationDisplay }}
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm text-blue-500">
        {{ mission.boostedDurationDisplay(config) }}
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        {{ mission.defaultCapacity }}
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        {{ mission.params.levelCapacityBump }}
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm text-blue-500">
        {{ mission.boostedCapacity(config) }}
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        <div class="flex items-center justify-center w-44 mx-auto">
          <template v-for="fuel in mission.defaultFuels" :key="fuel.egg">
            <img class="h-4 w-4" :src="iconURL(fuel.eggIconPath, 64)" />
            <span class="mr-1">{{ fuel.amountDisplay }}</span>
          </template>
        </div>
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        <div class="flex items-center justify-center w-44 mx-auto">
          <template v-for="fuel in mission.virtueFuels" :key="fuel.egg">
            <img class="h-4 w-4" :src="iconURL(fuel.eggIconPath, 64)" />
            <span class="mr-1">{{ fuel.amountDisplay }}</span>
          </template>
        </div>
      </td>
      <td v-if="index === 0" :rowspan="missionTypes.length" class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        <template v-if="launchesToUnlockNextShip !== null">
          {{ launchesToUnlockNextShip }}
        </template>
        <template v-else>&ndash;</template>
      </td>
      <td
        v-if="index === 0"
        :rowspan="missionTypes.length"
        class="px-4 py-1.5 whitespace-nowrap text-center text-sm text-blue-500"
      >
        <template v-if="timeToAdvance !== null">{{ formatDuration(timeToAdvance, true) }}</template>
        <template v-else>&ndash;</template>
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        <template v-if="config.shipLevels[mission.shipType] != mission.maxLevel">
          {{ launchesToStar(mission, config.shipLevels[mission.shipType]) }}
        </template>
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm text-blue-500">
        <template v-if="config.shipLevels[mission.shipType] != mission.maxLevel">
          {{ formatDuration(timeToStar(mission, config)) }}
        </template>
        <template v-else>&ndash;</template>
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        <template v-if="config.shipLevels[mission.shipType] != mission.maxLevel">
          {{ launchesToStar(mission, config.shipLevels[mission.shipType], mission.maxLevel) }}
        </template>
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm text-blue-500">
        <template v-if="config.shipLevels[mission.shipType] != mission.maxLevel">
          {{ formatDuration(timeToStar(mission, config, mission.maxLevel)) }}
        </template>
        <template v-else>&ndash;</template>
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        {{ mission.params.quality }}
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        {{ mission.params.minQuality }} &ndash; {{ mission.params.maxQuality }}
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        {{ mission.params.levelQualityBump }}
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm border-l">
        {{ mission.boostedQuality(config) }}
      </td>
      <td class="px-4 py-1.5 whitespace-nowrap text-center text-sm">
        {{ mission.params.minQuality }} &ndash; {{ mission.boostedMaxQuality(config) }}
      </td>
    </tr>
  </tbody>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import { ei, formatDuration, iconURL, MissionType, requiredTotalLaunchesToUnlockNextShip, ShipsConfig } from 'lib';
import StarLevels from '@/components/StarLevels.vue';

import Spaceship = ei.MissionInfo.Spaceship;
import DurationType = ei.MissionInfo.DurationType;

export default defineComponent({
  components: {
    StarLevels,
  },
  props: {
    shipType: {
      type: Number as PropType<Spaceship>,
      required: true,
    },
    shipLevel: {
      type: Number,
      required: true,
    },
    config: {
      type: Object as PropType<ShipsConfig>,
      required: true,
    },
  },
  emits: {
    'update:shipLevel': (_level: number) => {
      return true;
    },
  },
  setup(props) {
    const { shipType, config } = toRefs(props);
    const durationTypes =
      shipType.value === Spaceship.CHICKEN_ONE
        ? [DurationType.TUTORIAL, DurationType.SHORT, DurationType.LONG, DurationType.EPIC]
        : [DurationType.SHORT, DurationType.LONG, DurationType.EPIC];
    const missionTypes = computed(() => durationTypes.map(type => new MissionType(shipType.value, type)));
    const sensor = computed(() => shipSensor(shipType.value));
    const launchesToUnlockNextShip = computed(() => {
      const num = requiredTotalLaunchesToUnlockNextShip(shipType.value);
      return Number.isFinite(num) ? num : null;
    });
    const timeToAdvance = computed(() =>
      launchesToUnlockNextShip.value !== null
        ? new MissionType(shipType.value, DurationType.SHORT).boostedDurationSeconds(config.value) *
          Math.ceil(launchesToUnlockNextShip.value / 3)
        : null
    );
    return {
      missionTypes,
      sensor,
      launchesToUnlockNextShip,
      timeToAdvance,
      iconURL,
      formatDuration,
      launchesToStar,
      timeToStar,
    };
  },
});

function launchesToStar(mission: MissionType, stars: number, target = stars + 1) {
  const points =
    stars < mission.maxLevel
      ? mission.levelLaunchPointThresholds[target] - mission.levelLaunchPointThresholds[stars]
      : 0;
  switch (mission.durationType) {
    case DurationType.TUTORIAL:
    case DurationType.SHORT:
      return points;
    case DurationType.LONG:
      return Math.ceil(points / 1.4);
    case DurationType.EPIC:
      return Math.ceil(points / 1.8);
  }
}
function timeToStar(mission: MissionType, config: ShipsConfig, target = config.shipLevels[mission.shipType] + 1) {
  const launches = launchesToStar(mission, config.shipLevels[mission.shipType], target);
  return mission.boostedDurationSeconds(config) * Math.ceil(launches / 3);
}

function shipSensor(spaceship: Spaceship): string {
  switch (spaceship) {
    case Spaceship.CHICKEN_ONE:
    case Spaceship.CHICKEN_NINE:
      return 'Basic';
    case Spaceship.CHICKEN_HEAVY:
    case Spaceship.BCR:
      return 'Intermediate';
    case Spaceship.MILLENIUM_CHICKEN:
    case Spaceship.CORELLIHEN_CORVETTE:
    case Spaceship.GALEGGTICA:
      return 'Advanced';
    case Spaceship.CHICKFIANT:
    case Spaceship.VOYEGGER:
      return 'Cutting Edge';
    case Spaceship.HENERPRISE:
    case Spaceship.ATREGGIES:
      return 'Next Generation';
    default:
      return 'Unknown';
  }
}
</script>

<template>
  <div class="grid grid-cols-4 gap-2">
    <button
      v-for="ship in ships"
      :key="ship.shipType"
      class="flex flex-col items-center p-2 rounded-lg transition-all"
      :class="
        modelValue === ship.shipType
          ? 'bg-purple-100 border-2 border-purple-500'
          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
      "
      :title="ship.name"
      @click="$emit('update:modelValue', ship.shipType)"
    >
      <img
        :src="getShipIcon(ship.shipType)"
        :alt="ship.name"
        class="w-10 h-10 mb-1"
      />
      <span class="text-xs text-gray-600 text-center truncate w-full">
        {{ ship.shortName }}
      </span>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { getAvailableShipTypes } from '@/lib/missions-virtue';
import { spaceshipIconPath, iconURL, ei } from 'lib';

// Short names for ships to fit in grid
const SHORT_NAMES: Record<number, string> = {
  [ei.MissionInfo.Spaceship.CHICKEN_ONE]: 'C-One',
  [ei.MissionInfo.Spaceship.CHICKEN_NINE]: 'C-Nine',
  [ei.MissionInfo.Spaceship.CHICKEN_HEAVY]: 'Heavy',
  [ei.MissionInfo.Spaceship.BCR]: 'BCR',
  [ei.MissionInfo.Spaceship.MILLENIUM_CHICKEN]: 'Quintill.',
  [ei.MissionInfo.Spaceship.CORELLIHEN_CORVETTE]: 'Corvette',
  [ei.MissionInfo.Spaceship.GALEGGTICA]: 'Galeggtica',
  [ei.MissionInfo.Spaceship.CHICKFIANT]: 'Defihent',
  [ei.MissionInfo.Spaceship.VOYEGGER]: 'Voyegger',
  [ei.MissionInfo.Spaceship.HENERPRISE]: 'Hener.',
  [ei.MissionInfo.Spaceship.ATREGGIES]: 'Atreggies',
};

export default defineComponent({
  props: {
    modelValue: {
      type: Number,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  setup() {
    const ships = getAvailableShipTypes().map(ship => ({
      ...ship,
      shortName: SHORT_NAMES[ship.shipType] || ship.name,
    }));

    const getShipIcon = (shipType: number) => {
      return iconURL(spaceshipIconPath(shipType), 64);
    };

    return {
      ships,
      getShipIcon,
    };
  },
});
</script>

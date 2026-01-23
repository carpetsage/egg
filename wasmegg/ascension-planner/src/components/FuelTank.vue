<template>
  <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-medium text-gray-700">Fuel Tank</h4>
      <span class="text-xs text-gray-500">Available on all eggs</span>
    </div>

    <!-- TODO: Fuel tank capacity and fill UI -->
    <div class="grid grid-cols-5 gap-2">
      <div
        v-for="egg in virtueEggs"
        :key="egg"
        class="text-center"
      >
        <div
          class="w-8 h-8 mx-auto rounded-full flex items-center justify-center text-white text-xs font-bold"
          :class="eggColors[egg]"
        >
          {{ eggAbbrev[egg] }}
        </div>
        <div class="text-xs text-gray-500 mt-1">0</div>
      </div>
    </div>

    <div class="mt-2 text-xs text-gray-400 text-center">
      Fuel tank management coming soon...
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AscensionStep, VirtueEgg } from '@/types';
import { VIRTUE_EGG_ABBREV } from '@/types';

const VIRTUE_EGGS: VirtueEgg[] = ['curiosity', 'integrity', 'kindness', 'humility', 'resilience'];

const EGG_COLORS: Record<VirtueEgg, string> = {
  curiosity: 'bg-blue-500',
  integrity: 'bg-green-500',
  kindness: 'bg-pink-500',
  humility: 'bg-purple-500',
  resilience: 'bg-orange-500',
};

export default defineComponent({
  props: {
    step: {
      type: Object as PropType<AscensionStep>,
      required: true,
    },
  },
  setup() {
    return {
      virtueEggs: VIRTUE_EGGS,
      eggAbbrev: VIRTUE_EGG_ABBREV,
      eggColors: EGG_COLORS,
    };
  },
});
</script>

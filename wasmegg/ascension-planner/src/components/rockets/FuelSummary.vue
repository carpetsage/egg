<template>
  <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-medium text-gray-700">Fuel Tank</h4>
      <span v-if="hasErrors" class="text-xs text-red-500">Insufficient fuel!</span>
    </div>

    <!-- Fuel bars for each virtue egg -->
    <div class="space-y-2">
      <div
        v-for="egg in virtueEggs"
        :key="egg"
        class="flex items-center gap-2"
      >
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          :class="eggColors[egg]"
        >
          {{ eggAbbrev[egg] }}
        </div>

        <div class="flex-1 flex items-center gap-2">
          <!-- Current tank amount -->
          <span class="text-xs text-gray-600 w-16 text-right">{{ formatAmount(tankState[egg]) }}</span>

          <!-- Arrow showing consumption -->
          <span v-if="consumed[egg] > 0" class="text-xs text-gray-400">-{{ formatAmount(consumed[egg]) }}</span>

          <!-- Remaining after launches -->
          <span
            v-if="consumed[egg] > 0"
            class="text-xs font-medium"
            :class="remaining[egg] < 0 ? 'text-red-500' : 'text-green-600'"
          >
            = {{ formatAmount(remaining[egg]) }}
          </span>

          <!-- Humility egg note -->
          <span
            v-if="egg === 'humility'"
            class="text-xs text-purple-500 ml-1"
          >
            (from production)
          </span>
        </div>
      </div>
    </div>

    <!-- Error details -->
    <div v-if="fuelErrors.length > 0" class="mt-2 pt-2 border-t border-gray-200">
      <p class="text-xs text-red-500">
        Fuel shortage at launch #{{ getErrorLaunchIndex() + 1 }}:
        {{ formatErrorMessage() }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue';
import type { ScheduledLaunch, EpicResearchLevels, VirtueEgg } from '@/types';
import { VIRTUE_EGG_ABBREV } from '@/types';
import { computeFuelState, getTotalFuelConsumed } from '@/lib/missions-virtue';
import { formatEIValue } from 'lib';

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
    launches: {
      type: Array as PropType<ScheduledLaunch[]>,
      required: true,
    },
    tankState: {
      type: Object as PropType<Record<VirtueEgg, number>>,
      required: true,
    },
    epicResearch: {
      type: Object as PropType<EpicResearchLevels>,
      required: true,
    },
  },
  setup(props) {
    const consumed = computed(() => getTotalFuelConsumed(props.launches, true));

    const fuelState = computed(() => computeFuelState(props.tankState, props.launches, true));

    const remaining = computed(() => fuelState.value.remaining);

    const fuelErrors = computed(() => fuelState.value.errors);

    const hasErrors = computed(() => fuelErrors.value.length > 0);

    const getErrorLaunchIndex = () => {
      if (fuelErrors.value.length === 0) return -1;
      const errorLaunchId = fuelErrors.value[0].launchId;
      return props.launches.findIndex(l => l.id === errorLaunchId);
    };

    const formatErrorMessage = () => {
      if (fuelErrors.value.length === 0) return '';
      const error = fuelErrors.value[0];
      return `Need ${formatAmount(error.shortfall)} more ${error.egg} eggs`;
    };

    const formatAmount = (amount: number) => {
      return formatEIValue(amount, { trim: true });
    };

    return {
      virtueEggs: VIRTUE_EGGS,
      eggAbbrev: VIRTUE_EGG_ABBREV,
      eggColors: EGG_COLORS,
      consumed,
      remaining,
      fuelErrors,
      hasErrors,
      getErrorLaunchIndex,
      formatErrorMessage,
      formatAmount,
    };
  },
});
</script>

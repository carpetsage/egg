<template>
  <div class="h-8 relative">
    <div
      class="h-3 relative top-2.5 rounded-full overflow-hidden"
      v-tippy="{
        content: `${formatEIValue(eggsLaid)} / ${formatEIValue(leagueStatus.finalTarget, true)}`,
      }"
    >
      <div class="w-full h-full bg-gray-200 absolute"></div>
      <div
        class="h-full bg-green-500 absolute rounded-full"
        :style="{ width: percentage(eggsLaid, leagueStatus.finalTarget) }"
      ></div>
    </div>
    <template v-for="(goal, index) in leagueStatus.goals" :key="index">
      <img
        class="h-8 absolute top-0 transform -translate-x-1/2"
        :style="{ left: percentage(target(goal), leagueStatus.finalTarget) }"
        :src="iconURL(rewardIconPath(goal), 64)"
        v-tippy="{
          content: `${formatEIValue(target(goal), true)}, ${percentage(
            eggsLaid,
            target(goal),
            1
          )} completed`,
        }"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { CoopLeagueStatus, rewardIconPath, formatEIValue, trimTrailingZeros, ei } from '@/lib';
import { iconURL } from '@/utils';

function percentage(x: number, y: number, decimals = 3): string {
  return `${trimTrailingZeros((Math.min(x / y, 1) * 100).toFixed(decimals))}%`;
}

export default defineComponent({
  props: {
    eggsLaid: {
      type: Number,
      required: true,
    },
    leagueStatus: {
      type: Object as PropType<CoopLeagueStatus>,
      required: true,
    },
  },
  setup() {
    return {
      percentage,
      rewardIconPath,
      formatEIValue,
      iconURL,
      // target does a non-null assertion on targetAmount to avoid typing problem in the template.
      target: (goal: ei.Contract.IGoal) => goal.targetAmount!,
    };
  },
});
</script>

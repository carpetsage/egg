<template>
  <div class="h-8 relative">
    <tippy tag="div" class="h-3 relative top-2.5 rounded-full overflow-hidden">
      <div class="w-full h-full bg-gray-200 absolute"></div>
      <div
        class="ProgressBar--striped h-full absolute rounded-full"
        :style="{ width: percentage(projectedEggsLaid, leagueStatus.finalTarget) }"
      ></div>
      <div
        v-if="eggsLaidOfflineAdjusted !== undefined"
        class="h-full bg-green-350 absolute rounded-full"
        :style="{ width: percentage(eggsLaidOfflineAdjusted, leagueStatus.finalTarget) }"
      ></div>
      <div
        class="h-full bg-green-500 absolute rounded-full"
        :style="{ width: percentage(eggsLaid, leagueStatus.finalTarget) }"
      ></div>

      <template #content>
        confirmed: {{ formatEIValue(eggsLaid) }},<br />
        <template
          v-if="eggsLaidOfflineAdjusted && eggsLaidOfflineAdjusted > eggsLaid && eggsLaid < leagueStatus.finalTarget"
        >
          current estimate (offline adjusted): {{ formatEIValue(eggsLaidOfflineAdjusted) }},<br />
        </template>
        <template v-if="projectedEggsLaid > eggsLaid && eggsLaid < leagueStatus.finalTarget">
          projected total: {{ formatEIValue(projectedEggsLaid) }},<br />
        </template>
        final target: {{ formatEIValue(leagueStatus.finalTarget, { trim: true }) }}
      </template>
    </tippy>
    <template v-for="(goal, index) in leagueStatus.goals" :key="index">
      <div>
        <tippy
          tag="div"
          class="h-8 w-8 absolute top-0 transform -translate-x-1/2"
          :style="{ left: percentage(target(goal), leagueStatus.finalTarget) }"
        >
          <base-icon :icon-rel-path="rewardIconPath(goal)" :size="64" class="block h-8 w-8" />
          <template #content>
            <p class="mb-1">
              {{ rewardName(goal) }}
              <base-icon
                :icon-rel-path="rewardIconPath(goal)"
                :size="64"
                class="ml-px inline-block h-4 w-4 align-middle relative -top-px"
              />
              <span class="font-medium">{{ rewardAmountDisplay(goal) }}</span>
            </p>
            {{ formatEIValue(target(goal), { trim: true }) }}, {{ percentage(eggsLaid, target(goal), 1) }} completed
            <template v-if="eggsLaid < target(goal)">
              <br />Expected in:
              <span :class="completionStatusFgColorClass(leagueStatus.completionStatus)">
                {{ formatDuration(leagueStatus.expectedTimeToCompleteGoal(goal)) }}
              </span>
              <br />Offline adjusted:
              <span :class="completionStatusFgColorClass(leagueStatus.completionStatus)">
                {{ formatDuration(leagueStatus.expectedTimeToCompleteGoalOfflineAdjusted(goal)) }}
              </span>
            </template>
          </template>
        </tippy>
        <svg
          v-if="eggsLaid >= target(goal)"
          class="absolute h-3.5 w-3.5 bottom-0 text-green-500 bg-white dark:bg-gray-800 rounded-full"
          :style="{
            left: `calc(${percentage(target(goal), leagueStatus.finalTarget)} + 0.125rem)`,
          }"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Tippy } from 'vue-tippy';

import {
  ContractLeagueStatus,
  ei,
  formatDuration,
  formatEIValue,
  rewardAmountDisplay,
  rewardIconPath,
  rewardName,
  trimTrailingZeros,
} from '@/lib';
import BaseIcon from 'ui/components/BaseIcon.vue';
import { completionStatusFgColorClass } from '@/styles';

function percentage(x: number, y: number, decimals = 3): string {
  return `${trimTrailingZeros((Math.min(x / y, 1) * 100).toFixed(decimals))}%`;
}

export default defineComponent({
  components: {
    Tippy,
    BaseIcon,
  },
  props: {
    eggsLaid: {
      type: Number,
      required: true,
    },
    eggsLaidOfflineAdjusted: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    projectedEggsLaid: {
      type: Number,
      required: true,
    },
    leagueStatus: {
      type: Object as PropType<ContractLeagueStatus>,
      required: true,
    },
  },
  setup() {
    return {
      percentage,
      rewardIconPath,
      rewardName,
      rewardAmountDisplay,
      formatDuration,
      formatEIValue,
      completionStatusFgColorClass,
      // target does a non-null assertion on targetAmount to avoid typing problem in the template.
      target: (goal: ei.Contract.IGoal) => goal.targetAmount!,
    };
  },
});
</script>

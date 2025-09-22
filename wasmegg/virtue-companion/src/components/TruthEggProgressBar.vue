<template>
  <div class="h-8 relative">
    <tippy tag="div" class="h-3 relative top-2.5 rounded-full overflow-hidden">
      <div class="w-full h-full bg-gray-200 absolute"></div>
      <div
        v-if="eggsLaidOfflineAdjusted !== 0"
        class="ProgressBar--striped h-full absolute rounded-full"
        :style="{ width: percentage(eggsLaidOfflineAdjusted, nextTruthEggTargets[0]) }"
      ></div>
      <div
        v-if="eggsLaidOnlineAdjusted !== 0"
        class="h-full bg-green-300 absolute rounded-full"
        :style="{ width: percentage(eggsLaidOnlineAdjusted, nextTruthEggTargets[0]) }"
      ></div>
      <div
        class="h-full bg-green-500 absolute rounded-full"
        :style="{ width: percentage(eggsLaid, nextTruthEggTargets[0]) }"
      ></div>

      <template #content>
        confirmed: {{ formatEIValue(eggsLaid) }},<br />
        <template
          v-if="eggsLaidOnlineAdjusted && eggsLaidOnlineAdjusted > eggsLaid && eggsLaid < nextTruthEggTargets[0]"
        >
          current estimate (using online ihr): {{ formatEIValue(eggsLaidOnlineAdjusted) }},<br />
        </template>
        <template
          v-if="eggsLaidOnlineAdjusted && eggsLaidOnlineAdjusted > eggsLaid && eggsLaid < nextTruthEggTargets[0]"
        >
          current estimate (using offline ihr): {{ formatEIValue(eggsLaidOfflineAdjusted) }},<br />
        </template>
        <template v-if="showSpoilers">
          final target: {{ formatEIValue(nextTruthEggTargets[0], { trim: true }) }}</template
        >
        <template v-else> final target: ???</template>
      </template>
    </tippy>
    <div>
      <tippy
        tag="div"
        class="h-8 w-8 absolute top-0 transform -translate-x-1/2"
        :style="{ left: percentage(eggsLaidOfflineAdjusted, nextTruthEggTargets[0]) }"
      >
        <base-icon :icon-rel-path="eggIconPath(egg)" :size="64" class="block h-8 w-8" />
        <template #content>
          <p class="mb-1">
            {{ eggName(egg) }}
            <base-icon
              :icon-rel-path="eggIconPath(egg)"
              :size="64"
              class="ml-px inline-block h-4 w-4 align-middle relative -top-px"
            />
            <span class="font-medium">{{ fmtApprox(eggsLaidOfflineAdjusted) }}</span>
          </p>
          <template v-if="eggLayingRate > 0 && showSpoilers">
            <br />Expected in:
            <span>
              {{ formatDuration((nextTruthEggTargets[0] - eggsLaid) / eggLayingRate) }}
            </span>
            <br />Offline adjusted:
            <span class="bg-green-350">
              {{ formatDuration((nextTruthEggTargets[0] - eggsLaidOfflineAdjusted) / eggLayingRate) }}
            </span>
          </template>
        </template>
      </tippy>
      <tippy tag="div" class="h-8 w-8 absolute top-0 transform -translate-x-1/2" :style="{ left: '100%' }">
        <base-icon icon-rel-path="egginc/egg_truth.png" :size="64" class="block h-8 w-8" />
        <template #content>
          <p class="mb-1">
            Truth Egg
            <base-icon
              icon-rel-path="egginc/egg_truth.png"
              :size="64"
              class="ml-px inline-block h-4 w-4 align-middle relative -top-px"
            />
            <template v-if="showSpoilers">
              <span class="font-medium">{{ fmtApprox(nextTruthEggTargets[0]) }}</span>
            </template>
            <template v-else>
              <span class="font-medium">???</span>
            </template>
          </p>
          <template v-if="eggLayingRate > 0 && showSpoilers">
            <br />Expected in:
            <span>
              {{ formatDuration((nextTruthEggTargets[0] - eggsLaid) / eggLayingRate) }}
            </span>
            <br />Offline adjusted:
            <span>
              {{ formatDuration((nextTruthEggTargets[0] - eggsLaidOfflineAdjusted) / eggLayingRate) }}
            </span>
          </template>
        </template>
      </tippy>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { Tippy } from 'vue-tippy';

import {
  ei,
  eggName,
  formatDuration,
  formatEIValue,
  fmtApprox,
  rewardAmountDisplay,
  rewardIconPath,
  rewardName,
  trimTrailingZeros,
  eggIconPath,
  nextTruthEggThreshold,
} from '@/lib';
import BaseIcon from 'ui/components/BaseIcon.vue';

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
    eggsLaidOnlineAdjusted: {
      type: Number,
      default: 0,
      required: false,
    },
    eggsLaidOfflineAdjusted: {
      type: Number,
      required: true,
    },
    eggLayingRate: {
      type: Number,
      required: true,
    },

    egg: {
      type: Number as PropType<ei.Egg>,
      required: true,
    },
    showSpoilers: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    const { eggsLaidOfflineAdjusted, eggsLaidOnlineAdjusted } = toRefs(props);
    const nextTruthEggTargets = computed(() => [
      nextTruthEggThreshold(eggsLaidOfflineAdjusted.value),
      nextTruthEggThreshold(eggsLaidOnlineAdjusted.value),
    ]);

    return {
      percentage,
      rewardIconPath,
      rewardName,
      rewardAmountDisplay,
      formatDuration,
      formatEIValue,
      fmtApprox,
      // target does a non-null assertion on targetAmount to avoid typing problem in the template.
      target: (goal: ei.Contract.IGoal) => goal.targetAmount!,
      eggIconPath,
      eggName,
      nextTruthEggTargets,
    };
  },
});
</script>

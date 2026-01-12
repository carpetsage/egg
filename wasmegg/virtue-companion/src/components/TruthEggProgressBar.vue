<template>
  <div class="h-8 relative">
    <tippy tag="div" class="h-3 relative top-2.5 rounded-full overflow-hidden" :theme="'light'" :interactive="true">
      <div class="w-full h-full bg-gray-200 absolute"></div>
      <div
        v-if="eggsLaidOfflineAdjusted !== 0"
        class="ProgressBar--striped h-full absolute rounded-full"
        :style="{ width: computePercentage(eggsLaidOfflineAdjusted) }"
      ></div>
      <div
        v-if="eggsLaidOnlineAdjusted !== 0"
        class="h-full bg-green-300 absolute rounded-full"
        :style="{ width: computePercentage(eggsLaidOnlineAdjusted) }"
      ></div>
      <div class="h-full bg-green-500 absolute rounded-full" :style="{ width: computePercentage(eggsLaid) }"></div>

      <template #content>
        confirmed: {{ formatEIValue(eggsLaid) }},<br />
        <template
          v-if="eggsLaidOnlineAdjusted && eggsLaidOnlineAdjusted > eggsLaid && eggsLaid < nextTruthEggTargets.offline"
        >
          current estimate (using online ihr): {{ formatEIValue(eggsLaidOnlineAdjusted) }},<br />
        </template>
        <template
          v-if="eggsLaidOnlineAdjusted && eggsLaidOnlineAdjusted > eggsLaid && eggsLaid < nextTruthEggTargets.offline"
        >
          current estimate (using offline ihr): {{ formatEIValue(eggsLaidOfflineAdjusted) }},<br />
        </template>
        <template v-if="showSpoilers">
          final target: {{ formatEIValue(nextTruthEggTargets.offline, { trim: true }) }}</template
        >
        <template v-else> final target: ???</template>
      </template>
    </tippy>
    <div>
      <tippy
        tag="div"
        class="h-8 w-8 absolute top-0 transform -translate-x-1/2"
        :style="{ left: computePercentage(eggsLaidOfflineAdjusted) }"
        :theme="'light'"
        :interactive="true"
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
          <template v-if="showThresholdSpoilers && onVirtue">
            <br />Next {{ timeToThresholds.length }} Truth Eggs Expected In:
            <div class="grid grid-cols-[auto_auto_auto_1fr] gap-x-4">
              <div class="font-semibold text-xs">TE</div>
              <div class="font-semibold text-xs">Target</div>
              <div class="font-semibold text-xs">Duration</div>
              <div class="font-semibold text-xs">Target Time</div>
              <template v-for="(timeToTarget, index) in timeToThresholds" :key="index">
                <div class="text-xs">{{ index + 1 + te }}</div>
                <div class="text-xs">{{ fmtApprox(TE_BREAKPOINTS[index + te]) }}</div>
                <div class="text-xs">{{ formatDuration(timeToTarget) }}</div>
                <div class="text-xs font-mono">{{ targetDateTimes[index] }}</div>
              </template>
            </div>
            <div class="text-xs mt-2">Assuming offline IHR</div>
          </template>
        </template>
      </tippy>
      <tippy
        tag="div"
        class="h-8 w-8 absolute top-0 transform -translate-x-1/2"
        :style="{ left: '100%' }"
        :theme="'light'"
        :interactive="true"
      >
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
              <span class="font-medium">{{ fmtApprox(nextTruthEggTargets.offline) }}</span>
            </template>
            <template v-else>
              <span class="font-medium">???</span>
            </template>
          </p>
          <template v-if="showThresholdSpoilers && onVirtue">
            <br />Next {{ timeToThresholds.length }} Truth Eggs Expected In:
            <div class="grid grid-cols-[auto_auto_auto_1fr] gap-x-4">
              <div class="font-semibold text-xs">TE</div>
              <div class="font-semibold text-xs">Target</div>
              <div class="font-semibold text-xs">Duration</div>
              <div class="font-semibold text-xs">Target Time</div>
              <template v-for="(timeToTarget, index) in timeToThresholds" :key="index">
                <div class="text-xs">{{ index + 1 + te }}</div>
                <div class="text-xs">{{ fmtApprox(TE_BREAKPOINTS[index + te]) }}</div>
                <div class="text-xs">{{ formatDuration(timeToTarget) }}</div>
                <div class="text-xs font-mono">{{ targetDateTimes[index] }}</div>
              </template>
            </div>
            <div class="text-xs mt-2">Assuming offline IHR</div>
          </template>
        </template>
      </tippy>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs, watch } from 'vue';
import { Tippy } from 'vue-tippy';
import dayjs from 'dayjs';

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
  projectEggsLaid,
  TE_BREAKPOINTS,
  virtueEggs,
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
    targetTE: {
      type: Number,
      required: true,
    },
    te: {
      type: Number,
      required: true,
    },
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
    backup: {
      type: Object as PropType<ei.IBackup>,
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
    showThresholdSpoilers: {
      type: Boolean,
      default: true,
    },
    showRelativeProgress: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['time-to-target'],
  setup(props, { emit }) {
    const {
      eggsLaidOfflineAdjusted,
      eggsLaidOnlineAdjusted,
      eggLayingRate,
      backup,
      egg,
      te,
      targetTE,
      showRelativeProgress,
    } = toRefs(props);
    const onVirtue = computed(() => virtueEggs.includes(backup.value.farms?.at(0)?.eggType || ei.Egg.UNKNOWN));
    const nextTruthEggTargets = computed(() => ({
      offline: nextTruthEggThreshold(eggsLaidOfflineAdjusted.value),
      online: nextTruthEggThreshold(eggsLaidOnlineAdjusted.value),
    }));

    const rangeStart = computed(() => {
      if (!showRelativeProgress.value) {
        return 0;
      }
      return te.value > 0 ? TE_BREAKPOINTS[te.value - 1] : 0;
    });

    const rangeEnd = computed(() => nextTruthEggTargets.value.offline);

    const computePercentage = (val: number, decimals = 3) => {
      const start = rangeStart.value;
      const end = rangeEnd.value;
      // If end <= start (shouldn't happen unless error or maxed), return 100% or 0%
      if (end <= start) return val >= end ? '100%' : '0%';
      const ratio = (val - start) / (end - start);
      return `${trimTrailingZeros((Math.min(Math.max(ratio, 0), 1) * 100).toFixed(decimals))}%`;
    };

    const timeToThresholds = computed(() => {
      const times = [];
      let currentThreshold = nextTruthEggThreshold(eggsLaidOfflineAdjusted.value);
      const numThresholds = targetTE.value - te.value < 5 ? 5 : targetTE.value - te.value;

      for (let i = 0; i < numThresholds; i++) {
        times.push(projectEggsLaid(backup.value, currentThreshold, eggLayingRate.value != 0, egg.value));
        currentThreshold = nextTruthEggThreshold(currentThreshold);
      }

      return times;
    });

    const time = computed(() => timeToThresholds.value[0]);

    const targetDateTimes = computed(() =>
      timeToThresholds.value.map(timeToTarget => dayjs().add(timeToTarget, 'seconds').format('YYYY-MM-DD HH:mm:ss'))
    );

    // Watch for time to target update and emit
    const updateTimeToTarget = () => {
      let time = 0;
      if (te.value < targetTE.value) {
        // timeToThresholds indices: 0 -> te + 1
        // We want level = targetTE
        // index = targetTE - te - 1
        const index = targetTE.value - te.value - 1;
        if (index >= 0 && index < timeToThresholds.value.length) {
          time = timeToThresholds.value[index];
        }
      }
      emit('time-to-target', { egg: egg.value, time });
    };

    watch(timeToThresholds, updateTimeToTarget, { immediate: true });

    return {
      percentage,
      computePercentage,
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
      onVirtue,
      time,
      timeToThresholds,
      nextTruthEggTargets,
      targetDateTimes,
      TE_BREAKPOINTS,
    };
  },
});
</script>

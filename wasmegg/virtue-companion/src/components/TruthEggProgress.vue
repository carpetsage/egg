<template>
  <div>
    <div class="flex items-center space-x-2 mb-4">
      <label class="text-sm font-medium">Target TE:</label>
      <input
        :value="targetTE"
        type="number"
        min="1"
        max="98"
        class="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
        @input="$emit('update:targetTE', parseFloat(($event.target as HTMLInputElement).value))"
      />

      <div class="flex items-center ml-4">
        <input
          id="show-relative-progress"
          v-model="showRelativeProgress"
          type="checkbox"
          class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
        />
        <label for="show-relative-progress" class="ml-2 text-sm text-gray-600">Relative progress</label>
        <span
          v-tippy="{
            content:
              'When enabled, the progress bar shows the percentage of eggs delivered between the previous Truth Egg threshold and the next one. When disabled, it shows the percentage of the total required eggs starting from zero.',
          }"
          class="inline-flex items-center px-1 py-1 mt-0.5 cursor-help text-gray-400 hover:text-gray-600"
        >
          <base-info height="5" width="5" class="inline relative -top-px" />
          <span class="ml-1 text-xs">What is this?</span>
        </span>
      </div>
    </div>
    <template v-if="virtueEggs.includes(egg)">
      <!-- Current Virtue Egg -->
      <div class="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg mb-2">
        <img :src="iconURL(eggIconPath(egg), 64)" class="h-6 w-6" />
        <div class="flex-1">
          <div class="font-medium">{{ eggName(egg) }} ({{ virtuePurpose(egg) }})</div>
          <div class="text-sm text-gray-600">
            <div>
              {{ truthEggs[egg - 50] }}
              <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" />
              earned
            </div>
            <div>
              <template v-if="truthEggsPendingAdjusted.offline > truthEggsPendingAdjusted.online">
                {{ truthEggsPendingAdjusted.online }} -
              </template>
              {{ truthEggsPendingAdjusted.offline }}
              <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" /> pending
            </div>
            <div class="mr-5">
              <truth-egg-progress-bar
                :target-t-e="targetTE"
                :te="truthEggs[egg - 50] + truthEggsPendingAdjusted.offline"
                :eggs-laid="activeEOVDelivered"
                :eggs-laid-offline-adjusted="activeEOVDeliveredAdjusted.offline"
                :eggs-laid-online-adjusted="activeEOVDeliveredAdjusted.online"
                :egg-laying-rate="currentELR"
                :egg="egg"
                :backup="backup"
                :show-spoilers="shouldShowThreshold(eovDelivered[egg - 50])"
                :show-threshold-spoilers="showThresholdSpoilers"
                :show-relative-progress="showRelativeProgress"
                :discovered-thresholds="discoveredThresholds"
                @time-to-target="handleTimeUpdate"
              />
            </div>
            <div>
              {{ fmtApprox(activeEOVDeliveredAdjusted.online) }}
              <template v-if="activeEOVDeliveredAdjusted.offline > 1.01 * activeEOVDeliveredAdjusted.online">
                - {{ fmtApprox(activeEOVDeliveredAdjusted.offline) }}
              </template>
              <template v-if="shouldShowThreshold(activeEOVDeliveredAdjusted.offline)">
                /
                {{ fmtApprox(nextTruthEggThreshold(activeEOVDeliveredAdjusted.offline)) }}
              </template>
              <template v-else> delivered</template>
            </div>
          </div>
        </div>
      </div>
    </template>
    <!-- Other Virtue Eggs -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
      <div
        v-for="vegg in virtueEggs.filter((_, i) => i + 50 !== egg)"
        :key="vegg"
        class="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg"
      >
        <img :src="iconURL(eggIconPath(vegg), 64)" class="h-6 w-6" />
        <div class="flex-1">
          <div class="font-medium">{{ eggName(vegg) }} ({{ virtuePurpose(vegg) }})</div>
          <div class="text-sm text-gray-600">
            <div>
              {{ truthEggs[vegg - 50] }}
              <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" />
              earned
            </div>
            <div>
              {{ truthEggsPending[vegg - 50] }}
              <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" /> pending
            </div>
            <div class="mr-5">
              <truth-egg-progress-bar
                :target-t-e="targetTE"
                :te="truthEggs[vegg - 50] + truthEggsPending[vegg - 50]"
                :eggs-laid="eovDelivered[vegg - 50]"
                :eggs-laid-offline-adjusted="eovDelivered[vegg - 50]"
                :egg-laying-rate="0"
                :backup="backup"
                :egg="vegg"
                :show-spoilers="shouldShowThreshold(eovDelivered[vegg - 50])"
                :show-threshold-spoilers="showThresholdSpoilers"
                :show-relative-progress="showRelativeProgress"
                :discovered-thresholds="discoveredThresholds"
                @time-to-target="handleTimeUpdate"
              />
            </div>
            <div v-if="shouldShowThreshold(eovDelivered[vegg - 50])">
              {{ fmtApprox(eovDelivered[vegg - 50]) }} /
              {{ fmtApprox(nextTruthEggThreshold(eovDelivered[vegg - 50])) }}
            </div>
            <div v-else>{{ fmtApprox(eovDelivered[vegg - 50]) }} delivered</div>
          </div>
        </div>
      </div>
    </div>
    <!-- Total Truth Eggs -->
    <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
      <img :src="iconURL('egginc/egg_truth.png', 64)" class="h-6 w-6" />
      <div class="flex-1">
        <div class="font-medium">Total Truth Eggs</div>
        <div class="text-sm text-gray-600">
          <div>
            {{ totalTruthEggs }}
            <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" />
            earned
          </div>
          <div>
            {{ totalTruthEggsPending }}
            <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" /> pending
          </div>
          <div>{{ fmtApprox(currentTotalDelivered) }} Virtue Eggs delivered</div>
          <div class="mt-2">
            <div
              v-tippy="{
                content:
                  totalTime <= 0 || !onVirtue
                    ? undefined
                    : showThresholdSpoilers ||
                        targetTE <= Math.max(...truthEggs.map((earned, i) => earned + truthEggsPending[i]))
                      ? `<div class='text-xs space-y-1 text-left'>
                        <div>Remaining eggs needed: <span class='text-blue-300'>${fmtApprox(totalEggsToTarget)}</span></div>
                        <div>Estimated time: <span class='text-blue-300'>${formatDuration(totalTime)}</span></div>
                        <div>Expected completion: <span class='text-blue-300'>${totalTargetDate}</span></div>
                      </div>`
                      : `<div class='text-xs space-y-1 text-left'>
                        <div>Remaining eggs needed: <span class='text-blue-300'>???</span></div>
                        <div>Estimated time: <span class='text-blue-300'>???</span></div>
                        <div>Expected completion: <span class='text-blue-300'>???</span></div>
                      </div>`,
                allowHTML: true,
              }"
              class="h-3 relative rounded-full overflow-hidden bg-gray-200"
            >
              <div
                class="h-full bg-green-500 absolute rounded-full transition-all duration-300"
                :style="{ width: `${totalPercentage}%` }"
              ></div>
            </div>
            <div class="text-xs text-center mt-1 text-gray-500">
              <template
                v-if="
                  showThresholdSpoilers ||
                  targetTE <= Math.max(...truthEggs.map((earned, i) => earned + truthEggsPending[i]))
                "
              >
                {{ fmtApprox(totalProgress) }} / {{ fmtApprox(totalGoal) }} ({{ totalPercentage.toFixed(2) }}%) towards
                {{ targetTE }} <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-3 w-3" /> on all virtue
                eggs
              </template>
              <template v-else>
                {{ fmtApprox(currentTotalDelivered) }} eggs delivered towards {{ targetTE }}
                <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-3 w-3" /> on all virtue eggs
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref, watch, toRefs, reactive } from 'vue';
import {
  ei,
  iconURL,
  eggIconPath,
  eggName,
  virtuePurpose,
  fmtApprox,
  nextTruthEggThreshold,
  virtueEggs,
  TE_BREAKPOINTS,
  getLocalStorage,
  setLocalStorage,
  formatDuration,
} from '@/lib';
import TruthEggProgressBar from '@/components/TruthEggProgressBar.vue';
import BaseInfo from 'ui/components/BaseInfo.vue';
import dayjs from 'dayjs';

export default defineComponent({
  name: 'TruthEggProgress',
  components: { TruthEggProgressBar, BaseInfo },
  props: {
    targetTE: { type: Number, required: true },
    showThresholdSpoilers: { type: Boolean, required: true },
    egg: { type: Number, required: true },
    backup: { type: Object as PropType<ei.IBackup>, required: true },
    truthEggs: { type: Array as PropType<number[]>, required: true },
    truthEggsPendingAdjusted: { type: Object as PropType<{ offline: number; online: number }>, required: true },
    activeEOVDelivered: { type: Number, required: true },
    activeEOVDeliveredAdjusted: { type: Object as PropType<{ offline: number; online: number }>, required: true },
    currentELR: { type: Number, required: true },
    eovDelivered: { type: Array as PropType<number[]>, required: true },
    truthEggsPending: { type: Array as PropType<number[]>, required: true },
    totalTruthEggs: { type: Number, required: true },
    totalTruthEggsPending: { type: Number, required: true },
    totaleovDelivered: { type: Number, required: true },
    discoveredThresholds: { type: Array as PropType<number[]>, required: true },
  },
  emits: ['update:targetTE'],
  setup(props) {
    const {
      backup,
      targetTE,
      showThresholdSpoilers,
      egg,
      activeEOVDeliveredAdjusted,
      eovDelivered,
      discoveredThresholds,
    } = toRefs(props);

    const RELATIVE_PROGRESS_KEY = 'showRelativeProgress';
    const showRelativeProgress = ref(getLocalStorage(RELATIVE_PROGRESS_KEY) !== 'false');

    watch(showRelativeProgress, () => {
      setLocalStorage(RELATIVE_PROGRESS_KEY, showRelativeProgress.value.toString());
    });

    const onVirtue = computed(() => virtueEggs.includes(backup.value.farms?.at(0)?.eggType || ei.Egg.UNKNOWN));
    const shouldShowThreshold = (currentDelivered: number) => {
      const threshold = nextTruthEggThreshold(currentDelivered);
      return showThresholdSpoilers.value || discoveredThresholds.value.includes(threshold);
    };

    const targetThreshold = computed(() => {
      return TE_BREAKPOINTS[targetTE.value - 1] || Infinity;
    });

    const totalProgress = computed(() => {
      const threshold = targetThreshold.value;
      if (!isFinite(threshold)) {
        return 0;
      }

      let sum = 0;
      for (let i = 0; i < 5; i++) {
        let amount = eovDelivered.value[i];
        if (egg.value >= 50 && i === egg.value - 50) {
          amount = activeEOVDeliveredAdjusted.value.offline;
        }
        sum += Math.min(amount, threshold);
      }
      return sum;
    });

    const totalGoal = computed(() => {
      const threshold = targetThreshold.value;
      return isFinite(threshold) ? threshold * 5 : 0;
    });

    const totalPercentage = computed(() => {
      if (totalGoal.value === 0) {
        return 0;
      }
      return Math.min(100, (totalProgress.value / totalGoal.value) * 100);
    });

    const currentTotalDelivered = computed(() => {
      let sum = 0;
      for (let i = 0; i < 5; i++) {
        let amount = eovDelivered.value[i];
        if (egg.value >= 50 && i === egg.value - 50) {
          amount = activeEOVDeliveredAdjusted.value.offline;
        }
        sum += amount;
      }
      return sum;
    });

    const timeEstimates = reactive(new Map<number, number>());
    const handleTimeUpdate = ({ egg, time }: { egg: number; time: number }) => {
      timeEstimates.set(egg, time);
    };

    const totalTime = computed(() => {
      let sum = 0;
      for (const t of timeEstimates.values()) {
        sum += t;
      }
      // If any of the expected eggs are missing from map, we might be incomplete?
      // But map fills up as components mount.
      // Assuming 5 virtue eggs.
      return sum;
    });

    const totalTargetDate = computed(() => {
      const SECONDS_IN_100_YEARS = 100 * 365.25 * 24 * 60 * 60;
      if (totalTime.value > SECONDS_IN_100_YEARS) {
        const currentYear = dayjs().year();
        return `after ${currentYear + 100}`;
      }
      return dayjs().add(totalTime.value, 'seconds').format('YYYY-MM-DD HH:mm:ss');
    });

    const totalEggsToTarget = computed(() => {
      const threshold = targetThreshold.value;
      if (!isFinite(threshold)) {
        return 0;
      }
      let sum = 0;
      for (let i = 0; i < 5; i++) {
        let amount = eovDelivered.value[i];
        if (egg.value >= 50 && i === egg.value - 50) {
          amount = activeEOVDeliveredAdjusted.value.offline;
        }
        // Eggs needed = MAX(0, threshold - delivered)
        sum += Math.max(0, threshold - amount);
      }
      return sum;
    });

    return {
      iconURL,
      eggIconPath,
      eggName,
      virtuePurpose,
      fmtApprox,
      nextTruthEggThreshold,
      virtueEggs,
      shouldShowThreshold,
      totalProgress,
      totalGoal,
      totalPercentage,
      currentTotalDelivered,
      showRelativeProgress,
      handleTimeUpdate,
      totalTime,
      totalTargetDate,
      totalEggsToTarget,
      formatDuration,
      onVirtue,
    };
  },
});
</script>

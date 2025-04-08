<template>
  <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 space-y-4">
    <h3>{{ latestSeasonProgress.seasonName }} Season Progress</h3>
    <div class="h-8 relative">
      <tippy tag="div" class="h-6 relative top-1 rounded-full overflow-hidden">
        <div class="w-full h-full bg-gray-200 absolute"></div>
        <div
          class="ProgressBar--striped h-full absolute rounded-full"
          :style="{ width: percentage(projection, finalTarget) }"
        ></div>
        <div
          class="h-full bg-green-500 absolute rounded-full"
          :style="{ width: percentage(latestSeasonProgress.totalCxp, finalTarget) }"
        ></div>
        <template #content>
          confirmed: {{ formatEIValue(latestSeasonProgress.totalCxp) }},<br />
          <template v-if="projection > latestSeasonProgress.totalCxp && latestSeasonProgress.totalCxp < finalTarget">
            projected total: {{ formatEIValue(projection) }},<br />
          </template>
          final target: {{ formatEIValue(finalTarget, { trim: true }) }}
        </template>
      </tippy>
      <template v-for="(goal, index) in latestSeasonProgress.goals" :key="index">
        <div>
          <tippy
            tag="div"
            class="h-8 w-8 absolute top-0 transform -translate-x-1/2"
            :style="{ left: percentage(target(goal), finalTarget) }"
          >
            <base-icon :icon-rel-path="rewardIconPath(goal)" :size="64" class="block h-10 w-10 relative bottom-1" />
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
              {{ formatEIValue(target(goal), { trim: true }) }},
              {{ percentage(latestSeasonProgress.totalCxp, target(goal), 1) }} completed
            </template>
          </tippy>
          <svg
            v-if="latestSeasonProgress.totalCxp >= target(goal)"
            class="absolute h-3.5 w-3.5 bottom-0 text-green-500 bg-white dark:bg-gray-800 rounded-full"
            :style="{
              left: `calc(${percentage(target(goal), finalTarget)} + 0.125rem)`,
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
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, provide, Ref, ref, toRefs, watch } from 'vue';
import { Tippy } from 'vue-tippy';

import {
  ei,
  formatDuration,
  formatEIValue,
  getUserContractsArchive,
  rewardAmountDisplay,
  rewardIconPath,
  rewardName,
  trimTrailingZeros,
} from '@/lib';
import BaseIcon from 'ui/components/BaseIcon.vue';
import { completionStatusFgColorClass } from '@/styles';
import { getContractSeasonProgress } from 'lib/contract_seasons';
import { refreshCallbackKey } from '@/symbols';

function percentage(x: number, y: number, decimals = 3): string {
  return `${trimTrailingZeros((Math.min(x / y, 1) * 100).toFixed(decimals))}%`;
}

export default defineComponent({
  components: {
    Tippy,
    BaseIcon,
  },
  props: {
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
    // Supply a refreshKey to force a refresh.
    refreshKey: {
      type: Number,
      default: 0,
    },
  },
  setup(props) {
    const { backup, refreshKey } = toRefs(props);
    const contracts: Ref<ei.IContractsArchive | undefined> = ref(undefined);
    const loading = ref(true);
    const error: Ref<Error | undefined> = ref(undefined);

    const refreshContractsArchive = async () => {
      loading.value = true;
      error.value = undefined;

      try {
        contracts.value = await getUserContractsArchive(backup.value.eiUserId!);
      } catch (err) {
        error.value = err instanceof Error ? err : new Error(`${err}`);
      }
      loading.value = false;
    };
    refreshContractsArchive();
    provide(refreshCallbackKey, () => {
      refreshContractsArchive();
    });
    watch(refreshKey, () => {
      refreshContractsArchive();
    });

    const latestSeasonProgress = computed(() => getContractSeasonProgress(backup.value, 'latest', contracts.value));
    const finalTarget = computed(
      () => latestSeasonProgress.value.goals.at(latestSeasonProgress.value?.goals.length - 1)?.cxp ?? 0
    );
    // Get average score per contract this season and multiply by 13 (number of contracts per season) to get estimate
    // Find average score of contracts they've completed * number of non expired contracts left this season
    const projection = computed(() => {
      const averageCS =
        latestSeasonProgress.value.contractsCompleted > 0
          ? latestSeasonProgress.value.totalCxp / latestSeasonProgress.value.contractsCompleted
          : 0;
      return averageCS * (13 - latestSeasonProgress.value.contractsExpired);
    });
    return {
      percentage,
      rewardIconPath,
      rewardName,
      rewardAmountDisplay,
      formatDuration,
      formatEIValue,
      completionStatusFgColorClass,
      target: (goal: ei.IContractSeasonGoal) => goal.cxp ?? 0,
      projection,
      latestSeasonProgress,
      finalTarget,
    };
  },
});
</script>

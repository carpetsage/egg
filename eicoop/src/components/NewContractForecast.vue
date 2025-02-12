<template>
  <div
    v-if="nextOriginalProphecyEggContractPredictedTime"
    class="my-4 bg-white dark:bg-gray-800 shadow overflow-hidden"
  >
    <div class="px-4 sm:px-6 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 text-sm font-medium">
      Next original
      <base-icon
        icon-rel-path="egginc/egg_of_prophecy.png"
        :size="64"
        class="inline-block align-middle h-4 w-4 relative -top-px"
      />
      contract forecast
    </div>
    <div class="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3">
      <p class="text-gray-900 dark:text-gray-100 text-sm">
        Around
        <span class="text-purple-500">{{ nextOriginalProphecyEggContractPredictedTime.format('LLL') }}</span>
        <template v-if="relativeTimeToNextOriginalProphecyEggContract"
          >&nbsp;({{ relativeTimeToNextOriginalProphecyEggContract }})</template
        >
      </p>
      <p class="text-gray-500 dark:text-gray-400 text-xs">
        New prophecy egg contracts appear on the first Monday of every month.
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, ref } from 'vue';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(isoWeek);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(utc);

import BaseIcon from 'ui/components/BaseIcon.vue';
import useContractsStore from '@/stores/contracts';

const PROPHECY_EGG_CONTRACT_INTERVAL_MONTHS = 1;

export default defineComponent({
  components: {
    BaseIcon,
  },
  setup() {
    const contractsStore = useContractsStore();
    const latestOriginalProphecyEggContract = computed(
      () => contractsStore.list.latestOriginalProphecyEggContract || null
    );
    const nextOriginalProphecyEggContractPredictedTime = computed(() => {
      if (!latestOriginalProphecyEggContract.value) {
        return null;
      }
      const latestOfferingTime = dayjs(latestOriginalProphecyEggContract.value?.offeringTime * 1000).tz(
        'America/Los_Angeles'
      );
      const nextOfferingTimeInit = latestOfferingTime.add(PROPHECY_EGG_CONTRACT_INTERVAL_MONTHS, 'months');
      const nextOfferingTime =
        nextOfferingTimeInit.day() > nextOfferingTimeInit.date()
          ? nextOfferingTimeInit.day(8)
          : nextOfferingTimeInit.day(1);
      // Original contracts appear on Mondays, around 8am.
      // https://discord.com/channels/455380663013736479/455385744274620416/856408733013245954
      // https://media.discordapp.net/attachments/455385744274620416/856411451375222814/unknown.png
      const predictedOfferingTime = nextOfferingTime;
      return predictedOfferingTime.local();
    });
    const now = ref(dayjs());
    const refreshIntervalId = setInterval(() => {
      now.value = dayjs();
    }, 30000);
    onBeforeUnmount(() => {
      clearInterval(refreshIntervalId);
    });
    const relativeTimeToNextOriginalProphecyEggContract = computed(() => {
      if (!nextOriginalProphecyEggContractPredictedTime.value) {
        return null;
      }
      const hoursLeft = nextOriginalProphecyEggContractPredictedTime.value.diff(now.value, 'hours', true);
      if (hoursLeft >= 24) {
        return '';
      }
      if (hoursLeft >= 1) {
        return now.value.to(nextOriginalProphecyEggContractPredictedTime.value);
      }
      if (hoursLeft > 0) {
        return 'very soon';
      }
      if (hoursLeft > -1) {
        return 'any minute now';
      }
      return 'overdue';
    });
    return {
      nextOriginalProphecyEggContractPredictedTime,
      relativeTimeToNextOriginalProphecyEggContract,
    };
  },
});
</script>

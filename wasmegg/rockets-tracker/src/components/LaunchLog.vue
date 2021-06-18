<template>
  <div class="mx-4 xl:mx-0">
    <div class="w-full max-w-xs mx-auto my-2">
      <select
        v-model="launchLogFilter"
        class="mt-1 block w-full pl-3 pr-10 py-1 text-sm bg-gray-50 border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
      >
        <option value="3d">Limit to 3 days</option>
        <option value="7d">Limit to 7 days</option>
        <option value="30d">Limit to 30 days</option>
        <option value="none">Show all</option>
      </select>
    </div>
    <div>
      <template v-for="date in filteredLaunchLog" :key="date.date">
        <div class="my-2 text-sm font-medium text-gray-900">{{ date.dateDisplay }}</div>
        <div class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="mission in date.missions" :key="mission.id" class="text-xs tabular-nums">
            <span
              v-tippy="{ content: 'Copy mission ID to clipboard' }"
              class="mr-2 cursor-pointer"
              @click="copyTextToClipboard(mission.id)"
            >
              {{ mission.launchTimeDisplay }}
            </span>
            <span class="mr-1">{{ mission.shipName }}</span>
            <span :class="missionDurationTypeFgClass(mission)">{{ mission.durationTypeName }}</span>
            <span v-if="mission.level > 0" class="inline-flex items-center text-gray-700">
              <span>&nbsp;({{ mission.level }}</span>
              <svg
                viewBox="0 0 576 512"
                class="h-3 w-3 pb-px text-yellow-400 select-none"
              >
                <path
                  fill="currentColor"
                  d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"
                />
              </svg>
              <span>)</span>
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';
import copyTextToClipboard from 'copy-text-to-clipboard';

import { ei, getLocalStorage, setLocalStorage } from 'lib';
import { getLaunchLog } from '@/lib';
import { missionDurationTypeFgClass } from '@/utils';

const LAUNCH_LOG_FILTER_LOCALSTORAGE_KEY = 'launchLogFilter';

export default defineComponent({
  props: {
    artifactsDB: {
      type: Object as PropType<ei.IArtifactsDB>,
      required: true,
    },
  },
  setup(props) {
    const { artifactsDB } = toRefs(props);
    const launchLog = computed(() => getLaunchLog(artifactsDB.value));

    const launchLogFilter = ref(getLocalStorage(LAUNCH_LOG_FILTER_LOCALSTORAGE_KEY) || '7d');
    watch(launchLogFilter, () => {
      setLocalStorage(LAUNCH_LOG_FILTER_LOCALSTORAGE_KEY, launchLogFilter.value);
    });

    const filteredLaunchLog = computed(() => {
      let lastNDays: number | undefined;
      switch (launchLogFilter.value) {
        case '3d':
          lastNDays = 3;
          break;
        case '7d':
          lastNDays = 7;
          break;
        case '30d':
          lastNDays = 30;
          break;
      }
      return launchLog.value.filtered(lastNDays);
    });

    return {
      launchLogFilter,
      filteredLaunchLog,
      missionDurationTypeFgClass,
      copyTextToClipboard,
    };
  },
});
</script>

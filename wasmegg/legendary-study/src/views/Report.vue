<template>
  <div class="my-3">
    <report-selector id="selected-report" v-model="selectedTimestamp" label="Select report:" />
    <report-selector
      id="compared-report"
      v-model="comparedTimestamp"
      label="Compare to:"
      :optional="true"
      class="mt-1"
    />
    <button
      type="button"
      class="flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-0 focus:ring-offset-0 my-2 disabled:opacity-50 disabled:hover:bg-blue-100 disabled:cursor-default"
      :disabled="selectedTimestamp === latestReportTimestamp"
      @click="goToLatestReport"
    >
      Go to latest report
    </button>
  </div>
  <suspense>
    <template #default>
      <single-report :key="selectedTimestamp" :timestamp="selectedTimestamp" />
    </template>
    <template #fallback>
      <base-loading />
    </template>
  </suspense>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, Ref, ref, toRefs, watch } from 'vue';
import { useRouter } from 'vue-router';

import { latestReportTimestamp } from '@/reports';
import BaseLoading from '@/components/BaseLoading.vue';
import ReportSelector from '@/components/ReportSelector.vue';
import SingleReport from '@/components/SingleReport.vue';

export default defineComponent({
  components: {
    BaseLoading,
    ReportSelector,
    SingleReport,
  },
  props: {
    // Show the latest report if timestamp is undefined.
    timestamp: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const router = useRouter();
    const { timestamp } = toRefs(props);
    const parsedTimestamp = computed(() =>
      timestamp.value !== undefined ? parseInt(timestamp.value) : latestReportTimestamp
    );
    const selectedTimestamp = ref(parsedTimestamp.value);
    watch(timestamp, () => {
      selectedTimestamp.value = parsedTimestamp.value;
    });
    const comparedTimestamp: Ref<number | undefined> = ref(undefined);
    const goToLatestReport = () => {
      router.push({ name: 'home' });
    };
    watch([selectedTimestamp, comparedTimestamp], () => {
      if (comparedTimestamp.value !== undefined) {
        router.push({
          name: 'diff',
          params: {
            timestamp1: comparedTimestamp.value,
            timestamp2: selectedTimestamp.value,
          },
        });
      } else if (selectedTimestamp.value !== parsedTimestamp.value) {
        router.push({
          name: 'report',
          params: {
            timestamp: selectedTimestamp.value,
          },
        });
      }
    });
    return {
      selectedTimestamp,
      comparedTimestamp,
      latestReportTimestamp,
      goToLatestReport,
    };
  },
});
</script>

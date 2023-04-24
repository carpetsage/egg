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
      @click="goBackToSingleReport"
    >
      Back to report page
    </button>
  </div>
  <suspense v-if="comparedTimestamp !== undefined">
    <template #default>
      <diff-report
        :key="`${comparedTimestamp}:${selectedTimestamp}`"
        :timestamp1="comparedTimestamp"
        :timestamp2="selectedTimestamp"
      />
    </template>
    <template #fallback>
      <base-loading />
    </template>
  </suspense>
</template>

<script lang="ts">
import { defineComponent, PropType, Ref, ref, toRefs, watch } from 'vue';
import { useRouter } from 'vue-router';

import BaseLoading from '@/components/BaseLoading.vue';
import DiffReport from '@/components/DiffReport.vue';
import ReportSelector from '@/components/ReportSelector.vue';

export default defineComponent({
  components: {
    BaseLoading,
    DiffReport,
    ReportSelector,
  },
  props: {
    // Show the latest report if timestamp is undefined.
    timestamp1: {
      type: String as PropType<string>,
      required: true,
    },
    timestamp2: {
      type: String as PropType<string>,
      required: true,
    },
  },
  setup(props) {
    const router = useRouter();
    const { timestamp1, timestamp2 } = toRefs(props);
    const selectedTimestamp = ref(parseInt(timestamp2.value));
    const comparedTimestamp: Ref<number | undefined> = ref(parseInt(timestamp1.value));
    const goBackToSingleReport = () => {
      comparedTimestamp.value = undefined;
    };
    watch([selectedTimestamp, comparedTimestamp], () => {
      router.push(
        comparedTimestamp.value !== undefined
          ? {
              name: 'diff',
              params: {
                timestamp1: comparedTimestamp.value,
                timestamp2: selectedTimestamp.value,
              },
            }
          : {
              name: 'report',
              params: {
                timestamp: selectedTimestamp.value,
              },
            }
      );
    });
    return {
      selectedTimestamp,
      comparedTimestamp,
      goBackToSingleReport,
    };
  },
});
</script>

<template>
  <div class="my-3">
    <report-selector id="selected-report" v-model="selectedDate" label="Select report:" />
    <report-selector
      id="compared-report"
      v-model="comparedDate"
      label="Compare to:"
      :optional="true"
      class="mt-1"
    />
    <button
      type="button"
      class="flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-0 focus:ring-offset-0 my-2 disabled:opacity-50 disabled:hover:bg-blue-100 disabled:cursor-default"
      :disabled="selectedDate === latestReportDate"
      @click="goToLatestReport"
    >
      Go to latest report
    </button>
  </div>
  <suspense>
    <template #default>
      <single-report :key="selectedDate" :date="selectedDate" />
    </template>
    <template #fallback>
      <base-loading />
    </template>
  </suspense>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, Ref, ref, toRefs, watch } from 'vue';
import { useRouter } from 'vue-router';

import { latestReportDate } from '@/reports';
import BaseLoading from 'ui/components/BaseLoading.vue';
import ReportSelector from '@/components/ReportSelector.vue';
import SingleReport from '@/components/SingleReport.vue';

export default defineComponent({
  components: {
    BaseLoading,
    ReportSelector,
    SingleReport,
  },
  props: {
    // Show the latest report if date is undefined.
    date: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const router = useRouter();
    const { date } = toRefs(props);
    const parsedDate = computed(() =>
      date.value !== undefined ? date.value : latestReportDate 
    );
    const selectedDate = ref(parsedDate.value);
    watch(date, () => {
      selectedDate.value = parsedDate.value;
    });
    const comparedDate: Ref<string | undefined> = ref(undefined);
    const goToLatestReport = () => {
      router.push({ name: 'home' });
    };
    watch([selectedDate, comparedDate], () => {
      if (comparedDate.value !== undefined) {
        router.push({
          name: 'diff',
          params: {
            date1: comparedDate.value,
            date2: selectedDate.value,
          },
        });
      } else if (selectedDate.value !== parsedDate.value) {
        router.push({
          name: 'report',
          params: {
            date: selectedDate.value,
          },
        });
      }
    });
    return {
      selectedDate,
      comparedDate,
      latestReportDate,
      goToLatestReport,
    };
  },
});
</script>

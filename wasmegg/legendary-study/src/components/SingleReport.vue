<template>
  <pre v-if="error" class="text-xs text-red-500 whitespace-pre-wrap">{{ error.toString() }}</pre>
  <template v-else>
    <pre class="text-xs bg-gray-50 p-4 rounded shadow overflow-x-scroll">{{ report }}</pre>
  </template>
</template>

<script lang="ts">
import { fetchReport } from '@/reports';
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    timestamp: {
      type: Number,
      required: true,
    },
  },
  /* eslint-disable vue/no-setup-props-destructure */
  async setup({ timestamp }) {
    let report = '';
    let error: Error | undefined;
    try {
      report = await fetchReport(timestamp);
    } catch (e:any) {
      console.error(e);
      error = e;
    }
    return {
      report,
      error,
    };
  },
});
</script>

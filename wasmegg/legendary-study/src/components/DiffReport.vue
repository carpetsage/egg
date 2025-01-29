<!-- eslint-disable vue/no-v-html -->
<template>
  <pre v-if="error" class="text-xs text-red-500 whitespace-pre-wrap">{{ error.toString() }}</pre>
  <div v-else-if="date1 !== date2" class="relative">
    <div v-html="diffHtml"></div>
    <div class="absolute top-2 left-4 flex items-start">
      <div class="flex items-center h-5">
        <input
          id="side-by-side"
          v-model="sideBySide"
          name="side-by-side"
          type="checkbox"
          class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-offset-0 focus:ring-0"
        />
      </div>
      <div class="ml-2 text-sm select-none">
        <label for="side-by-side">side-by-side diff</label>
      </div>
    </div>
  </div>
  <div v-else class="text-sm">Choose a different report to compare.</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue';
import { createTwoFilesPatch } from 'diff';
import * as Diff2Html from 'diff2html';

import 'diff2html/bundles/css/diff2html.min.css';

import { fetchReport } from '@/reports';
import { getLocalStorage, setLocalStorage } from '@/utils';

const DIFF_SIDE_BY_SIDE_LOCALSTORAGE_KEY = 'diffSideBySide';

export default defineComponent({
  props: {
    date1: {
      type: String,
      required: true,
    },
    date2: {
      type: String,
      required: true,
    },
  },
  /* eslint-disable vue/no-setup-props-destructure */
  async setup({ date1, date2 }) {
    // Default to side-by-side on desktop; line-by-line otherwise.
    const sideBySide = ref(window.innerWidth >= 1024);
    switch (getLocalStorage(DIFF_SIDE_BY_SIDE_LOCALSTORAGE_KEY)) {
      case 'true':
        sideBySide.value = true;
        break;
      case 'false':
        sideBySide.value = false;
        break;
    }
    watch(sideBySide, () => {
      setLocalStorage(DIFF_SIDE_BY_SIDE_LOCALSTORAGE_KEY, sideBySide.value);
    });

    let report1 = '';
    let report2 = '';
    let error: Error | undefined;
    try {
      report1 = await fetchReport(date1);
      report2 = await fetchReport(date2);
    } catch (e:any) {
      console.error(e);
      error = e;
    }
    const diff =
      error || date1 === date2
        ? ''
        : createTwoFilesPatch('report.txt', 'report.txt', report1, report2, undefined, undefined, {
            context: 9999,
          });

    const diffHtml = computed(() =>
      error || date1 === date2
        ? ''
        : Diff2Html.html(diff, {
            drawFileList: false,
            matching: 'lines',
            outputFormat: sideBySide.value ? 'side-by-side' : 'line-by-line',
          })
    );

    return {
      sideBySide,
      diffHtml,
      error,
    };
  },
});
</script>

<style lang="postcss" scoped>
::v-deep(.d2h-file-name-wrapper) {
  @apply hidden;
}

::v-deep(.d2h-diff-table) {
  @apply font-mono text-xs;
}

::v-deep(ins, del) {
  @apply align-baseline;
}
</style>

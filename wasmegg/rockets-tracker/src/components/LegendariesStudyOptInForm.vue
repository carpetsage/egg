<template>
    <div v-if="!preferenceOnFile" class="rounded-md bg-green-50 px-4 sm:px-6 py-4">
      <h3 class="text-sm font-medium text-green-800">Anonymous study on legendary artifacts</h3>
      <div class="mt-2 text-sm text-green-700">
        <p>
          An anonymous study is under way to understand how many legendary artifacts players tend to
          possess at this point, and the relative frequency of different legendaries.
        </p>
        <p v-if="!showDetails" class="mt-2 underline cursor-pointer" @click="showDetails = true">
          Click here to learn more
        </p>
        <p v-else class="mt-2">
          If you consent to the study, your current backup will be stored as an anonymous backup, hashing your EID so that the clean EID cannot be recovered from it. The EID is needed to ensure uniqueness. Submitted data is used strictly for this study and not correlated with
          anything else. For each EID, only the latest data point is recorded; no profile will be constructed out
          of submitted data.
        </p>
      </div>
      <div class="mt-4">
        <div class="-mx-2 -my-1.5 flex">
          <button
            type="button"
            class="animate-bg-pulse bg-green-50 px-2 py-1.5 rounded-md text-sm font-medium text-green-800 text-left hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
            @click="record(true)"
          >
            Yes, enter the study
          </button>
          <button
            type="button"
            class="ml-3 bg-green-50 px-2 py-1.5 rounded-md text-sm font-medium text-green-800 text-left hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
            @click="record(false)"
          >
            No, leave me out of it
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, PropType, ref, toRefs } from 'vue';
  import { Emitter } from 'mitt';
  import { getLegendariesStudyPreference, recordLegendariesStudyPreference } from '@/lib';
  import { REPORT_LEGENDARIES } from '@/events';
  export default defineComponent({
    props: {
      eventBus: {
        type: Object as PropType<Emitter<Record<typeof REPORT_LEGENDARIES, unknown>>>,
        required: true,
      },
    },
    setup(props) {
      const { eventBus } = toRefs(props);
      const preferenceOnFile = ref(getLegendariesStudyPreference() !== null);
      const showDetails = ref(false);
      const record = (optin: boolean) => {
        recordLegendariesStudyPreference(optin);
        preferenceOnFile.value = true;
        if (optin) {
          eventBus.value.emit(REPORT_LEGENDARIES);
        }
      };
      return {
        preferenceOnFile,
        showDetails,
        record,
      };
    },
  });
  </script>
  
  <style lang="postcss" scoped>
  .animate-bg-pulse {
    animation: bg-pulse 2s infinite;
  }
  @keyframes bg-pulse {
    0% {
      @apply bg-green-50;
    }
    50% {
      @apply bg-green-100;
    }
    100% {
      @apply bg-green-50;
    }
  }
  </style>
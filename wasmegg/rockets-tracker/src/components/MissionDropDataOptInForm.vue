<template>
    <div v-if="!preferenceOnFile" class="rounded-md bg-green-50 px-4 sm:px-6 py-4">
      <h3 class="text-sm font-medium text-green-800">Contribute to mission drop data</h3>
      <div class="mt-2 text-sm text-green-700">
        <p>
          Opt in to contribute your past ship's drops to @mennoo's drop data collection tool.<br />
          All drop rates shown in Artifact Explorer come from data submitted to this tool. Opt-in to help improve
          this data.
        </p>
        <p v-if="!showDetails" class="mt-2 underline cursor-pointer" @click="showDetails = true">
          Click here to learn more
        </p>
        <p v-else class="mt-2">
          If you consent to the study, your EID will be sent to a tool ran by @mennoo to pull down your past missions and collect
          drop data. Your EID will not be stored, only the drop data from your missions. </p>
      </div>
      <div class="mt-4">
        <div class="-mx-2 -my-1.5 flex">
          <button
            type="button"
            class="animate-bg-pulse bg-green-50 px-2 py-1.5 rounded-md text-sm font-medium text-green-800 text-left hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
            @click="record(true)"
          >
            Yes, contribute data
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
  import { getMissionDataPreference, recordMissionDataPreference } from '@/lib';
  import { REPORT_MISSIONDATA } from '@/events';
  export default defineComponent({
    props: {
      eventBus: {
        type: Object as PropType<Emitter<Record<typeof REPORT_MISSIONDATA, unknown>>>,
        required: true,
      },
      playerId: {
        type: String,
        required: true,
      }
    },
    setup(props) {
      const { eventBus, playerId } = toRefs(props);
      const preferenceOnFile = ref(getMissionDataPreference(playerId.value) !== undefined);
      const showDetails = ref(false);
      const record = (optin: boolean) => {
        recordMissionDataPreference(playerId.value, optin);
        preferenceOnFile.value = true;
        if (optin) {
          eventBus.value.emit(REPORT_MISSIONDATA);
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

<template>
  <the-nav-bar active-entry-id="rockets-tracker" />

  <h1 class="mx-4 mt-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">
    Rockets tracker
  </h1>

  <div class="max-w-5xl w-full pb-6 mx-auto">
    <the-player-id-form :player-id="playerId" @submit="submitPlayerId" />

    <!-- Use a key to recreate on data loading -->
    <base-error-boundary v-if="playerId" :key="`${playerId}:${refreshId}`">
      <mission-drop-data-opt-in-form :event-bus="eventBus" :player-id="playerId" class="mx-4 xl:mx-0 my-4" />
      <legendaries-study-opt-in-form :event-bus="eventBus" class="mx-4 xl:mx-0 my-4" />
      <suspense>
        <template #default>
          <the-report :player-id="playerId" :event-bus="eventBus" />
        </template>
        <template #fallback>
          <base-loading />
        </template>
      </suspense>
    </base-error-boundary>

    <template v-else>
      <div class="text-sm mt-4 mx-4 xl:mx-0">
        This tool presents the player's current rocket mission statuses, aggregate historical
        mission statistics, launch log, artifact collection progress, and more.
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import mitt from 'mitt';

import { sha256 } from "js-sha256";
import { getSavedPlayerID, savePlayerID } from 'lib';
import LegendariesStudyOptInForm from '@/components/LegendariesStudyOptInForm.vue';
import MissionDropDataOptInForm from '@/components/MissionDropDataOptInForm.vue';
import BaseErrorBoundary from 'ui/components/BaseErrorBoundary.vue';
import BaseLoading from 'ui/components/BaseLoading.vue';
import TheNavBar from 'ui/components/NavBar.vue';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import TheReport from '@/components/TheReport.vue';
import { getMissionDataPreference, recordMissionDataPreference } from '@/lib';
import { REPORT_MISSIONDATA } from './events';

export default defineComponent({
  components: {
    BaseErrorBoundary,
    LegendariesStudyOptInForm,
    BaseLoading,
    TheNavBar,
    ThePlayerIdForm,
    TheReport,
    MissionDropDataOptInForm
},
  setup() {
    const playerId = ref(
      new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || ''
    );
    const missionDataPref = ref(
      new URLSearchParams(window.location.search).get('contribute') || ''
    );
    const refreshId = ref(Date.now());
    const submitPlayerId = (id: string) => {
      playerId.value = id;
      refreshId.value = Date.now();
      savePlayerID(id);
      if (missionDataPref.value) {
        recordData(missionDataPref.value);
      }
    };
    const eventBus = mitt();
    const recordData = (pref: string) => {
      const optin = pref.toLocaleLowerCase() === 'true';
      // change preference if url parameter is different from localstorage
      recordMissionDataPreference(playerId.value, optin);
      if (optin) {
        eventBus.emit(REPORT_MISSIONDATA);
      }
    };
    return {
      playerId,
      refreshId,
      eventBus,
      sha256,
      submitPlayerId,
    };
  },
});
</script>

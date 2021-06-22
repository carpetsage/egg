<template>
  <div class="max-w-5xl w-full pb-6 mx-auto">
    <the-player-id-form :player-id-preload="playerIdPreload" :submit="submitPlayerId" />

    <legendaries-study-opt-in-form :event-bus="eventBus" class="mx-4 xl:mx-0 my-4" />

    <!-- Use a key to recreate on data loading -->
    <base-error-boundary v-if="playerId" :key="`${playerId}:${refreshId}`">
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

import { getLocalStorage, setLocalStorage } from 'lib';
import BaseErrorBoundary from 'ui/components/BaseErrorBoundary.vue';
import BaseLoading from 'ui/components/BaseLoading.vue';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import LegendariesStudyOptInForm from '@/components/LegendariesStudyOptInForm.vue';
import TheReport from '@/components/TheReport.vue';

const PLAYER_ID_LOCALSTORAGE_KEY = 'playerId';

export default defineComponent({
  components: {
    BaseErrorBoundary,
    BaseLoading,
    LegendariesStudyOptInForm,
    ThePlayerIdForm,
    TheReport,
  },
  setup() {
    const playerIdPreload =
      new URLSearchParams(window.location.search).get('playerId') ||
      getLocalStorage(PLAYER_ID_LOCALSTORAGE_KEY) ||
      '';
    const playerId = ref('');
    const refreshId = ref(Date.now());
    const submitPlayerId = (id: string) => {
      playerId.value = id;
      refreshId.value = Date.now();
      setLocalStorage(PLAYER_ID_LOCALSTORAGE_KEY, id);
    };
    const eventBus = mitt();
    return {
      playerIdPreload,
      playerId,
      refreshId,
      eventBus,
      submitPlayerId,
    };
  },
});
</script>

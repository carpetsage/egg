<template>
  <div class="max-w-5xl w-full px-4 pb-4 xl:px-0 mx-auto">
    <the-player-id-form :player-id-preload="playerIdPreload" :submit="submitPlayerId" />

    <!-- Use a key to recreate on data loading -->
    <base-error-boundary v-if="playerId" :key="`${playerId}:${refreshId}`">
      <suspense>
        <template #default>
          <the-assistant :player-id="playerId" />
        </template>
        <template #fallback>
          <base-loading />
        </template>
      </suspense>
    </base-error-boundary>

    <template v-else>
      <div class="text-sm mt-4 mx-4 xl:mx-0 space-y-2">
        <p>
          This tool automatically recommends optimal artifact setups for various prestiging
          strategies based on what artifacts you have. Use in conjuction with
          <a href="/artifact-sandbox/" target="_blank" class="text-blue-500 hover:text-blue-600"
            >Artifact sandbox</a
          >, where you can explore any artifact setup without acquiring the constituents.
        </p>
        <p>
          Also included is an earning bonus planner where you can check the soul eggs and prophecy
          eggs needed to progress to any earning bonus target, with support for artifact effects and
          epic research preview.
        </p>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

import {
  getLocalStorage,
  getSiteWideSavedPlayerID,
  setLocalStorage,
  setSiteWideSavedPlayerID,
} from 'lib';
import BaseErrorBoundary from 'ui/components/BaseErrorBoundary.vue';
import BaseLoading from 'ui/components/BaseLoading.vue';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import TheAssistant from '@/components/TheAssistant.vue';

const PLAYER_ID_LOCALSTORAGE_KEY = 'playerId';

export default defineComponent({
  components: {
    BaseErrorBoundary,
    BaseLoading,
    ThePlayerIdForm,
    TheAssistant,
  },
  setup() {
    const playerIdPreload =
      new URLSearchParams(window.location.search).get('playerId') ||
      getLocalStorage(PLAYER_ID_LOCALSTORAGE_KEY) ||
      getSiteWideSavedPlayerID() ||
      '';
    const playerId = ref('');
    const refreshId = ref(Date.now());
    const submitPlayerId = (id: string) => {
      playerId.value = id;
      refreshId.value = Date.now();
      setLocalStorage(PLAYER_ID_LOCALSTORAGE_KEY, id);
      setSiteWideSavedPlayerID(id);
    };
    return {
      playerIdPreload,
      playerId,
      refreshId,
      submitPlayerId,
    };
  },
});
</script>

<template>
  <div class="max-w-5xl w-full px-4 pb-4 xl:px-0 mx-auto">
    <the-player-id-form :player-id-preload="playerIdPreload" :submit="submitPlayerId" />

    <!-- Use a key to recreate on data loading -->
    <base-error-boundary v-if="playerId" :key="`${playerId}:${refreshId}`">
      <suspense>
        <template #default>
          <the-report :player-id="playerId" />
        </template>
        <template #fallback>
          <base-loading />
        </template>
      </suspense>
    </base-error-boundary>

    <template v-else>
      <div class="text-sm mt-4">
        This tool pulls the current save of the specified player, and generates a report with their
        Eggs of Prophecy (PE) progress and completion statuses of all known contracts.
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

import { getSavedPlayerID, savePlayerID } from 'lib';
import BaseErrorBoundary from 'ui/components/BaseErrorBoundary.vue';
import BaseLoading from 'ui/components/BaseLoading.vue';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import TheReport from '@/components/TheReport.vue';

export default defineComponent({
  components: {
    BaseErrorBoundary,
    BaseLoading,
    ThePlayerIdForm,
    TheReport,
  },
  setup() {
    const playerIdPreload =
      new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || '';
    const playerId = ref('');
    const refreshId = ref(Date.now());
    const submitPlayerId = (id: string) => {
      playerId.value = id;
      refreshId.value = Date.now();
      savePlayerID(id);
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

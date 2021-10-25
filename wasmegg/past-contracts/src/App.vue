<template>
  <the-nav-bar active-entry-id="past-contracts" />

  <h1 class="mx-4 mt-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">
    Past contracts viewer
  </h1>

  <the-player-id-form :player-id="playerId" @submit="submitPlayerId" />

  <div class="max-w-5xl w-full px-4 pb-4 xl:px-0 mx-auto">
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
      <div class="text-sm">
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
import TheNavBar from 'ui/components/NavBar.vue';
import TheReport from '@/components/TheReport.vue';

export default defineComponent({
  components: {
    BaseErrorBoundary,
    BaseLoading,
    TheNavBar,
    ThePlayerIdForm,
    TheReport,
  },
  setup() {
    const playerId = ref(
      new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || ''
    );
    const refreshId = ref(Date.now());
    const submitPlayerId = (id: string) => {
      playerId.value = id;
      refreshId.value = Date.now();
      savePlayerID(id);
    };
    return {
      playerId,
      refreshId,
      submitPlayerId,
    };
  },
});
</script>

<template>
  <the-nav-bar />

  <h1 class="mx-4 mt-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">
    Shell company
  </h1>

  <div class="max-w-5xl w-full pb-6 mx-auto">
    <the-player-id-form :player-id="playerId" @submit="submitPlayerId" />

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
      <div class="text-sm mt-4 mx-4 xl:mx-0">
        This tool tells you what shells are available and which ones of those you already own.
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import BaseErrorBoundary from 'ui/components/BaseErrorBoundary.vue';
import BaseLoading from 'ui/components/BaseLoading.vue';
import TheNavBar from 'ui/components/NavBar.vue';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import TheReport from '@/components/TheReport.vue';

import { getSavedPlayerID, savePlayerID } from 'lib';

const playerId = ref(
  new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || ''
);
const refreshId = ref(Date.now());
const submitPlayerId = (id: string) => {
  playerId.value = id;
  refreshId.value = Date.now();
  savePlayerID(id);
};
</script>

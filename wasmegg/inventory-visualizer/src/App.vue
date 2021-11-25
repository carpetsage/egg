<template>
  <the-nav-bar />

  <h1 class="mx-4 mt-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">
    Inventory visualizer
  </h1>

  <div v-if="!assetsLoaded" class="app-loading">Loading requisite assets...</div>

  <div v-else class="max-w-5xl w-full px-4 pb-6 xl:px-0 mx-auto">
    <the-player-id-form :player-id="playerId" @submit="submitPlayerId" />

    <base-error-boundary v-if="playerId" :key="`${playerId}:${refreshId}`">
      <suspense>
        <template #default>
          <player-data :player-id="playerId" />
        </template>
        <template #fallback>
          <base-loading />
        </template>
      </suspense>
    </base-error-boundary>

    <template v-else>
      <div class="text-sm mt-4 mx-4 xl:mx-0">
        This tool generates one single image of your artifact inventory; say goodbye to stitching
        together pages after pages of screenshots.
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getSavedPlayerID, savePlayerID } from 'lib';
import { loadAllIcons } from '@/lib';

import BaseErrorBoundary from 'ui/components/BaseErrorBoundary.vue';
import BaseLoading from 'ui/components/BaseLoading.vue';
import TheNavBar from 'ui/components/NavBar.vue';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import PlayerData from '@/components/PlayerData.vue';

const assetsLoaded = ref(false);
const assetLoadingError = ref<Error | null>(null);
onMounted(async () => {
  try {
    await loadAllIcons();
    assetsLoaded.value = true;
  } catch (err) {
    assetLoadingError.value = err instanceof Error ? err : new Error(`${err}`);
  }
});

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

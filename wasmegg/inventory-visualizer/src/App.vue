<template>
  <the-nav-bar />

  <h1 class="mx-4 mt-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">
    Inventory visualizer
  </h1>

  <div v-if="!assetsLoaded && assetLoadingError === null" class="app-loading">
    Loading requisite assets...
  </div>

  <div v-else-if="assetLoadingError !== null">
    <p class="max-w-lg mx-auto text-center text-base text-red-500 mt-4">{{ assetLoadingError }}</p>
    <p class="max-w-lg mx-auto text-center text-base">Maybe try refreshing the page.</p>
  </div>

  <div v-else class="max-w-5xl w-full px-4 pb-6 xl:px-0 mx-auto">
    <the-player-id-form :player-id="playerId" @submit="submitPlayerId" />

    <base-error-boundary v-if="playerId" :key="`${playerId}:${refreshId}`">
      <div
        class="w-max max-w-full px-3 py-2 text-center text-xs text-green-800 bg-green-50 rounded-md shadow-sm mx-auto my-4"
      >
        Get detailed mission and inventory stats at
        <a
          :href="`/rockets-tracker/?playerId=${playerId}`"
          target="_blank"
          class="text-green-700 hover:text-green-900 underline"
          >Rockets tracker</a
        >.
      </div>

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
